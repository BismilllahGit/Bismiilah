import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureProjectActive } from "@/lib/project-utils";
import { TransactionType } from "@prisma/client";
import { z } from "zod";

const transactionPatchSchema = z.object({
  type: z.enum(["BUY", "ISSUE", "RETURN", "ADJUST"]),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitCost: z.coerce.number().min(0),
  date: z.string(),
  note: z.string().optional(),
});

function balanceDelta(type: TransactionType, quantity: number) {
  return {
    boughtInc: type === "BUY" || type === "ADJUST" ? quantity : 0,
    issuedInc: type === "ISSUE" ? quantity : 0,
    returnedInc: type === "RETURN" ? quantity : 0,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; transactionId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, transactionId } = await params;
    const txn = await prisma.inventoryTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!txn || txn.projectId !== projectId) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(txn);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; transactionId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, transactionId } = await params;
    await ensureProjectActive(projectId);

    const body = await request.json();
    const parsed = transactionPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 },
      );
    }
    const { type, quantity, unitCost, date, note } = parsed.data;

    const existing = await prisma.inventoryTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }
    if (existing.type === "TRANSFER_IN" || existing.type === "TRANSFER_OUT") {
      return NextResponse.json(
        { error: "Transfer entries cannot be edited here" },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const oldDelta = balanceDelta(existing.type, Number(existing.quantity));
      const newDelta = balanceDelta(type, quantity);

      await tx.projectInventory.update({
        where: {
          projectId_itemId: { projectId, itemId: existing.itemId },
        },
        data: {
          qtyBought: { increment: newDelta.boughtInc - oldDelta.boughtInc },
          qtyIssued: { increment: newDelta.issuedInc - oldDelta.issuedInc },
          qtyReturned: {
            increment: newDelta.returnedInc - oldDelta.returnedInc,
          },
        },
      });

      return tx.inventoryTransaction.update({
        where: { id: transactionId },
        data: {
          type,
          quantity,
          unitCost,
          date: new Date(date),
          note,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("CLOSED")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; transactionId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, transactionId } = await params;
    await ensureProjectActive(projectId);

    const existing = await prisma.inventoryTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }
    if (existing.type === "TRANSFER_IN" || existing.type === "TRANSFER_OUT") {
      return NextResponse.json(
        { error: "Transfer entries cannot be deleted here" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const delta = balanceDelta(existing.type, Number(existing.quantity));

      await tx.projectInventory.update({
        where: {
          projectId_itemId: { projectId, itemId: existing.itemId },
        },
        data: {
          qtyBought: { decrement: delta.boughtInc },
          qtyIssued: { decrement: delta.issuedInc },
          qtyReturned: { decrement: delta.returnedInc },
        },
      });

      await tx.inventoryTransaction.delete({ where: { id: transactionId } });
    });

    return NextResponse.json({ id: transactionId });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("CLOSED")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 },
    );
  }
}
