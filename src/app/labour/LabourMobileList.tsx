"use client";

import { Badge } from "@/components/ui/badge";
import type { LabourRow } from "./page";

export function LabourMobileList({
  loading,
  data,
  groupBy,
  summary,
  formatCurrency,
}: {
  loading: boolean;
  data: LabourRow[];
  groupBy: string;
  summary: { totalHeadcount: number; totalSpend: number; entryCount: number };
  formatCurrency: (val: number | undefined) => string;
}) {
  return (
    <div className="lg:hidden space-y-3.5">
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
          Loading labour records...
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm font-medium">
          No labour entries found for this filter.
        </div>
      ) : (
        <>
          <div className="space-y-3.5">
            {data.map((row, i) => (
              <div
                key={row.id || i}
                className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                {groupBy === "NONE" ? (
                  <>
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 text-base block break-words">
                          {row.projectName}
                        </span>
                        <span className="text-xs font-medium text-slate-500 block">
                          {new Date(row.date ?? "").toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase shrink-0">
                        {row.voucherNumber || "VOUCHER"}
                      </span>
                    </div>
                    <div className="flex flex-row justify-between w-full">
                      <div className="space-y-1 text-xs flex flex-col">
                        <div className="font-bold text-slate-800 text-sm">
                          {row.workerType}
                        </div>
                        {row.title && (
                          <div className="text-slate-600 font-medium">
                            {row.title}
                          </div>
                        )}
                        {(row.contractorName || row.broughtBy) && (
                          <div className="text-slate-500 font-medium text-[11px]">
                            Contractor:{" "}
                            <span className="text-slate-700 font-semibold">
                              {row.contractorName || row.broughtBy}
                            </span>
                          </div>
                        )}
                      </div>
                      {row.paidImmediately && (
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
                      <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-start">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold">
                          Headcount
                        </span>
                        <span className="font-mono font-semibold text-slate-700 text-sm mt-0.5 flex flex-1 items-center justify-center">
                          {row.headcount} Workers
                        </span>
                      </div>
                      <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-start">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold">
                          Wage Rate
                        </span>
                        <span className="font-mono font-semibold text-slate-700 text-sm mt-0.5 flex flex-1 items-center justify-center">
                          {formatCurrency(row.wageRate)}
                        </span>
                      </div>
                      <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-start">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold">
                          Total
                        </span>
                        <span className="font-mono font-bold text-slate-700 text-sm mt-0.5 flex flex-1 items-center justify-center">
                          {formatCurrency(row.totalSpend)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                      <span className="font-bold text-slate-900 text-base break-words">
                        {groupBy === "date"
                          ? new Date(row.date ?? "").toLocaleDateString()
                          : groupBy === "workerType"
                            ? row.workerType
                            : row.projectName}
                      </span>
                      <span className="font-mono font-bold text-green-600 text-base shrink-0">
                        {formatCurrency(row.totalSpend)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 pt-0.5 flex justify-between items-center">
                      <span className="font-semibold text-slate-500 uppercase text-[11px]">
                        Total Headcount
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        {row.totalHeadcount} Workers
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Pinned Total Summary Card */}
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-800">
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <span className="uppercase text-xs font-bold tracking-wider text-slate-300">
                Total Workers
              </span>
              <span className="font-mono text-base font-bold text-blue-400">
                {summary.totalHeadcount}
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-800 sm:border-0 pt-2 sm:pt-0">
              <span className="uppercase text-xs font-bold tracking-wider text-slate-300">
                Total Spend
              </span>
              <span className="font-mono text-lg sm:text-xl font-bold text-emerald-400">
                {formatCurrency(summary.totalSpend)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
