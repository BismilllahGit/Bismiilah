import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface GroupTotal {
  groupId: string;
  groupName: string;
  sortOrder: number;
  subtotal: number;
}

// Structural shape `computeBOQRollups`/`computeActualsForBOQ` need from a BOQ
// line item. It's a superset covering every field either function reads or
// forwards (via `...li` spreads) — deliberately not one exact
// `Prisma.BOQLineItemGetPayload<{...}>`, because these two helpers are called
// with three DIFFERENT (but structurally compatible) query shapes: this
// file's own `getEnrichedProjectBOQ` (item/workerType narrowed via `select`),
// and the two BOQ API routes (`item: true`/`workerType: true` full includes).
type BOQLineItemForCompute = {
  id: string;
  itemNo: string | null;
  title: string;
  make: string | null;
  description: string | null;
  lineType: string;
  quantity: Prisma.Decimal | number | null;
  unit: string | null;
  rate: Prisma.Decimal | number | null;
  amount: Prisma.Decimal | number;
  executedQuantity: Prisma.Decimal | number;
  executedAmount: Prisma.Decimal | number;
  grade: string | null;
  itemId: string | null;
  workerTypeId: string | null;
  sortOrder: number;
  item?: { id: string; name: string; unit: string } | null;
  workerType?: { id: string; name: string } | null;
};

// Same rationale as above for the section level — `group` is intentionally
// all-optional since one call site (`POST /api/projects/[id]/boq`) selects
// only `{ name, isCustom, isActive }`, omitting `id`/`sortOrder`.
type BOQSectionForCompute = {
  id: string;
  boqId: string;
  name: string;
  groupId: string;
  sortOrder: number;
  group?: { id?: string; name?: string; sortOrder?: number } | null;
  lineItems?: BOQLineItemForCompute[];
};

// The shape a section/line item has *after* `computeBOQRollups` has enriched
// it (quantity/rate/amount coerced to `number`, `subtotal` added) — this is
// what `computeActualsForBOQ` (always called on `computeBOQRollups`'s output)
// actually receives.
type BOQLineItemComputed = Omit<
  BOQLineItemForCompute,
  "quantity" | "rate" | "amount"
> & {
  quantity: number | null;
  rate: number | null;
  amount: number;
};

type BOQSectionComputed = Omit<BOQSectionForCompute, "lineItems"> & {
  lineItems: BOQLineItemComputed[];
  subtotal: number;
};

// The shape a line item/section has *after* `computeActualsForBOQ` has
// additionally enriched `computeBOQRollups`'s output with actuals. Named
// explicitly (rather than left to inference) so that `sections` resolves to
// a concrete array type on `computeActualsForBOQ`'s return — TS's inference
// of `{...T, sections: enrichedSections}` for a *naked* generic `T` that
// already carries an (incompatible) `sections` key of its own does not
// reliably override that key for downstream consumers (e.g. `.map()`
// callback parameter inference in `lib/pdf/BOQPdfTable.tsx`), even though
// the runtime value is correct. This annotation changes only the declared
// type, not any runtime behavior.
type BOQLineItemWithActuals = BOQLineItemComputed & {
  estimatedQuantity: number | null;
  estimatedAmount: number;
  actualQuantity: number | null;
  actualAmount: number | null;
  isOverBudgetByCost: boolean;
  isOverBudgetByQuantity: boolean;
  isOverBudget: boolean;
  isTrackedMaterialLine: boolean;
};

type BOQSectionWithActuals = Omit<BOQSectionComputed, "lineItems"> & {
  lineItems: BOQLineItemWithActuals[];
  estimatedCost: number | null;
  actualCost: number | null;
  estimatedQuantity: number | null;
  actualQuantity: number | null;
  isOverBudgetByCost: boolean;
  isOverBudgetByQuantity: boolean;
  isOverBudget: boolean;
  hasTrackedItems: boolean;
};

export function computeBOQRollups<
  T extends {
    sections?: BOQSectionForCompute[];
    targetBudget?: Prisma.Decimal | number | null;
  },
>(boq: T | null) {
  if (!boq) return null;

  const groupMap = new Map<string, GroupTotal>();
  let grandTotal = 0;

  const enrichedSections = (boq.sections || []).map((section) => {
    let sectionSubtotal = 0;

    const enrichedLineItems = (section.lineItems || []).map((li) => {
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

export async function computeActualsForBOQ<
  T extends {
    targetBudget?: number | null;
    sections?: BOQSectionComputed[];
  },
>(
  rawBOQWithRollups: T | null,
  projectId: string,
): Promise<
  | null
  | (Omit<T, "sections"> & {
      totalMaterialCost: number;
      totalLabourCost: number;
      totalOtherCost: number;
      totalProjectCost: number;
      isTargetBudgetExceeded: boolean;
      totalItemsOverBudget: number;
      sections: BOQSectionWithActuals[];
    })
> {
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
    (section) => {
      let sectionEstimatedCost = 0;
      let sectionActualCost = 0;
      let sectionEstimatedQty = 0;
      let sectionActualQty = 0;
      let sectionHasTrackedItems = false;

      const enrichedLineItems = (section.lineItems || []).map((li) => {
        const estimatedAmount = Number(li.amount || 0);
        const estimatedQuantity =
          li.quantity !== null && li.quantity !== undefined
            ? Number(li.quantity)
            : null;

        // Automatically track actuals for CALCULATED lines linked to a material itemId (excl. worker types / lump sum)
        const isTrackedMaterialLine =
          li.lineType !== "LUMP_SUM" && !!li.itemId && !li.workerTypeId;

        if (isTrackedMaterialLine) {
          // Non-null assertion is safe here: `isTrackedMaterialLine` already
          // confirmed `!!li.itemId` above, TS just can't narrow `li.itemId`
          // through that separately-derived boolean.
          const actuals = itemActualsMap.get(li.itemId!) || {
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
