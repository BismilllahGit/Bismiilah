"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HardHat } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { LabourEntry } from "./page";

export default function LabourEntriesView({
  entries,
  loading,
}: {
  entries: LabourEntry[];
  loading: boolean;
}) {
  return (
    <>
      {/* Mobile & Tablet Stacked Cards (below lg breakpoint) */}
      <div className="lg:hidden space-y-3.5">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
            Loading labour wages...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-white p-4 shadow-sm">
            <EmptyState
              icon={HardHat}
              message="No daily labour entries recorded for this project yet."
            />
          </div>
        ) : (
          entries.map((l) => {
            const spend = Number(l.headcount) * Number(l.wageRate);
            return (
              <div
                key={l.id}
                className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                  <span className="font-bold text-slate-900 text-base block wrap-break-word">
                    {l.workerType?.name || l.title || "General Labour"}
                  </span>
                  <span className="text-xs font-medium text-slate-500 shrink-0">
                    {new Date(l.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-0.5">
                    Contractor / Brought By
                  </span>
                  <span className="font-medium text-slate-800 text-sm">
                    {l.contractor?.name || (
                      <span className="italic text-slate-400 font-normal">
                        Direct / Unspecified
                      </span>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50/80 rounded-lg p-2 flex flex-col justify-center border border-slate-100/80">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold">
                      Headcount & Rate
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                      {l.headcount} @ ₹
                      {Number(l.wageRate).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="bg-orange-50/70 rounded-lg p-2 flex flex-col justify-center border border-orange-100/80 text-right">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold">
                      Total Wage Outflow
                    </span>
                    <span className="font-mono font-bold text-orange-700 text-sm sm:text-base mt-0.5">
                      ₹
                      {spend.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View (lg breakpoint and above) */}
      <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table className="min-w-175">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-32.5 font-semibold">Date</TableHead>
              <TableHead className="font-semibold">
                Worker Type / Role
              </TableHead>
              <TableHead className="font-semibold">
                Brought By / Contractor
              </TableHead>
              <TableHead className="text-right font-semibold">
                Headcount x Rate
              </TableHead>
              <TableHead className="text-right font-semibold">
                Total Wage Outflow
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading labour wages...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <EmptyState
                    icon={HardHat}
                    message="No daily labour entries recorded for this project yet."
                    description="Log labour under the Daily Labour tab to view wage spend here."
                    variant="cell"
                    compact
                  />
                </TableCell>
              </TableRow>
            ) : (
              entries.map((l) => {
                const spend = Number(l.headcount) * Number(l.wageRate);
                return (
                  <TableRow key={l.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium whitespace-nowrap">
                      {new Date(l.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      {l.workerType?.name || l.title || "General Labour"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {l.contractor?.name || (
                        <span className="italic text-muted-foreground">
                          Direct / Unspecified
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {l.headcount} @ ₹
                      {Number(l.wageRate).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-orange-700 font-bold">
                      ₹
                      {spend.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
