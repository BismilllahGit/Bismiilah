import prisma from "@/lib/prisma";

export interface GroupTotal {
  groupId: string;
  groupName: string;
  sortOrder: number;
  subtotal: number;
}

export function computeBOQRollups<
  T extends { sections?: any[]; targetBudget?: any },
>(boq: T | null) {
  if (!boq) return null;

  const groupMap = new Map<string, GroupTotal>();
  let grandTotal = 0;

  const enrichedSections = (boq.sections || []).map((section: any) => {
    let sectionSubtotal = 0;

    const enrichedLineItems = (section.lineItems || []).map((li: any) => {
      const amount = Number(li.amount || 0);
      sectionSubtotal += amount;

      return {
        ...li,
        quantity:
          li.quantity !== null && li.quantity !== undefined
            ? Number(li.quantity)
            : null,
        rate:
          li.rate !== null && li.rate !== undefined ? Number(li.rate) : null,
        amount: amount,
      };
    });

    // Track Group Rollup
    const gid = section.group?.id || section.groupId || "uncategorized";
    const gname = section.group?.name || "Uncategorized";
    const gorder =
      section.group?.sortOrder !== undefined
        ? Number(section.group.sortOrder)
        : 999;

    if (!groupMap.has(gid)) {
      groupMap.set(gid, {
        groupId: gid,
        groupName: gname,
        sortOrder: gorder,
        subtotal: 0,
      });
    }
    const groupEntry = groupMap.get(gid)!;
    groupEntry.subtotal += sectionSubtotal;

    return {
      ...section,
      lineItems: enrichedLineItems,
      subtotal: sectionSubtotal,
    };
  });

  const groupTotals: GroupTotal[] = Array.from(groupMap.values()).sort(
    (a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.groupName.localeCompare(b.groupName);
    },
  );

  grandTotal = groupTotals.reduce((acc, g) => acc + g.subtotal, 0);

  return {
    ...boq,
    targetBudget:
      boq.targetBudget !== undefined && boq.targetBudget !== null
        ? Number(boq.targetBudget)
        : null,
    sections: enrichedSections,
    groupTotals,
    grandTotal,
  };
}

export async function computeActualsForBOQ(
  rawBOQWithRollups: any,
  projectId: string,
) {
  if (!rawBOQWithRollups) return null;

  // 1. Material actual costs & quantities from InventoryTransaction (BUY type only, exclude transfers)
  const buyTransactions = await prisma.inventoryTransaction.findMany({
    where: {
      projectId,
      type: "BUY",
      transferGroupId: null,
    },
    select: {
      quantity: true,
      unitCost: true,
      itemId: true,
    },
  });

  const itemActualsMap = new Map<
    string,
    { actualQuantity: number; actualAmount: number }
  >();
  let totalMaterialCost = 0;

  for (const tx of buyTransactions) {
    const qty = Number(tx.quantity || 0);
    const cost = qty * Number(tx.unitCost || 0);
    totalMaterialCost += cost;

    if (tx.itemId) {
      if (!itemActualsMap.has(tx.itemId)) {
        itemActualsMap.set(tx.itemId, { actualQuantity: 0, actualAmount: 0 });
      }
      const entry = itemActualsMap.get(tx.itemId)!;
      entry.actualQuantity += qty;
      entry.actualAmount += cost;
    }
  }

  // 2. Labour actual costs from DailyLabourEntry
  const labourEntries = await prisma.dailyLabourEntry.findMany({
    where: { projectId },
    select: { headcount: true, wageRate: true },
  });
  const totalLabourCost = labourEntries.reduce(
    (sum, l) => sum + Number(l.headcount) * Number(l.wageRate),
    0,
  );

  // 3. Other Site Expenses (excluding labour/material categorized entries)
  const siteExpenses = await prisma.siteExpense.findMany({
    where: { projectId },
    select: { amount: true, category: true },
  });
  const excludedCategories = [
    "labour",
    "labour wage",
    "labour wages",
    "material",
    "materials",
  ];
  const totalOtherCost = siteExpenses
    .filter(
      (e) => !excludedCategories.includes(e.category.trim().toLowerCase()),
    )
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // 4. Independent Project-Level Target Budget Check
  const totalProjectCost = totalMaterialCost + totalLabourCost + totalOtherCost;
  const targetBudget =
    rawBOQWithRollups.targetBudget !== null &&
    rawBOQWithRollups.targetBudget !== undefined
      ? Number(rawBOQWithRollups.targetBudget)
      : null;
  const isTargetBudgetExceeded =
    targetBudget !== null &&
    targetBudget > 0 &&
    totalProjectCost > targetBudget;

  let totalItemsOverBudget = 0;

  // 5. Roll up actuals and overruns across Sections -> Line Items
  const enrichedSections = (rawBOQWithRollups.sections || []).map(
    (section: any) => {
      let sectionEstimatedCost = 0;
      let sectionActualCost = 0;
      let sectionEstimatedQty = 0;
      let sectionActualQty = 0;
      let sectionHasTrackedItems = false;

      const enrichedLineItems = (section.lineItems || []).map((li: any) => {
        const estimatedAmount = Number(li.amount || 0);
        const estimatedQuantity =
          li.quantity !== null && li.quantity !== undefined
            ? Number(li.quantity)
            : null;

        // Automatically track actuals for CALCULATED lines linked to a material itemId (excl. worker types / lump sum)
        const isTrackedMaterialLine =
          li.lineType !== "LUMP_SUM" && !!li.itemId && !li.workerTypeId;

        if (isTrackedMaterialLine) {
          const actuals = itemActualsMap.get(li.itemId) || {
            actualQuantity: 0,
            actualAmount: 0,
          };
          const actualQuantity = actuals.actualQuantity;
          const actualAmount = actuals.actualAmount;

          const isOverBudgetByCost = actualAmount > estimatedAmount;
          const isOverBudgetByQuantity =
            estimatedQuantity !== null && estimatedQuantity > 0
              ? actualQuantity > estimatedQuantity
              : false;
          const isOverBudget = isOverBudgetByCost || isOverBudgetByQuantity;

          if (isOverBudget) {
            totalItemsOverBudget++;
          }

          sectionEstimatedCost += estimatedAmount;
          sectionActualCost += actualAmount;
          if (estimatedQuantity !== null)
            sectionEstimatedQty += estimatedQuantity;
          sectionActualQty += actualQuantity;
          sectionHasTrackedItems = true;

          return {
            ...li,
            estimatedQuantity,
            estimatedAmount,
            actualQuantity,
            actualAmount,
            isOverBudgetByCost,
            isOverBudgetByQuantity,
            isOverBudget,
            isTrackedMaterialLine: true,
          };
        } else {
          return {
            ...li,
            estimatedQuantity,
            estimatedAmount,
            actualQuantity: null,
            actualAmount: null,
            isOverBudgetByCost: false,
            isOverBudgetByQuantity: false,
            isOverBudget: false,
            isTrackedMaterialLine: false,
          };
        }
      });

      const isOverBudgetByCost = sectionHasTrackedItems
        ? sectionActualCost > sectionEstimatedCost
        : false;
      const isOverBudgetByQuantity = sectionHasTrackedItems
        ? sectionActualQty > sectionEstimatedQty
        : false;
      const isOverBudget = isOverBudgetByCost || isOverBudgetByQuantity;

      return {
        ...section,
        lineItems: enrichedLineItems,
        estimatedCost: sectionHasTrackedItems ? sectionEstimatedCost : null,
        actualCost: sectionHasTrackedItems ? sectionActualCost : null,
        estimatedQuantity: sectionHasTrackedItems ? sectionEstimatedQty : null,
        actualQuantity: sectionHasTrackedItems ? sectionActualQty : null,
        isOverBudgetByCost,
        isOverBudgetByQuantity,
        isOverBudget,
        hasTrackedItems: sectionHasTrackedItems,
      };
    },
  );

  return {
    ...rawBOQWithRollups,
    totalMaterialCost: Number(totalMaterialCost.toFixed(2)),
    totalLabourCost: Number(totalLabourCost.toFixed(2)),
    totalOtherCost: Number(totalOtherCost.toFixed(2)),
    totalProjectCost: Number(totalProjectCost.toFixed(2)),
    isTargetBudgetExceeded,
    totalItemsOverBudget,
    sections: enrichedSections,
  };
}

export async function getEnrichedProjectBOQ(
  projectId: string,
  versionNumber?: number,
) {
  const allVersions = await prisma.bOQ.findMany({
    where: { projectId },
    select: {
      id: true,
      versionNumber: true,
      status: true,
      targetBudget: true,
      createdAt: true,
      approvedAt: true,
    },
    orderBy: { versionNumber: "desc" },
  });

  if (allVersions.length === 0) {
    return { current: null, allVersions: [] };
  }

  let targetVersionNumber = versionNumber;
  if (targetVersionNumber === undefined) {
    const activeVer = allVersions.find((v) => v.status === "ACTIVE");
    targetVersionNumber = activeVer
      ? activeVer.versionNumber
      : allVersions[0].versionNumber;
  }

  const rawBOQ = await prisma.bOQ.findFirst({
    where: { projectId, versionNumber: targetVersionNumber },
    include: {
      sections: {
        // --- FIXED: ADDED TWO-LEVEL SORT TO STOP JUMPING ---
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: {
          group: {
            select: {
              id: true,
              name: true,
              sortOrder: true,
            },
          },
          lineItems: {
            // --- FIXED: ADDED TWO-LEVEL SORT TO STOP JUMPING ---
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
              workerType: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const rollups = computeBOQRollups(rawBOQ);
  const enrichedWithActuals = await computeActualsForBOQ(rollups, projectId);

  return {
    current: enrichedWithActuals,
    allVersions: allVersions.map((v) => ({
      ...v,
      targetBudget: v.targetBudget !== null ? Number(v.targetBudget) : null,
    })),
  };
}

export async function getProjectBOQActuals(
  projectId: string,
  versionNumber?: number,
) {
  const data = await getEnrichedProjectBOQ(projectId, versionNumber);
  if (!data.current) {
    return {
      hasBOQ: false,
      totalMaterialCost: 0,
      totalLabourCost: 0,
      totalOtherCost: 0,
      totalProjectCost: 0,
      isTargetBudgetExceeded: false,
      totalItemsOverBudget: 0,
      sections: [],
    };
  }
  return {
    hasBOQ: true,
    ...data.current,
  };
}
