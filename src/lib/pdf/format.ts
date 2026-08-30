export function formatRs(val: number | null | undefined): string {
  if (val === null || val === undefined) return "Rs. 0.00";
  return `Rs. ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNum(val: number | null | undefined): string {
  if (val === null || val === undefined) return "0";
  return Number(val).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function formatDate(val: unknown): string {
  if (!val) return "-";
  try {
    // Callers pass a mix of real `Date` objects (raw ledger/report SQL rows
    // are typed `unknown` upstream but hold actual `Date`s at runtime),
    // ISO date strings, and numbers. The cast preserves the exact
    // pre-existing `new Date(val)` runtime behavior without re-widening the
    // param back to `any`.
    return new Date(val as string | number | Date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(val);
  }
}
