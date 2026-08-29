import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { nextVoucherNumber } from "@/lib/voucher";
import { z } from "zod";

// TODO: restrict this endpoint to ADMIN/MANAGER roles once multi-user
// authorization is active (see User.role in schema)

const transferSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  destinationProjectId: z.string().min(1, "Destination project is required"),
  quantity: z.coerce.number()
    .min(0.01, "Quantity must be greater than 0")
    .refine((val) => {
      const s = val.toString();
      return !s.includes('.') || s.split('.')[1].length <= 2;
    }, { message: "Quantity can have at most 2 decimal places" }),
  date: z.string(),
  note: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sourceProjectId = (await params).id;
    const body = await request.json();
    const parsed = transferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { itemId, destinationProjectId, quantity, date, note } = parsed.data;

    // 3. Check if source and destination are the same
    if (sourceProjectId === destinationProjectId) {
      return NextResponse.json({ error: "Cannot transfer to the same project" }, { status: 400 });
    }

    // 4. Fetch both Project records and check for CLOSED status
    const [sourceProject, destProject] = await Promise.all([
      prisma.project.findUnique({ where: { id: sourceProjectId } }),
      prisma.project.findUnique({ where: { id: destinationProjectId } }),
    ]);

    if (!sourceProject) return NextResponse.json({ error: "Source project not found" }, { status: 404 });
    if (!destProject) return NextResponse.json({ error: "Destination project not found" }, { status: 404 });

    if (sourceProject.status === "CLOSED") {
      return NextResponse.json({ error: "Source project is CLOSED. Cannot transfer out." }, { status: 400 });
    }
    if (destProject.status === "CLOSED") {
      return NextResponse.json({ error: "Destination project is CLOSED. Cannot transfer in." }, { status: 400 });
    }

    // 5. Fetch the Item record
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // 7. Determine unitCost from MOST RECENT 'BUY' transaction
    const lastBuy = await prisma.inventoryTransaction.findFirst({
      where: { projectId: sourceProjectId, itemId: itemId, type: 'BUY' },
      orderBy: { date: 'desc' }
    });
    const unitCost = lastBuy ? Number(lastBuy.unitCost) : Number(item.unitCost);

    // 6 & 8. Transaction for balance check and creating records
    const result = await prisma.$transaction(async (tx) => {
      // 6. Check available balance
      const sourceInv = await tx.projectInventory.findUnique({
        where: { projectId_itemId: { projectId: sourceProjectId, itemId } }
      });

      const available = sourceInv 
        ? Number(sourceInv.qtyBought) + Number(sourceInv.qtyTransferredIn) - Number(sourceInv.qtyIssued) - Number(sourceInv.qtyReturned) - Number(sourceInv.qtyTransferredOut)
        : 0;

      if (quantity > available) {
        throw new Error(`INSUFFICIENT_STOCK: only ${available} available at source`);
      }

      // 8a. Generate a transferGroupId
      const transferGroupId = crypto.randomUUID();

      // 8b. Generate voucher numbers
      const voucherNumberOut = await nextVoucherNumber(tx, 'INV', 'INV_TXN');
      const voucherNumberIn = await nextVoucherNumber(tx, 'INV', 'INV_TXN');

      // 8c. Create TRANSFER_OUT for source project
      const txnOut = await tx.inventoryTransaction.create({
        data: {
          projectId: sourceProjectId,
          itemId,
          type: "TRANSFER_OUT",
          quantity,
          unitCost,
          date: new Date(date),
          note: `Transfer to ${destProject.name}. ${note || ''}`.trim(),
          voucherNumber: voucherNumberOut,
          transferGroupId,
        }
      });

      // 8d. Create TRANSFER_IN for destination project
      const txnIn = await tx.inventoryTransaction.create({
        data: {
          projectId: destinationProjectId,
          itemId,
          type: "TRANSFER_IN",
          quantity,
          unitCost,
          date: new Date(date),
          note: `Transfer from ${sourceProject.name}. ${note || ''}`.trim(),
          voucherNumber: voucherNumberIn,
          transferGroupId,
        }
      });

      // 8e. Upsert source ProjectInventory: increment qtyTransferredOut
      const invOut = await tx.projectInventory.upsert({
        where: {
          projectId_itemId: { projectId: sourceProjectId, itemId }
        },
        update: {
          qtyTransferredOut: { increment: quantity }
        },
        create: {
          projectId: sourceProjectId,
          itemId,
          qtyBought: 0,
          qtyIssued: 0,
          qtyReturned: 0,
          qtyTransferredIn: 0,
          qtyTransferredOut: quantity
        }
      });

      // 8f. Upsert destination ProjectInventory: increment qtyTransferredIn
      const invIn = await tx.projectInventory.upsert({
        where: {
          projectId_itemId: { projectId: destinationProjectId, itemId }
        },
        update: {
          qtyTransferredIn: { increment: quantity }
        },
        create: {
          projectId: destinationProjectId,
          itemId,
          qtyBought: 0,
          qtyIssued: 0,
          qtyReturned: 0,
          qtyTransferredIn: quantity,
          qtyTransferredOut: 0
        }
      });

      return { txnOut, txnIn, invOut, invIn };
    });

    // 9. Return the result
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error(error);

    // Catch specific insufficient stock error from transaction
    if (error instanceof Error && error.message && error.message.startsWith("INSUFFICIENT_STOCK:")) {
      return NextResponse.json({ error: error.message.replace("INSUFFICIENT_STOCK: ", "") }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Failed to process transfer" }, { status: 500 });
  }
}
