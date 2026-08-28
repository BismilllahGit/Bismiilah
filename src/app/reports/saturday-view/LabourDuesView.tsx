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
import { HardHat, Phone, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { DueContractor } from "./SaturdayViewClient";
import { formatCurrency } from "./utils";

interface LabourDuesViewProps {
  labourDues: DueContractor[];
  totalLabourDues: number;
  onOpenLabourPayment: (contractor: DueContractor) => void;
}

export function LabourDuesView({
  labourDues,
  totalLabourDues,
  onOpenLabourPayment,
}: LabourDuesViewProps) {
  return (
    <section className="space-y-3 pt-6 border-t border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <HardHat className="h-5 w-5 text-muted-foreground" /> Labour
            Payments Due This Week
          </h2>
          <p className="text-xs text-muted-foreground">
            Contractors with a positive running payable balance awaiting
            weekly Saturday settlement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
            Total Out: {formatCurrency(totalLabourDues)}
          </Badge>
        </div>
      </div>

      {/* Mobile & Tablet Card View (below lg breakpoint) */}
      <div className="lg:hidden space-y-3.5">
        {labourDues.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-white p-6 shadow-sm">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-medium text-slate-700 text-sm">
              No pending labour payments due this week! All contractors
              settled.
            </p>
          </div>
        ) : (
          labourDues.map((contractor) => (
            <div
              key={contractor.contractorId}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <Link
                  href={`/vendors/${contractor.contractorId}`}
                  className="font-bold text-slate-900 hover:text-blue-600 flex items-center gap-2 text-base break-words"
                >
                  <HardHat className="h-4 w-4 text-orange-500 shrink-0" />
                  <span>{contractor.contractorName}</span>
                </Link>
              </div>

              <div className="text-xs">
                {contractor.contractorPhone ? (
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">
                      {contractor.contractorPhone}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">
                    No phone recorded
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Payable Balance
                  </span>
                  <span className="font-mono font-bold text-amber-700 text-lg">
                    {formatCurrency(contractor.payableBalance)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="font-bold border-amber-300 hover:bg-amber-50 text-amber-900 h-9 px-4 shadow-sm"
                  onClick={() => onOpenLabourPayment(contractor)}
                >
                  Record Payment
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (lg breakpoint and above) */}
      <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table className="min-w-[750px]">
          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
            <TableRow>
              <TableHead className="w-[260px] font-semibold text-slate-700">
                Labour Contractor
              </TableHead>
              <TableHead className="w-[220px] font-semibold text-slate-700">
                Contact Phone
              </TableHead>
              <TableHead className="text-right w-[180px] font-semibold text-slate-700">
                Payable Balance (₹)
              </TableHead>
              <TableHead className="text-right w-[150px] font-semibold text-slate-700">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {labourDues.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <p className="font-medium">
                      No pending labour payments due this week! All
                      contractors settled.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              labourDues.map((contractor) => (
                <TableRow
                  key={contractor.contractorId}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <TableCell className="font-bold text-slate-900">
                    <Link
                      href={`/vendors/${contractor.contractorId}`}
                      className="hover:text-blue-600 hover:underline flex items-center gap-2"
                    >
                      <HardHat className="h-4 w-4 text-orange-500 shrink-0" />{" "}
                      {contractor.contractorName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {contractor.contractorPhone ? (
                      <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />{" "}
                        <span className="font-mono">
                          {contractor.contractorPhone}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">
                        No phone recorded
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-950 text-base">
                    {formatCurrency(contractor.payableBalance)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-semibold text-xs shadow-sm hover:bg-slate-100"
                      onClick={() => onOpenLabourPayment(contractor)}
                    >
                      Record Payment
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
