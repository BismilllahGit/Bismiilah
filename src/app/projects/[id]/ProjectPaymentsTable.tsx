"use client";

import { DateSortButton, useDateSort } from "@/components/ui/date-sort-button";

export interface ProjectPaymentRow {
  id: string;
  voucherNumber: string;
  amount: number;
  paymentDate: string;
  method: string;
  note: string | null;
  invoiceId: string | null;
}

const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export function ProjectPaymentsTable({
  payments,
}: {
  payments: ProjectPaymentRow[];
}) {
  const { sorted, dir, toggle } = useDateSort(payments, (p) => p.paymentDate);
  return (
    <div className="overflow-x-auto pt-4 border-t">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-2 pr-4 font-medium">
              <DateSortButton dir={dir} onToggle={toggle} />
            </th>
            <th className="py-2 pr-4 font-medium">Voucher No.</th>
            <th className="py-2 pr-4 font-medium">Particulars</th>
            <th className="py-2 pr-4 font-medium">Method</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="py-2 pr-4">
                {new Date(p.paymentDate).toLocaleDateString()}
              </td>
              <td className="py-2 pr-4">{p.voucherNumber}</td>
              <td className="py-2 pr-4">
                {p.note ||
                  (p.invoiceId
                    ? "Invoice payment"
                    : "Advance payment (unallocated)")}
              </td>
              <td className="py-2 pr-4">{p.method}</td>
              <td className="py-2 text-right font-mono">
                {inr(Number(p.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
