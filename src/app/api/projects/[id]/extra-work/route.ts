import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureProjectActive } from "@/lib/project-utils";
import { nextVoucherNumber } from "@/lib/voucher";
import { z } from "zod";

const extraWorkSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  date: z.string(),
  status: z.enum(["UNBILLED", "BILLED", "COLLECTED"]).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const works = await prisma.extraWork.findMany({
      where: { projectId: (await params).id },
      orderBy: { date: 'desc' },
      include: {
        inventoryTransactions: {
          select: {
            type: true,
            quantity: true,
            unitCost: true,
            item: { select: { id: true, name: true, unit: true } },
          },
        },
      },
    });

    // Roll the linked inventory entries up to one line per item + type,
    // e.g. "Cement · Issue 10 bag".
    const items = works.map(({ inventoryTransactions, ...work }) => {
      const grouped = new Map<string, { itemId: string; itemName: string; unit: string; type: string; quantity: number; value: number }>();
      for (const t of inventoryTransactions) {
        const key = `${t.item.id}:${t.type}`;
        const row = grouped.get(key) ?? { itemId: t.item.id, itemName: t.item.name, unit: t.item.unit, type: t.type, quantity: 0, value: 0 };
        row.quantity += Number(t.quantity);
        row.value += Number(t.quantity) * Number(t.unitCost);
        grouped.set(key, row);
      }
      return {
        ...work,
        linkedInventory: [...grouped.values()].sort((a, b) => a.itemName.localeCompare(b.itemName)),
      };
    });

    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch extra work" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = extraWorkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { description, amount, date, status } = parsed.data;

    const id = (await params).id;
    await ensureProjectActive(id);

    const extra = await prisma.$transaction(async (tx) => {
      const voucherNumber = await nextVoucherNumber(tx, 'EXT', 'EXTRA_WORK');

      return tx.extraWork.create({
        data: {
          projectId: id,
          description,
          amount,
          date: new Date(date),
          status: status || "UNBILLED",
          voucherNumber,
        }
      });
    });

    return NextResponse.json(extra, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("CLOSED")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create extra work" }, { status: 500 });
  }
}
