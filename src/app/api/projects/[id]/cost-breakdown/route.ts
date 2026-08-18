import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = (await params).id;

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true, agreedValue: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 1. Total Material Cost: Sum of BUY-type InventoryTransaction costs for this project (exclude transfers)
    const buyTransactions = await prisma.inventoryTransaction.findMany({
      where: {
        projectId: id,
        type: "BUY",
        transferGroupId: null,
      },
      select: { quantity: true, unitCost: true },
    });

    const totalMaterialCost = buyTransactions.reduce(
      (sum, t) => sum + Number(t.quantity) * Number(t.unitCost),
      0
    );

    // 2. Total Labour Cost: Sum of headcount * wageRate across all DailyLabourEntry rows for this project
    const labourEntries = await prisma.dailyLabourEntry.findMany({
      where: { projectId: id },
      select: { headcount: true, wageRate: true },
    });

    const totalLabourCost = labourEntries.reduce(
      (sum, l) => sum + Number(l.headcount) * Number(l.wageRate),
      0
    );

    // 3. Total Other Cost: Sum of SiteExpense rows for this project not otherwise categorized as material or labour
    const siteExpenses = await prisma.siteExpense.findMany({
      where: { projectId: id },
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
      .filter((e) => !excludedCategories.includes(e.category.trim().toLowerCase()))
      .reduce((sum, e) => sum + Number(e.amount), 0);

    // 4. Total Project Cost
    const totalProjectCost = totalMaterialCost + totalLabourCost + totalOtherCost;

    // 5. Calculate percentages that always sum to 100% when totalProjectCost > 0
    let materialPct = 0;
    let labourPct = 0;
    let otherPct = 0;

    if (totalProjectCost > 0) {
      materialPct = Number(((totalMaterialCost / totalProjectCost) * 100).toFixed(1));
      labourPct = Number(((totalLabourCost / totalProjectCost) * 100).toFixed(1));
      otherPct = Number((100 - materialPct - labourPct).toFixed(1));

      // Handle edge cases of negative rounding errors if other is literally 0 or close to 0
      if (otherPct < 0) {
        otherPct = 0;
        if (materialPct >= labourPct) {
          materialPct = Number((100 - labourPct).toFixed(1));
        } else {
          labourPct = Number((100 - materialPct).toFixed(1));
        }
      }
    }

    const breakdown = [
      {
        id: "labour",
        name: "Labour Wages",
        value: Number(totalLabourCost.toFixed(2)),
        percentage: labourPct,
        color: "#ea580c", // orange-600
      },
      {
        id: "material",
        name: "Materials (Purchased)",
        value: Number(totalMaterialCost.toFixed(2)),
        percentage: materialPct,
        color: "#2563eb", // blue-600
      },
      {
        id: "other",
        name: "Other (Petty Cash)",
        value: Number(totalOtherCost.toFixed(2)),
        percentage: otherPct,
        color: "#dc2626", // red-600
      },
    ];

    return NextResponse.json({
      projectId: id,
      projectName: project.name,
      agreedValue: project.agreedValue ? Number(project.agreedValue) : null,
      totalMaterialCost: Number(totalMaterialCost.toFixed(2)),
      totalLabourCost: Number(totalLabourCost.toFixed(2)),
      totalOtherCost: Number(totalOtherCost.toFixed(2)),
      totalProjectCost: Number(totalProjectCost.toFixed(2)),
      percentages: {
        material: materialPct,
        labour: labourPct,
        other: otherPct,
      },
      breakdown,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating project cost breakdown:", error);
    return NextResponse.json(
      { error: "Failed to compute project cost breakdown" },
      { status: 500 }
    );
  }
}
