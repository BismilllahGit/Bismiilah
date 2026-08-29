import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().min(0.01),
  unitPrice: z.coerce.number().min(0),
});

const invoiceSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  date: z.string(),
  details: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const invoices = await prisma.invoice.findMany({
      include: {
        client: { select: { name: true } },
        project: { select: { name: true } },
        clientPayments: true,
        paymentAllocations: true,
        lineItems: true
      },
      orderBy: { issuedDate: 'desc' }
    });

    return NextResponse.json(invoices);
  } catch {
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = invoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { projectId, clientId, date, details, lineItems } = parsed.data;
    
    // Calculate total amount from line items
    const amount = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    // Generate an invoice number
    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        clientId,
        invoiceNumber,
        amount,
        issuedDate: new Date(date),
        dueDate: new Date(new Date(date).getTime() + 15 * 24 * 60 * 60 * 1000), // Due in 15 days
        notes: details,
        status: "DRAFT", // Defaulting to DRAFT instead of SENT, as requested by general invoicing flows usually
        lineItems: {
          create: lineItems.map(li => ({
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: li.quantity * li.unitPrice
          }))
        }
      }
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
