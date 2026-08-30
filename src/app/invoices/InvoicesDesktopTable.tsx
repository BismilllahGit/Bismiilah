"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ReceiptIndianRupee, IndianRupee, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Invoice } from "./page";

interface InvoicesDesktopTableProps {
  invoices: Invoice[];
  loading: boolean;
  onOpenPayment: (inv: Invoice) => void;
  onOpenDetail: (inv: Invoice) => void;
}

export function InvoicesDesktopTable({
  invoices,
  loading,
  onOpenPayment,
  onOpenDetail,
}: InvoicesDesktopTableProps) {
  return (
    <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
      <Table className="min-w-[850px]">
        <TableHeader className="bg-slate-50/80 border-b border-slate-200">
          <TableRow>
            <TableHead className="w-[140px] font-semibold text-slate-700">
              Invoice #
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              Date
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              Client & Project
            </TableHead>
            <TableHead className="text-right font-semibold text-slate-700">
              Total Amount
            </TableHead>
            <TableHead className="text-right font-semibold text-slate-700">
              Paid
            </TableHead>
            <TableHead className="text-right font-semibold text-slate-700">
              Balance Due
            </TableHead>
            <TableHead className="text-right font-semibold text-slate-700">
              Status
            </TableHead>
            <TableHead className="text-right font-semibold text-slate-700">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center py-12 text-muted-foreground"
              >
                Loading invoices...
              </TableCell>
            </TableRow>
          ) : invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12">
                <EmptyState
                  icon={ReceiptIndianRupee}
                  message="No invoices generated yet."
                  variant="cell"
                />
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((inv) => {
              const totalPaid =
                inv.clientPayments.reduce(
                  (acc, p) => acc + Number(p.amount),
                  0,
                ) +
                inv.paymentAllocations.reduce(
                  (acc, p) => acc + Number(p.allocatedAmount),
                  0,
                );
              const balance = Number(inv.amount) - totalPaid;

              return (
                <TableRow
                  key={inv.id}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <TableCell className="font-mono text-sm font-bold text-slate-900">
                    {inv.invoiceNumber}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap text-slate-600">
                    {new Date(inv.issuedDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-800">
                      {inv.client.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {inv.project.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-slate-900">
                    ₹{Number(inv.amount).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-green-600 font-semibold">
                    ₹{totalPaid.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-orange-600">
                    ₹{balance.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        inv.status === "PAID"
                          ? "default"
                          : inv.status === "SENT"
                            ? "secondary"
                            : "outline"
                      }
                      className={cn(
                        "text-xs font-semibold",
                        inv.status === "PAID"
                          ? "bg-green-600 text-white"
                          : inv.status === "SENT"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : inv.status === "VOID"
                              ? "bg-red-100 text-red-800 border-red-200"
                              : "",
                      )}
                    >
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {inv.status !== "PAID" && inv.status !== "VOID" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenPayment(inv)}
                          className="text-green-700 hover:text-green-800 hover:bg-green-50/80 font-semibold"
                        >
                          <IndianRupee className="h-4 w-4 mr-1" /> Pay
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenDetail(inv)}
                        className="font-semibold shadow-sm"
                      >
                        <Eye className="h-4 w-4 mr-1.5" /> View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
