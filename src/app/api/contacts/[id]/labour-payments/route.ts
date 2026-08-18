import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { nextVoucherNumber } from "@/lib/voucher";
import { z } from "zod";

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01),
  paymentDate: z.string(),
  method: z.string().default("CASH"),
  note: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contactId = (await params).id;

    const payments = await prisma.labourPayment.findMany({
      where: { contactId },
      orderBy: { paymentDate: 'desc' }
    });

    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch labour payments" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contactId = (await params).id;
    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { amount, paymentDate, method, note } = parsed.data;

    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const voucherNumber = await nextVoucherNumber(tx as any, 'LPAY', 'LABOUR_PAY');

      return tx.labourPayment.create({
        data: {
          contactId,
          amount,
          paymentDate: new Date(paymentDate),
          method,
          note: note || null,
          voucherNumber,
        }
      });
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to log labour payment" }, { status: 500 });
  }
}
