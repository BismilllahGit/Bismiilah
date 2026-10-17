"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

export type DateSortDir = "asc" | "desc";

/**
 * Stable date sort for table rows; ties keep their original order.
 * Pass `initial` matching the order the rows already arrive in so the arrow is truthful.
 */
export function useDateSort<T>(
  rows: T[],
  getDate: (row: T) => string | number | Date | null | undefined,
  initial: DateSortDir = "desc",
) {
  const [dir, setDir] = useState<DateSortDir>(initial);
  const sorted = useMemo(() => {
    const m = dir === "asc" ? 1 : -1;
    const time = (r: T) => {
      const d = getDate(r);
      return d ? new Date(d).getTime() : 0;
    };
    return rows
      .map((r, i) => ({ r, i }))
      .sort((a, b) => m * (time(a.r) - time(b.r)) || a.i - b.i)
      .map(({ r }) => r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, dir]);
  const toggle = () => setDir((d) => (d === "asc" ? "desc" : "asc"));
  return { sorted, dir, toggle };
}

export function DateSortButton({
  dir,
  onToggle,
  label = "Date",
}: {
  dir: DateSortDir;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Sort by date ${dir === "asc" ? "newest first" : "oldest first"}`}
      className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
    >
      {label}
      {dir === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
