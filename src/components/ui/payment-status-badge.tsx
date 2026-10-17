export type PaymentStatus = "PAID" | "PENDING" | "OVERDUE";

export const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
];

const STATUS_STYLES: Record<PaymentStatus, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
};

export function PaymentStatusBadge({ status }: { status?: string | null }) {
  if (!status || !(status in STATUS_STYLES)) return null;
  const label = PAYMENT_STATUS_OPTIONS.find((o) => o.value === status)?.label;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[status as PaymentStatus]}`}
    >
      {label}
    </span>
  );
}
