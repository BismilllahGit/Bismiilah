import { Prisma, InvoiceStatus } from "@prisma/client";

/**
 * Derives what an invoice's status should be given its current payments.
 * Never touches VOID (voiding is a manual, explicit action) and only moves
 * PAID back to SENT — it never resurrects DRAFT.
 */
export async function computeInvoiceStatus(
  tx: Prisma.TransactionClient,
  invoiceId: string,
  amount: number,
  currentStatus: InvoiceStatus,
): Promise<InvoiceStatus> {
  if (currentStatus === "VOID") return currentStatus;

  const directPayments = await tx.clientPayment.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  const allocatedPayments = await tx.paymentAllocation.aggregate({
    where: { invoiceId },
    _sum: { allocatedAmount: true },
  });
  const totalPaid =
    Number(directPayments._sum.amount || 0) +
    Number(allocatedPayments._sum.allocatedAmount || 0);

  if (amount > 0 && totalPaid >= amount) return "PAID";
  if (currentStatus === "PAID") return "SENT";
  return currentStatus;
}
