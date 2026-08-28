"use client";

import { Badge } from "@/components/ui/badge";

interface DailyLabourMobileListProps {
  entries: any[];
  loading: boolean;
  summary: { totalHeadcount: number; totalSpend: number };
}

export function DailyLabourMobileList({
  entries,
  loading,
  summary,
}: DailyLabourMobileListProps) {
  return (
    <div className="lg:hidden space-y-3.5">
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
          Loading labour entries...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm font-medium">
          No labour logged on this date.
        </div>
      ) : (
        <>
          <div className="space-y-3.5">
            {entries.map((entry: any) => (
              <div
                key={entry.id}
                className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <span className="font-bold text-slate-900 text-base break-words">
                    {entry.workerType}
                  </span>
                  <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase shrink-0">
                    {entry.voucherNumber || "VOUCHER"}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="font-semibold text-sm text-slate-800 break-words">
                    {entry.title || "Daily Labour"}
                  </div>
                  {(entry.contractorName || entry.broughtBy) && (
                    <div className="text-xs font-medium text-slate-500">
                      Contractor:{" "}
                      <span className="text-slate-700 font-semibold">
                        {entry.contractorName || entry.broughtBy}
                      </span>
                    </div>
                  )}
                  {entry.paidImmediately && (
                    <div className="pt-1">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold bg-green-50 text-green-700 border border-green-200"
                      >
                        Paid on Spot
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-center">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold">
                      Headcount
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                      {entry.headcount} Workers
                    </span>
                  </div>
                  <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-center">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold">
                      Wage Rate
                    </span>
                    <span className="font-mono font-semibold text-slate-700 text-sm mt-0.5">
                      ₹
                      {Number(entry.wageRate).toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-center">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold">
                      Total Spend
                    </span>
                    <span className="font-mono font-bold text-slate-950 text-sm sm:text-base mt-0.5">
                      ₹
                      {Number(entry.totalSpend).toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pinned Day Total Card */}
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-800">
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <span className="uppercase text-xs font-bold tracking-wider text-slate-300">
                Day Total Workers
              </span>
              <span className="font-mono text-base font-bold text-blue-400">
                {summary.totalHeadcount}
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-800 sm:border-0 pt-2 sm:pt-0">
              <span className="uppercase text-xs font-bold tracking-wider text-slate-300">
                Day Total Spend
              </span>
              <span className="font-mono text-lg sm:text-xl font-bold text-emerald-400">
                ₹
                {summary.totalSpend?.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
