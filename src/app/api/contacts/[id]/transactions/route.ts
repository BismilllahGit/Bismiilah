import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { nextVoucherNumber } from "@/lib/voucher";
import { z } from "zod";

const transactionSchema = z.object({
  type: z.enum(["PURCHASE", "PAYMENT"]),
  amount: z.coerce.number().min(0.01),
  date: z.string(),
  description: z.string().optional(),
  projectId: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contactId = (await params).id;

    const transactions = await prisma.vendorTransaction.findMany({
      where: { contactId },
      include: { project: { select: { name: true } } },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vendor transactions" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contactId = (await params).id;
    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { type, amount, date, description, projectId } = parsed.data;

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { type: true }
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (contact.type === "LABOUR_CONTRACTOR" && type === "PAYMENT") {
      const payment = await prisma.$transaction(async (tx) => {
        const voucherNumber = await nextVoucherNumber(tx as any, 'LPAY', 'LABOUR_PAY');
        return tx.labourPayment.create({
          data: {
            contactId,
            amount,
            paymentDate: new Date(date),
            method: "CASH",
            note: description || null,
            voucherNumber,
          }
        });
      });
      return NextResponse.json(payment, { status: 201 });
    }

    const txn = await prisma.$transaction(async (tx) => {
      const isPurchase = type === 'PURCHASE';
      const code = isPurchase ? 'VENDOR_PUR' : 'VENDOR_PAY';
      const prefix = isPurchase ? 'PUR' : 'PAY';
      const voucherNumber = await nextVoucherNumber(tx, prefix, code);

      return tx.vendorTransaction.create({
        data: {
          contactId,
          type,
          amount,
          date: new Date(date),
          description,
          projectId: projectId || null,
          voucherNumber,
        }
      });
    });

    return NextResponse.json(txn, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to log vendor transaction" }, { status: 500 });
  }
}
