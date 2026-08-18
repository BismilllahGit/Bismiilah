import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { nextVoucherNumber } from "@/lib/voucher";
import { z } from "zod";

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01),
  date: z.string(),
  method: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoiceId = (await params).id;
    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { amount, date, method, note } = parsed.data;
    
    const existingInvoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Run atomically: create payment, then check if invoice is fully paid
    const result = await prisma.$transaction(async (tx) => {
      const voucherNumber = await nextVoucherNumber(tx, 'CLI', 'CLIENT_PAY');

      const payment = await tx.clientPayment.create({
        data: {
          invoiceId,
          clientId: existingInvoice.clientId,
          amount,
          paymentDate: new Date(date),
          method: method || "CASH",
          note,
          voucherNumber,
        }
      });

      // Calculate total paid
      const allPayments = await tx.clientPayment.aggregate({
        where: { invoiceId },
        _sum: { amount: true }
      });
      
      if (allPayments._sum.amount && Number(allPayments._sum.amount) >= Number(existingInvoice.amount)) {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: "PAID" }
        });
      }

      return payment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to log payment" }, { status: 500 });
  }
}
