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
import type { LabourRow } from "./page";

export function LabourDesktopTable({
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
    <div className="hidden lg:block rounded-xl border bg-white shadow-sm overflow-hidden">
      <Table className="min-w-[800px]">
        <TableHeader className="bg-slate-50">
          <TableRow>
            {groupBy === "NONE" && (
              <>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Worker Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Headcount</TableHead>
                <TableHead className="text-right">Wage Rate</TableHead>
                <TableHead className="text-right">Spend</TableHead>
              </>
            )}
            {groupBy === "date" && (
              <>
                <TableHead className="w-[140px]">Date</TableHead>
                <TableHead className="text-right">Total Headcount</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
              </>
            )}
            {groupBy === "workerType" && (
              <>
                <TableHead className="w-[180px]">Worker Type</TableHead>
                <TableHead className="text-right">Total Headcount</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
              </>
            )}
            {groupBy === "project" && (
              <>
                <TableHead className="w-[180px]">Project</TableHead>
                <TableHead className="text-right">Total Headcount</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-10 text-muted-foreground"
              >
                Loading...
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-10 text-muted-foreground"
              >
                No labour entries found for this filter.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow key={row.id || i} className="hover:bg-slate-50/50">
                {groupBy === "NONE" && (
                  <>
                    <TableCell className="whitespace-nowrap font-medium">
                      {new Date(row.date ?? "").toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.projectName}
                    </TableCell>
                    <TableCell>
                      {row.workerType}
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {row.voucherNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {row.title || "-"}
                      </div>
                      {(row.contractorName || row.broughtBy) && (
                        <div className="text-xs text-muted-foreground">
                          Contractor: {row.contractorName || row.broughtBy}
                        </div>
                      )}
                      {row.paidImmediately && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-medium mt-1"
                        >
                          Paid on Spot
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.headcount}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(row.wageRate)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(row.totalSpend)}
                    </TableCell>
                  </>
                )}

                {groupBy === "date" && (
                  <>
                    <TableCell className="font-medium whitespace-nowrap">
                      {new Date(row.date ?? "").toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.totalHeadcount}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(row.totalSpend)}
                    </TableCell>
                  </>
                )}

                {groupBy === "workerType" && (
                  <>
                    <TableCell className="font-medium">
                      {row.workerType}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.totalHeadcount}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(row.totalSpend)}
                    </TableCell>
                  </>
                )}

                {groupBy === "project" && (
                  <>
                    <TableCell className="font-medium">
                      {row.projectName}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.totalHeadcount}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(row.totalSpend)}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
        {!loading && data.length > 0 && (
          <tfoot className="bg-slate-50 font-bold border-t">
            <TableRow>
              <TableCell className="text-right uppercase text-xs tracking-wider">
                Total
              </TableCell>
              {groupBy === "NONE" && (
                <TableCell colSpan={3} className="bg-slate-50"></TableCell>
              )}
              <TableCell className="text-right font-mono">
                {summary.totalHeadcount}
              </TableCell>
              {groupBy === "NONE" && <TableCell></TableCell>}
              <TableCell className="text-right font-mono">
                {formatCurrency(summary.totalSpend)}
              </TableCell>
            </TableRow>
          </tfoot>
        )}
      </Table>
    </div>
  );
}
