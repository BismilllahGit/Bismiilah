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

interface DailyLabourDesktopTableProps {
  entries: any[];
  loading: boolean;
  summary: { totalHeadcount: number; totalSpend: number };
}

export function DailyLabourDesktopTable({
  entries,
  loading,
  summary,
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center py-10 text-muted-foreground"
              >
                Loading labour entries...
              </TableCell>
            </TableRow>
          ) : entries.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center py-10 text-muted-foreground"
              >
                No labour logged on this date.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry: any) => (
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
            </TableRow>
          </tfoot>
        )}
      </Table>
    </div>
  );
}
