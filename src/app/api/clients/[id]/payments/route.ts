import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { nextVoucherNumber } from "@/lib/voucher";
import { z } from "zod";

const allocationSchema = z.object({
  invoiceId: z.string(),
  amount: z.coerce.number().min(0.01),
});

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01),
  projectId: z.string().min(1).optional(),
  date: z.string(),
  method: z.string().optional(),
  note: z.string().optional(),
  invoiceId: z.string().optional(),
  allocations: z.array(allocationSchema).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clientId = (await params).id;
    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { amount, projectId: requestedProjectId, date, method, note, invoiceId, allocations } = parsed.data;

    // Validate client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Project is required; a single-invoice payment may derive it from the invoice
    let projectId = requestedProjectId;
    if (!projectId && invoiceId) {
      const inv = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { projectId: true } });
      projectId = inv?.projectId;
    }
    if (!projectId) {
      return NextResponse.json({ error: "Project is required" }, { status: 400 });
    }

    // Project must belong to this client
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.clientId !== clientId) {
      return NextResponse.json({ error: "Project does not belong to this client" }, { status: 400 });
    }

    // Every invoice this payment touches must belong to the chosen project
    const touchedInvoiceIds = [invoiceId, ...(allocations ?? []).map((a) => a.invoiceId)].filter(
      (v): v is string => !!v,
    );
    if (touchedInvoiceIds.length > 0) {
      const mismatched = await prisma.invoice.count({
        where: { id: { in: touchedInvoiceIds }, NOT: { projectId } },
      });
      if (mismatched > 0) {
        return NextResponse.json({ error: "Invoice does not belong to the selected project" }, { status: 400 });
      }
    }

    // Validate allocations sum does not exceed total amount
    if (allocations && allocations.length > 0) {
      const sumAllocated = allocations.reduce((acc, curr) => acc + curr.amount, 0);
      if (sumAllocated > amount) {
        return NextResponse.json({ error: "Allocations cannot exceed total payment amount" }, { status: 400 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const voucherNumber = await nextVoucherNumber(tx, 'CLI', 'CLIENT_PAY');

      // Create the payment
      const payment = await tx.clientPayment.create({
        data: {
          clientId,
          projectId,
          invoiceId: invoiceId || null,
          amount,
          paymentDate: new Date(date),
          method: method || "CASH",
          note,
          voucherNumber,
        }
      });

      const invoiceIdsToCheck = new Set<string>();

      if (invoiceId) {
        invoiceIdsToCheck.add(invoiceId);
      } else if (allocations && allocations.length > 0) {
        // Create allocations
        for (const alloc of allocations) {
          await tx.paymentAllocation.create({
            data: {
              clientPaymentId: payment.id,
              invoiceId: alloc.invoiceId,
              allocatedAmount: alloc.amount,
            }
          });
          invoiceIdsToCheck.add(alloc.invoiceId);
        }
      }

      // Check if any affected invoices are now fully paid
      for (const invId of invoiceIdsToCheck) {
        const inv = await tx.invoice.findUnique({ where: { id: invId } });
        if (!inv) continue;

        // Sum direct payments
        const directPayments = await tx.clientPayment.aggregate({
          where: { invoiceId: invId },
          _sum: { amount: true }
        });

        // Sum allocations
        const allocatedPayments = await tx.paymentAllocation.aggregate({
          where: { invoiceId: invId },
          _sum: { allocatedAmount: true }
        });

        const totalPaid = Number(directPayments._sum.amount || 0) + Number(allocatedPayments._sum.allocatedAmount || 0);

        if (totalPaid >= Number(inv.amount)) {
          await tx.invoice.update({
            where: { id: invId },
            data: { status: "PAID" }
          });
        }
      }

      return payment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to log payment" }, { status: 500 });
  }
}
