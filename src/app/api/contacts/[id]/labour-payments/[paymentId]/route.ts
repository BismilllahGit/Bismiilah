import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const paymentPatchSchema = z.object({
  amount: z.coerce.number().min(0.01),
  paymentDate: z.string(),
  method: z.string().default("CASH"),
  note: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: contactId, paymentId } = await params;
    const payment = await prisma.labourPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.contactId !== contactId) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: contactId, paymentId } = await params;
    const body = await request.json();
    const parsed = paymentPatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 },
      );
    }

    const { amount, paymentDate, method, note } = parsed.data;

    const existing = await prisma.labourPayment.findUnique({
      where: { id: paymentId },
    });
    if (!existing || existing.contactId !== contactId) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const updated = await prisma.labourPayment.update({
      where: { id: paymentId },
      data: {
        amount,
        paymentDate: new Date(paymentDate),
        method,
        note: note || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: contactId, paymentId } = await params;
    const existing = await prisma.labourPayment.findUnique({
      where: { id: paymentId },
    });
    if (!existing || existing.contactId !== contactId) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    await prisma.labourPayment.delete({ where: { id: paymentId } });

    return NextResponse.json({ id: paymentId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 },
    );
  }
}
