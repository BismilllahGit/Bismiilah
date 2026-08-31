"use client";

import { Button } from "@/components/ui/button";
import { ReceiptIndianRupee, IndianRupee, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Invoice } from "./page";

interface InvoicesMobileListProps {
  invoices: Invoice[];
  loading: boolean;
  onOpenPayment: (inv: Invoice) => void;
  onOpenDetail: (inv: Invoice) => void;
}

export function InvoicesMobileList({
  invoices,
  loading,
  onOpenPayment,
  onOpenDetail,
}: InvoicesMobileListProps) {
  return (
    <div className="lg:hidden space-y-3.5">
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
          Loading invoices...
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-white p-4 shadow-sm">
          <EmptyState
            icon={ReceiptIndianRupee}
            message="No invoices generated yet."
          />
        </div>
      ) : (
        invoices.map((inv) => {
          const totalPaid =
            inv.clientPayments.reduce((acc, p) => acc + Number(p.amount), 0) +
            inv.paymentAllocations.reduce(
              (acc, p) => acc + Number(p.allocatedAmount),
              0,
            );
          const balance = Number(inv.amount) - totalPaid;

          return (
            <div
              key={inv.id}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                    {inv.invoiceNumber}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {new Date(inv.issuedDate).toLocaleDateString()}
                  </span>
                </div>
                <Badge
                  variant={
                    inv.status === "PAID"
                      ? "default"
                      : inv.status === "SENT"
                        ? "secondary"
                        : "outline"
                  }
                  className={cn(
                    "text-xs font-bold",
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
              </div>

              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900 text-base wrap-break-word">
                  {inv.client.name}
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  {inv.project.name}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-center">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">
                    Total
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                    ₹{Number(inv.amount).toLocaleString()}
                  </span>
                </div>
                <div className="bg-green-50/70 rounded-lg p-2 text-center border border-green-100/80 flex flex-col justify-center">
                  <span className="text-green-700 text-[10px] uppercase font-semibold">
                    Paid
                  </span>
                  <span className="font-mono font-bold text-green-700 text-sm mt-0.5">
                    ₹{totalPaid.toLocaleString()}
                  </span>
                </div>
                <div className="bg-orange-50/70 rounded-lg p-2 text-center border border-orange-100/80 flex flex-col justify-center">
                  <span className="text-orange-700 text-[10px] uppercase font-semibold">
                    Due Balance
                  </span>
                  <span className="font-mono font-bold text-orange-700 text-sm sm:text-base mt-0.5">
                    ₹{balance.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                {inv.status !== "PAID" && inv.status !== "VOID" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenPayment(inv)}
                    className="flex-1 font-semibold text-green-700 hover:text-green-800 hover:bg-green-50 h-9 border border-green-200/60"
                  >
                    <IndianRupee className="h-4 w-4 mr-1" /> Record Pay
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenDetail(inv)}
                  className="flex-1 font-semibold h-9 shadow-sm"
                >
                  <Eye className="h-4 w-4 mr-1.5" /> View Details
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
