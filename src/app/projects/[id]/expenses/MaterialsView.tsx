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

const STATUS_LABEL: Record<MaterialEntry["type"], string> = {
  BUY: "Bought",
  ISSUE: "Issued",
  RETURN: "Returned",
};

const STATUS_CLASS: Record<MaterialEntry["type"], string> = {
  BUY: "bg-green-50 text-green-700 border-green-200",
  ISSUE: "bg-orange-50 text-orange-700 border-orange-200",
  RETURN: "bg-blue-50 text-blue-700 border-blue-200",
};

function StatusBadge({ type }: { type: MaterialEntry["type"] }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-semibold ${STATUS_CLASS[type]}`}
    >
      {STATUS_LABEL[type]}
    </Badge>
  );
}

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
              message="No material transactions logged for this site yet."
            />
          </div>
        ) : (
          materials.map((m) => {
            const value = Number(m.quantity) * Number(m.unitCost);
            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                  <span className="font-bold text-slate-900 text-base block wrap-break-word">
                    {m.item.name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold bg-slate-50"
                    >
                      {m.item.unit}
                    </Badge>
                    <StatusBadge type={m.type} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="bg-slate-50/80 rounded-lg p-2.5 flex flex-col justify-center border border-slate-100/80">
                    <span className="text-slate-500 text-[10px] uppercase font-semibold">
                      Qty & Unit Cost
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                      {Number(m.quantity).toLocaleString()} @ ₹
                      {Number(m.unitCost).toLocaleString(undefined, {
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
        <Table className="min-w-162.5">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-55 font-semibold">Item Name</TableHead>
              <TableHead className="font-semibold">Unit</TableHead>
              <TableHead className="text-right font-semibold">
                Quantity
              </TableHead>
              <TableHead className="font-semibold">Status</TableHead>
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
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading inventory...
                </TableCell>
              </TableRow>
            ) : materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <EmptyState
                    icon={Package}
                    message="No material transactions logged for this site yet."
                    description="Log a transaction under Project Inventory to populate this view."
                    variant="cell"
                    compact
                  />
                </TableCell>
              </TableRow>
            ) : (
              materials.map((m) => {
                const value = Number(m.quantity) * Number(m.unitCost);
                return (
                  <TableRow key={m.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                      {m.item.name}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {m.item.unit}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {Number(m.quantity).toLocaleString()} {m.item.unit}
                    </TableCell>
                    <TableCell>
                      <StatusBadge type={m.type} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ₹
                      {Number(m.unitCost).toLocaleString(undefined, {
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
