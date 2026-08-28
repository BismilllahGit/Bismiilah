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
import { Phone, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DueClient } from "./SaturdayViewClient";
import { formatCurrency } from "./utils";

interface ClientDuesViewProps {
  clientDues: DueClient[];
  totalClientDues: number;
  today: Date;
  onOpenClientPayment: (due: DueClient) => void;
}

export function ClientDuesView({
  clientDues,
  totalClientDues,
  today,
  onOpenClientPayment,
}: ClientDuesViewProps) {
  return (
    <section className="space-y-4 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Client Dues This Week
          </h2>
          <p className="text-sm text-slate-500">
            Invoices pending payment expected before or on Saturday.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
            Total In: {formatCurrency(totalClientDues)}
          </Badge>
        </div>
      </div>

      {/* Mobile & Tablet Card View (below lg breakpoint) */}
      <div className="lg:hidden space-y-3.5">
        {clientDues.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-white p-6 shadow-sm">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-medium text-slate-700 text-sm">
              No client dues expected by this Saturday! All caught up.
            </p>
          </div>
        ) : (
          clientDues.map((due) => {
            const isPastDue =
              new Date(due.dueDate).getTime() < today.getTime();
            return (
              <div
                key={due.id}
                className={cn(
                  "border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3",
                  isPastDue ? "bg-orange-50/40 border-orange-200" : "bg-white",
                )}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {due.invoiceNumber}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-semibold"
                    >
                      {due.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-600 block">
                      Due: {new Date(due.dueDate).toLocaleDateString()}
                    </span>
                    {isPastDue && (
                      <Badge
                        variant="destructive"
                        className="bg-orange-100 text-orange-800 border border-orange-300 text-[10px] font-bold uppercase mt-0.5"
                      >
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Link
                    href={`/clients/${due.clientId}`}
                    className="font-bold text-base text-blue-600 hover:underline block break-words"
                  >
                    {due.clientName}
                  </Link>
                  <div className="text-xs font-medium text-slate-500">
                    {due.projectName}
                  </div>
                  {due.clientPhone && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium pt-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />{" "}
                      {due.clientPhone}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Balance Due
                    </span>
                    <span className="font-mono font-bold text-slate-950 text-lg">
                      {formatCurrency(due.balance)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="font-bold bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 shadow-sm"
                    onClick={() => onOpenClientPayment(due)}
                  >
                    Record Payment
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View (lg breakpoint and above) */}
      <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table className="min-w-[850px]">
          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
            <TableRow>
              <TableHead className="w-[140px] font-semibold text-slate-700">
                Due Date
              </TableHead>
              <TableHead className="w-[140px] font-semibold text-slate-700">
                Invoice #
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Client & Project
              </TableHead>
              <TableHead className="w-[160px] font-semibold text-slate-700">
                Contact
              </TableHead>
              <TableHead className="w-[110px] font-semibold text-slate-700">
                Status
              </TableHead>
              <TableHead className="text-right w-[150px] font-semibold text-slate-700">
                Balance Due (₹)
              </TableHead>
              <TableHead className="text-right w-[140px] font-semibold text-slate-700">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientDues.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <p className="font-medium">
                      No client dues expected by this Saturday! All caught up.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              clientDues.map((due) => {
                const isPastDue =
                  new Date(due.dueDate).getTime() < today.getTime();
                return (
                  <TableRow
                    key={due.id}
                    className={
                      isPastDue
                        ? "bg-orange-50/50 hover:bg-orange-50"
                        : "hover:bg-slate-50/60 transition-colors"
                    }
                  >
                    <TableCell
                      className={cn(
                        "font-semibold text-slate-800",
                        isPastDue && "text-orange-900",
                      )}
                    >
                      <div>{new Date(due.dueDate).toLocaleDateString()}</div>
                      {isPastDue && (
                        <Badge
                          variant="destructive"
                          className="bg-orange-100 text-orange-800 border border-orange-300 text-[10px] uppercase font-bold mt-1"
                        >
                          Overdue
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-bold text-slate-900">
                      {due.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/clients/${due.clientId}`}
                        className="font-bold text-blue-600 hover:underline"
                      >
                        {due.clientName}
                      </Link>
                      <div className="text-xs text-slate-500 font-medium">
                        {due.projectName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {due.clientPhone ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-700 font-medium">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />{" "}
                          {due.clientPhone}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-semibold">
                        {due.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-950 text-base">
                      {formatCurrency(due.balance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="font-semibold text-xs shadow-sm hover:bg-slate-100"
                        onClick={() => onOpenClientPayment(due)}
                      >
                        Record Payment
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
