export function formatRs(val: number | null | undefined): string {
  if (val === null || val === undefined) return "Rs. 0.00";
  return `Rs. ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNum(val: number | null | undefined): string {
  if (val === null || val === undefined) return "0";
  return Number(val).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function formatDate(val: any): string {
  if (!val) return "-";
  try {
    return new Date(val).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(val);
  }
}
