"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { VendorTxn } from "./page";

export default function VendorTransactionsView({
  transactions,
  loading,
}: {
  transactions: VendorTxn[];
  loading: boolean;
}) {
  return (
    <>
      {/* Mobile & Tablet Stacked Cards (below lg breakpoint) */}
      <div className="lg:hidden space-y-3.5">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
            Loading vendor transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-white p-4 shadow-sm">
            <EmptyState
              icon={Store}
              message="No direct vendor transactions assigned to this project."
            />
          </div>
        ) : (
          transactions.map((v) => (
            <div
              key={v.id}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                <span className="font-bold text-slate-900 text-base block wrap-break-word">
                  {v.contact.name}
                </span>
                <span className="text-xs font-medium text-slate-500 shrink-0">
                  {new Date(v.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-700 text-sm font-medium wrap-break-word">
                  {v.description || (
                    <span className="text-slate-400 italic font-normal">
                      No description provided
                    </span>
                  )}
                </span>
                <Badge
                  variant="outline"
                  className={
                    v.type === "PURCHASE"
                      ? "border-amber-500 font-bold text-amber-700 bg-amber-50 shrink-0"
                      : "border-emerald-500 font-bold text-emerald-700 bg-emerald-50 shrink-0"
                  }
                >
                  {v.type}
                </Badge>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Transaction Amount
                </span>
                <span className="font-mono text-amber-700 font-bold text-base">
                  ₹
                  {Number(v.amount).toLocaleString(undefined, {
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
        <Table className="min-w-162.5">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-32.5 font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Vendor Name</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="text-right font-semibold">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading vendor transactions...
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <EmptyState
                    icon={Store}
                    message="No direct vendor transactions assigned to this project."
                    description="Assign vendor purchases/payments to this project in Vendor ledgers."
                    variant="cell"
                    compact
                  />
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((v) => (
                <TableRow key={v.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium whitespace-nowrap">
                    {new Date(v.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    {v.contact.name}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge
                      variant="outline"
                      className={
                        v.type === "PURCHASE"
                          ? "border-amber-500 text-amber-700 bg-amber-50"
                          : "border-emerald-500 text-emerald-700 bg-emerald-50"
                      }
                    >
                      {v.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {v.description || (
                      <span className="text-muted-foreground italic">
                        No description
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-amber-700 font-bold">
                    ₹
                    {Number(v.amount).toLocaleString(undefined, {
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
