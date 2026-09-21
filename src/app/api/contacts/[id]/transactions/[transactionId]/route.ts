import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const transactionPatchSchema = z.object({
  type: z.enum(["PURCHASE", "PAYMENT"]),
  amount: z.coerce.number().min(0.01),
  date: z.string(),
  description: z.string().optional(),
  projectId: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; transactionId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: contactId, transactionId } = await params;
    const txn = await prisma.vendorTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!txn || txn.contactId !== contactId) {
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

    const { id: contactId, transactionId } = await params;
    const body = await request.json();
    const parsed = transactionPatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 },
      );
    }

    const { type, amount, date, description, projectId } = parsed.data;

    const existing = await prisma.vendorTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!existing || existing.contactId !== contactId) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.vendorTransaction.update({
      where: { id: transactionId },
      data: {
        type,
        amount,
        date: new Date(date),
        description,
        projectId: projectId || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
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

    const { id: contactId, transactionId } = await params;
    const existing = await prisma.vendorTransaction.findUnique({
      where: { id: transactionId },
    });
    if (!existing || existing.contactId !== contactId) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    await prisma.vendorTransaction.delete({ where: { id: transactionId } });

    return NextResponse.json({ id: transactionId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 },
    );
  }
}
