"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import type { DailyLabourEntryRow } from "./page";

interface DailyLabourDesktopTableProps {
  entries: DailyLabourEntryRow[];
  loading: boolean;
  summary: { totalHeadcount: number; totalSpend: number };
  onEdit: (entry: DailyLabourEntryRow) => void;
  onDelete: (entry: DailyLabourEntryRow) => void;
}

export function DailyLabourDesktopTable({
  entries,
  loading,
  summary,
  onEdit,
  onDelete,
}: DailyLabourDesktopTableProps) {
  return (
    <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Worker Type</TableHead>
            <TableHead>Task / Brought By</TableHead>
            <TableHead className="text-right">Headcount</TableHead>
            <TableHead className="text-right">Wage Rate (₹)</TableHead>
            <TableHead className="text-right">Total Spend (₹)</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-10 text-muted-foreground"
              >
                Loading labour entries...
              </TableCell>
            </TableRow>
          ) : entries.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-10 text-muted-foreground"
              >
                No labour logged on this date.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry: DailyLabourEntryRow) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">
                  {entry.workerType}
                  <div className="text-[10px] text-muted-foreground uppercase">
                    {entry.voucherNumber}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm">
                    {entry.title || "-"}
                  </div>
                  {(entry.contractorName || entry.broughtBy) && (
                    <div className="text-xs text-muted-foreground">
                      Contractor: {entry.contractorName || entry.broughtBy}
                    </div>
                  )}
                  {entry.paidImmediately && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-medium mt-0.5"
                    >
                      Paid on Spot
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {entry.headcount}
                </TableCell>
                <TableCell className="text-right">
                  {Number(entry.wageRate).toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {Number(entry.totalSpend).toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(entry)}
                      aria-label={`Edit ${entry.voucherNumber}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(entry)}
                      aria-label={`Delete ${entry.voucherNumber}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {!loading && entries.length > 0 && (
          <tfoot className="bg-slate-50 font-bold border-t">
            <TableRow>
              <TableCell
                colSpan={2}
                className="text-right uppercase text-xs tracking-wider"
              >
                Day Total
              </TableCell>
              <TableCell className="text-right">
                {summary.totalHeadcount}
              </TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right">
                ₹
                {summary.totalSpend?.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </tfoot>
        )}
      </Table>
    </div>
  );
}
