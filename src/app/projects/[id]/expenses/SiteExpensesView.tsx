"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt } from "lucide-react";
import type { Expense } from "./page";

export default function SiteExpensesView({
  expenses,
  loading,
}: {
  expenses: Expense[];
  loading: boolean;
}) {
  return (
    <>
      {/* Mobile & Tablet Stacked Cards (below lg breakpoint) */}
      <div className="lg:hidden space-y-3.5">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
            Loading expenses...
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-white p-4 shadow-sm">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-muted-foreground text-sm font-medium">
              No petty cash expenses recorded yet.
            </p>
          </div>
        ) : (
          expenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                <span className="font-bold text-slate-900 text-base block break-words">
                  {exp.category}
                </span>
                <span className="text-xs font-medium text-slate-500 shrink-0">
                  {new Date(exp.date).toLocaleDateString()}
                </span>
              </div>
              <div className="text-sm text-slate-700 break-words">
                {exp.description || (
                  <span className="text-slate-400 italic font-normal text-xs">
                    No description provided
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Expense Amount
                </span>
                <span className="font-mono font-bold text-red-600 text-base">
                  ₹
                  {Number(exp.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (lg breakpoint and above) */}
      <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table className="min-w-[600px]">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[130px] font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="text-right font-semibold">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading expenses...
                </TableCell>
              </TableRow>
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">
                  <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-20" />
                  <p className="text-muted-foreground font-medium">
                    No petty cash expenses recorded yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use the Log Petty Cash Expense button above to add
                    entries.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((exp) => (
                <TableRow key={exp.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium whitespace-nowrap">
                    {new Date(exp.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {exp.category}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {exp.description || (
                      <span className="text-muted-foreground italic">
                        No description
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600 font-bold">
                    ₹
                    {Number(exp.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
