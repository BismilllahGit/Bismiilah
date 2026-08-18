import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureProjectActive } from "@/lib/project-utils";
import { nextVoucherNumber } from "@/lib/voucher";
import { z } from "zod";

const expenseSchema = z.object({
  category: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  date: z.string(),
  description: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = (await params).id;

    const [siteExpenses, labourEntries, allMaterials, vendorTransactions] = await Promise.all([
      prisma.siteExpense.findMany({
        where: { projectId: id },
        orderBy: { date: 'desc' }
      }),
      prisma.dailyLabourEntry.findMany({
        where: { projectId: id },
        include: {
          workerType: { select: { name: true } },
          contractor: { select: { name: true } }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.projectInventory.findMany({
        where: { projectId: id },
        include: {
          item: { select: { name: true, unit: true, unitCost: true } }
        }
      }),
      prisma.vendorTransaction.findMany({
        where: { projectId: id },
        include: {
          contact: { select: { name: true } }
        },
        orderBy: { date: 'desc' }
      })
    ]);

    const materials = allMaterials.filter(m => Number(m.qtyIssued) > 0);

    return NextResponse.json({
      siteExpenses,
      labourEntries,
      materials,
      vendorTransactions
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { category, amount, date, description } = parsed.data;

    const id = (await params).id;
    await ensureProjectActive(id);

    const expense = await prisma.$transaction(async (tx) => {
      const voucherNumber = await nextVoucherNumber(tx, 'EXP', 'EXPENSE');

      return tx.siteExpense.create({
        data: {
          projectId: id,
          category,
          amount,
          date: new Date(date),
          description,
          voucherNumber,
        }
      });
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    console.error(error);
    if (error.message.includes("CLOSED")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
