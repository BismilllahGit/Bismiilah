import { formatDate as formatDateShared } from "@/lib/utils";

export function formatRs(val: number | null | undefined): string {
  if (val === null || val === undefined) return "Rs. 0.00";
  return `Rs. ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNum(val: number | null | undefined): string {
  if (val === null || val === undefined) return "0";
  return Number(val).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function formatDate(val: unknown): string {
  // Callers pass a mix of real `Date` objects (raw ledger/report SQL rows are
  // typed `unknown` upstream), ISO date strings, and numbers.
  return formatDateShared(val as Date | string | number | null | undefined);
}
