"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { MaterialEntry } from "./page";

export default function MaterialsView({
  materials,
  loading,
}: {
  materials: MaterialEntry[];
  loading: boolean;
}) {
  return (
    <>
      {/* Mobile & Tablet Stacked Cards (below lg breakpoint) */}
      <div className="lg:hidden space-y-3.5">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
            Loading inventory...
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-white p-4 shadow-sm">
            <EmptyState
              icon={Package}
              message="No materials issued to this site yet."
            />
          </div>
        ) : (
          materials.map((m) => {
            const value = Number(m.qtyIssued) * Number(m.item.unitCost);
            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                  <span className="font-bold text-slate-900 text-base block break-words">
                    {m.item.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold bg-slate-50 shrink-0"
                  >
                    {m.item.unit}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="bg-slate-50/80 rounded-lg p-2.5 flex flex-col justify-center border border-slate-100/80">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold">
                      Qty & Unit Cost
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                      {Number(m.qtyIssued).toLocaleString()} @ ₹
                      {Number(m.item.unitCost).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="bg-blue-50/70 rounded-lg p-2.5 flex flex-col justify-center border border-blue-100/80 text-right">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold">
                      Estimated Value
                    </span>
                    <span className="font-mono font-bold text-blue-700 text-sm sm:text-base mt-0.5">
                      ₹
                      {value.toLocaleString(undefined, {
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
        <Table className="min-w-[650px]">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[220px] font-semibold">
                Item Name
              </TableHead>
              <TableHead className="font-semibold">Unit</TableHead>
              <TableHead className="text-right font-semibold">
                Quantity Issued
              </TableHead>
              <TableHead className="text-right font-semibold">
                Unit Cost
              </TableHead>
              <TableHead className="text-right font-semibold">
                Total Estimated Value
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
                  Loading inventory...
                </TableCell>
              </TableRow>
            ) : materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <EmptyState
                    icon={Package}
                    message="No materials issued to this site yet."
                    description="Issue stock under Project Inventory to populate this view."
                    variant="cell"
                    compact
                  />
                </TableCell>
              </TableRow>
            ) : (
              materials.map((m) => {
                const value = Number(m.qtyIssued) * Number(m.item.unitCost);
                return (
                  <TableRow key={m.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                      {m.item.name}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {m.item.unit}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {Number(m.qtyIssued).toLocaleString()} {m.item.unit}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ₹
                      {Number(m.item.unitCost).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-blue-700 font-bold">
                      ₹
                      {value.toLocaleString(undefined, {
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
