import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureProjectActive } from "@/lib/project-utils";
import { nextVoucherNumber } from "@/lib/voucher";
import { z } from "zod";

const buyDetailsSchema = z.object({
  vendorId: z.string().min(1).optional(),
  paymentStatus: z.enum(["PAID", "PENDING", "OVERDUE"]).optional(),
});

// Summary of the vendor / payment status across this item's Buys in the
// project. A field is "MIXED" when the buys disagree, null when none is set.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, itemId } = await params;
    const buys = await prisma.inventoryTransaction.findMany({
      where: { projectId, itemId, type: "BUY" },
      select: { vendorId: true, vendorTransaction: { select: { paymentStatus: true } } },
    });

    const summarize = (values: (string | null | undefined)[]) => {
      const set = new Set(values.map((v) => v ?? null));
      return set.size === 1 ? [...set][0] : set.size === 0 ? null : "MIXED";
    };

    return NextResponse.json({
      buyCount: buys.length,
      vendorId: summarize(buys.map((b) => b.vendorId)),
      paymentStatus: summarize(buys.map((b) => b.vendorTransaction?.paymentStatus)),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch buy details" }, { status: 500 });
  }
}

// Applies a vendor and/or payment status to every Buy of this item in the
// project, keeping the vendor ledger entries in step.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, itemId } = await params;
    await ensureProjectActive(projectId);

    const parsed = buyDetailsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }
    const { vendorId, paymentStatus } = parsed.data;

    if (vendorId) {
      const vendor = await prisma.contact.findUnique({ where: { id: vendorId }, select: { id: true } });
      if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id: itemId }, select: { name: true } });
      const buys = await tx.inventoryTransaction.findMany({
        where: { projectId, itemId, type: "BUY" },
      });

      for (const buy of buys) {
        const amount = Number(buy.quantity) * Number(buy.unitCost);
        const effectiveVendorId = vendorId ?? buy.vendorId;

        if (buy.vendorTransactionId) {
          await tx.vendorTransaction.update({
            where: { id: buy.vendorTransactionId },
            data: {
              ...(vendorId && { contactId: vendorId }),
              ...(paymentStatus && { paymentStatus }),
            },
          });
        } else if (effectiveVendorId) {
          const vtx = await tx.vendorTransaction.create({
            data: {
              contactId: effectiveVendorId,
              projectId,
              type: "PURCHASE",
              paymentStatus: paymentStatus ?? "PENDING",
              amount,
              date: buy.date,
              description: `Inventory buy ${buy.voucherNumber}${item ? ` - ${item.name}` : ""}`,
              voucherNumber: await nextVoucherNumber(tx, "PUR", "VENDOR_PUR"),
            },
          });
          await tx.inventoryTransaction.update({
            where: { id: buy.id },
            data: { vendorId: effectiveVendorId, vendorTransactionId: vtx.id },
          });
          continue;
        }

        if (vendorId && vendorId !== buy.vendorId) {
          await tx.inventoryTransaction.update({ where: { id: buy.id }, data: { vendorId } });
        }
      }
    });

    return NextResponse.json({ id: itemId });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("CLOSED")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update buy details" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, itemId } = await params;
    await ensureProjectActive(projectId);

    const existing = await prisma.projectInventory.findUnique({
      where: { projectId_itemId: { projectId, itemId } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Inventory record not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const linked = await tx.inventoryTransaction.findMany({
        where: { projectId, itemId, vendorTransactionId: { not: null } },
        select: { vendorTransactionId: true },
      });
      await tx.inventoryTransaction.deleteMany({ where: { projectId, itemId } });
      // Vendor ledger entries auto-created by these buys go with them.
      await tx.vendorTransaction.deleteMany({
        where: { id: { in: linked.map((l) => l.vendorTransactionId!) } },
      });
      await tx.projectInventory.delete({ where: { id: existing.id } });
    });

    return NextResponse.json({ id: itemId });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("CLOSED")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to remove item from inventory" },
      { status: 500 },
    );
  }
}
