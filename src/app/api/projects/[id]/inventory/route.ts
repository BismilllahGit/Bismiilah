import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureProjectActive } from "@/lib/project-utils";
import { nextVoucherNumber } from "@/lib/voucher";
import { z } from "zod";

const transactionSchema = z.object({
  itemName: z.string().min(1, "Item Name is required"),
  type: z.enum(["BUY", "ISSUE", "RETURN", "ADJUST"]),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitCost: z.coerce.number().min(0),
  date: z.string(),
  note: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projectId = (await params).id;

    // Fetch the inventory with the related Item details
    const inventory = await prisma.projectInventory.findMany({
      where: { projectId },
      include: {
        item: true
      },
      orderBy: { item: { name: 'asc' } }
    });

    return NextResponse.json(inventory);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projectId = (await params).id;
    await ensureProjectActive(projectId);

    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { itemName, type, quantity, unitCost, date, note } = parsed.data;

    // First find or create the item
    let item = await prisma.item.findFirst({
      where: { name: { equals: itemName, mode: 'insensitive' } }
    });

    if (!item) {
      item = await prisma.item.create({
        data: {
          name: itemName,
          type: "MATERIAL", // Add required type field
          unit: "Nos", // default unit
          unitCost: unitCost,
        }
      });
    }

    const itemId = item.id;

    // Run atomically: Create transaction log + update aggregate balances
    const result = await prisma.$transaction(async (tx) => {
      const voucherNumber = await nextVoucherNumber(tx, 'INV', 'INV_TXN');

      // 1. Create transaction
      const txn = await tx.inventoryTransaction.create({
        data: {
          projectId,
          itemId,
          type,
          quantity,
          unitCost,
          date: new Date(date),
          note,
          voucherNumber,
        }
      });

      // 2. Upsert the ProjectInventory record
      let boughtInc = 0;
      let issuedInc = 0;
      let returnedInc = 0;

      if (type === "BUY") boughtInc = quantity;
      if (type === "ISSUE") issuedInc = quantity;
      if (type === "RETURN") returnedInc = quantity;
      if (type === "ADJUST") boughtInc = quantity; // Using ADJUST to inject starting balance

      const inventory = await tx.projectInventory.upsert({
        where: {
          projectId_itemId: {
            projectId,
            itemId
          }
        },
        update: {
          qtyBought: { increment: boughtInc },
          qtyIssued: { increment: issuedInc },
          qtyReturned: { increment: returnedInc }
        },
        create: {
          projectId,
          itemId,
          qtyBought: boughtInc,
          qtyIssued: issuedInc,
          qtyReturned: returnedInc
        }
      });

      return { txn, inventory };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error(error);
    if (error.message.includes("CLOSED")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process inventory transaction" }, { status: 500 });
  }
}
