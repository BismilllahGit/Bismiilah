import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { computeInvoiceStatus } from "@/lib/invoice-status";

const paymentPatchSchema = z.object({
  amount: z.coerce.number().min(0.01),
  date: z.string(),
  method: z.string().optional(),
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

    const { id: clientId, paymentId } = await params;
    const payment = await prisma.clientPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.clientId !== clientId) {
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

    const { id: clientId, paymentId } = await params;
    const body = await request.json();
    const parsed = paymentPatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 },
      );
    }

    const { amount, date, method, note } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.clientPayment.findUnique({
        where: { id: paymentId },
      });
      if (!existing || existing.clientId !== clientId) {
        throw new Error("Payment not found");
      }

      const payment = await tx.clientPayment.update({
        where: { id: paymentId },
        data: {
          amount,
          paymentDate: new Date(date),
          method: method || "CASH",
          note,
        },
      });

      if (existing.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: existing.invoiceId },
        });
        if (invoice) {
          const nextStatus = await computeInvoiceStatus(
            tx,
            invoice.id,
            Number(invoice.amount),
            invoice.status,
          );
          if (nextStatus !== invoice.status) {
            await tx.invoice.update({
              where: { id: invoice.id },
              data: { status: nextStatus },
            });
          }
        }
      }

      return payment;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to update payment";
    const status = message === "Payment not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
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

    const { id: clientId, paymentId } = await params;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.clientPayment.findUnique({
        where: { id: paymentId },
        include: { allocations: true },
      });
      if (!existing || existing.clientId !== clientId) {
        throw new Error("Payment not found");
      }

      const affectedInvoiceIds = new Set<string>();
      if (existing.invoiceId) affectedInvoiceIds.add(existing.invoiceId);
      for (const alloc of existing.allocations)
        affectedInvoiceIds.add(alloc.invoiceId);

      await tx.paymentAllocation.deleteMany({
        where: { clientPaymentId: paymentId },
      });
      await tx.clientPayment.delete({ where: { id: paymentId } });

      for (const invoiceId of affectedInvoiceIds) {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
        });
        if (!invoice) continue;
        const nextStatus = await computeInvoiceStatus(
          tx,
          invoiceId,
          Number(invoice.amount),
          invoice.status,
        );
        if (nextStatus !== invoice.status) {
          await tx.invoice.update({
            where: { id: invoiceId },
            data: { status: nextStatus },
          });
        }
      }
    });

    return NextResponse.json({ id: paymentId });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to delete payment";
    const status = message === "Payment not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
