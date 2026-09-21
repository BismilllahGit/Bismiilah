import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { computeInvoiceStatus } from "@/lib/invoice-status";

const statusPatchSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "VOID"]),
  voidReason: z.string().optional(),
});

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().min(0.01),
  unitPrice: z.coerce.number().min(0),
});

const detailsPatchSchema = z.object({
  date: z.string(),
  details: z.string().optional(),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "At least one line item is required"),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = (await params).id;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = (await params).id;
    const body = await request.json();

    if ("status" in body) {
      const parsed = statusPatchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.format() },
          { status: 400 },
        );
      }

      const { status, voidReason } = parsed.data;

      if (status === "VOID" && !voidReason) {
        return NextResponse.json(
          { error: "Void reason is required when voiding an invoice" },
          { status: 400 },
        );
      }

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          status,
          voidReason: status === "VOID" ? voidReason : null,
        },
      });

      return NextResponse.json(updated);
    }

    const parsed = detailsPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 },
      );
    }

    const { date, details, lineItems } = parsed.data;
    const amount = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("Invoice not found");
      }
      if (existing.status === "VOID") {
        throw new Error("Cannot edit a voided invoice");
      }

      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });

      const nextStatus = await computeInvoiceStatus(
        tx,
        id,
        amount,
        existing.status,
      );

      return tx.invoice.update({
        where: { id },
        data: {
          amount,
          issuedDate: new Date(date),
          notes: details,
          status: nextStatus,
          lineItems: {
            create: lineItems.map((li) => ({
              description: li.description,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              total: li.quantity * li.unitPrice,
            })),
          },
        },
        include: { lineItems: true },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to update invoice";
    const status =
      message === "Invoice not found"
        ? 404
        : message === "Cannot edit a voided invoice"
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
