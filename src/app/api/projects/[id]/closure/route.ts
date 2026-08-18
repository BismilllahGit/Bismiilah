import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const report = await prisma.closureReport.findUnique({
      where: { projectId: (await params).id }
    });

    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch closure report" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projectId = (await params).id;

    const existingClosure = await prisma.closureReport.findUnique({
      where: { projectId }
    });

    if (existingClosure) {
      return NextResponse.json({ error: "Project already closed" }, { status: 400 });
    }

    // 1. Fetch Invoices and calculate total billed & collected
    const invoices = await prisma.invoice.findMany({
      where: { projectId, status: { not: "VOID" } },
      include: { clientPayments: true, paymentAllocations: true }
    });
    
    const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const totalCollected = invoices.reduce((sum, inv) => 
      sum + inv.clientPayments.reduce((pSum, p) => pSum + Number(p.amount), 0) + inv.paymentAllocations.reduce((pSum, p) => pSum + Number(p.allocatedAmount), 0)
    , 0);

    // 2. Fetch Extra Work
    const extraWork = await prisma.extraWork.findMany({ where: { projectId } });
    const totalExtraWork = extraWork.reduce((sum, ew) => sum + Number(ew.amount), 0);
    const unbilledExtraWork = extraWork.filter(ew => ew.status === "UNBILLED").reduce((sum, ew) => sum + Number(ew.amount), 0);

    // 3. Fetch Site Expenses
    const siteExpenses = await prisma.siteExpense.aggregate({
      where: { projectId },
      _sum: { amount: true }
    });
    const totalSiteExpenses = Number(siteExpenses._sum.amount || 0);

    // 4. Fetch Inventory Used (qtyIssued * unitCost approx, or just total items)
    const inventory = await prisma.projectInventory.findMany({
      where: { projectId },
      include: { item: true }
    });
    const totalMaterialCost = inventory.reduce((sum, inv) => sum + (Number(inv.qtyIssued) * Number(inv.item.unitCost)), 0);

    // 5. Build summary JSON
    const summaryJson = {
      totalBilled,
      totalCollected,
      outstandingReceivables: totalBilled - totalCollected,
      totalExtraWork,
      unbilledExtraWork,
      totalSiteExpenses,
      estimatedMaterialCost: totalMaterialCost,
      closureDate: new Date().toISOString()
    };

    // 6. Run transaction to save report and close project
    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.closureReport.create({
        data: {
          projectId,
          pdfUrl: "", // Generate PDF later or via third-party service
          summaryJson
        }
      });

      await tx.project.update({
        where: { id: projectId },
        data: { status: "CLOSED" }
      });

      return report;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to generate closure report" }, { status: 500 });
  }
}
