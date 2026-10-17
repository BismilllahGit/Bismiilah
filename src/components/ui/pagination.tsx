"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

const PAGE_SIZE = 10;

export function usePagination<T>(
  items: T[],
  pageSize = PAGE_SIZE,
  resetKey: unknown = ""
) {
  // The page is remembered together with the filter key it was chosen under,
  // so changing filters falls back to the first page.
  const [state, setState] = useState({ page: 1, key: resetKey });
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const requested = Object.is(state.key, resetKey) ? state.page : 1;
  // Keep the page in range if the list shrinks (e.g. after a refetch).
  const current = Math.min(requested, totalPages);
  const pageItems = items.slice((current - 1) * pageSize, current * pageSize);
  const setPage = (page: number) => setState({ page, key: resetKey });

  return { page: current, totalPages, total: items.length, pageItems, setPage };
}

export function PaginationControls({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-3 py-3 bg-slate-50 border rounded-md text-sm">
      <div className="text-slate-600 text-xs max-sm:text-sm">
        Page <span className="font-semibold">{page}</span> of{" "}
        <span className="font-semibold">{totalPages}</span> ({total} total)
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 max-sm:h-10 max-sm:px-4 text-xs max-sm:text-sm"
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 max-sm:h-10 max-sm:px-4 text-xs max-sm:text-sm"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative w-full sm:max-w-xs ${className}`}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}

/** Case-insensitive match of `query` against any of the given values. */
export function matchesSearch(
  query: string,
  ...values: Array<string | number | null | undefined>
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some((v) => v != null && String(v).toLowerCase().includes(q));
}

export function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
  className?: string;
}) {
  return (
    <NativeSelect
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8"
      wrapperClassName={`sm:w-auto ${className}`}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
      {children}
    </div>
  );
}
