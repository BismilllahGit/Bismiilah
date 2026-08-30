"use client";

import { IndianRupee, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { ShareViaWhatsAppButton } from "@/components/ui/share-via-whatsapp-button";
import type { SuccessPaymentData } from "./page";

type UnpaidInvoice = {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  project: { name: string };
  clientPayments?: { amount: number }[];
  paymentAllocations?: { allocatedAmount: number }[];
};

export function RecordPaymentSheet({
  paymentOpen,
  setPaymentOpen,
  successPaymentData,
  setSuccessPaymentData,
  clientName,
  handleSavePayment,
  paymentMode,
  setPaymentMode,
  selectedInvoiceId,
  setSelectedInvoiceId,
  paymentAmount,
  setPaymentAmount,
  allocations,
  setAllocations,
  unpaidInvoices,
  saving,
}: {
  paymentOpen: boolean;
  setPaymentOpen: React.Dispatch<React.SetStateAction<boolean>>;
  successPaymentData: SuccessPaymentData | null;
  setSuccessPaymentData: React.Dispatch<
    React.SetStateAction<SuccessPaymentData | null>
  >;
  clientName?: string;
  handleSavePayment: (e: React.FormEvent<HTMLFormElement>) => void;
  paymentMode: "SINGLE" | "MULTI";
  setPaymentMode: React.Dispatch<React.SetStateAction<"SINGLE" | "MULTI">>;
  selectedInvoiceId: string;
  setSelectedInvoiceId: React.Dispatch<React.SetStateAction<string>>;
  paymentAmount: string;
  setPaymentAmount: React.Dispatch<React.SetStateAction<string>>;
  allocations: Record<string, string>;
  setAllocations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  unpaidInvoices: UnpaidInvoice[];
  saving: boolean;
}) {
  return (
    <Sheet
      open={paymentOpen}
      onOpenChange={(open) => {
        setPaymentOpen(open);
        if (!open) setTimeout(() => setSuccessPaymentData(null), 300);
      }}
    >
      <SheetTrigger
        render={
          <Button className="flex items-center justify-center gap-2 flex-1 sm:flex-initial" />
        }
      >
        <IndianRupee className="h-4 w-4" /> Record Payment
      </SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto p-4">
        {successPaymentData ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 mt-6">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <h3 className="text-xl font-bold text-slate-800">
              Payment Recorded!
            </h3>
            <p className="text-slate-500 text-center text-sm px-4">
              Successfully logged ₹
              {successPaymentData.amount.toLocaleString()} for{" "}
              {successPaymentData.projectName}.
            </p>
            <div className="pt-6 w-full space-y-3">
              <ShareViaWhatsAppButton
                phone={successPaymentData.clientPhone}
                message={`Hi ${successPaymentData.clientName}, I've received your payment of ₹${successPaymentData.amount} on ${new Date(successPaymentData.date ?? "").toLocaleDateString()} for ${successPaymentData.projectName}. Thank you! — Bismillah Construction`}
                onShare={() => setPaymentOpen(false)}
                className="w-full font-bold h-11"
                size="lg"
                logType="CLIENT_RECEIPT"
                referenceId={successPaymentData.id || "unknown"}
                referenceType="ClientPayment"
              />
              <Button
                variant="outline"
                className="w-full font-bold h-11 shadow-sm"
                onClick={() => setPaymentOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <SheetHeader className="p-0">
              <SheetTitle>Record Payment Received</SheetTitle>
              <SheetDescription>
                Log incoming funds from {clientName}.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSavePayment} className="space-y-4 mt-6">
              <div className="space-y-3 bg-slate-50 p-3 rounded-md border">
                <label className="text-sm font-bold block mb-2">
                  Payment Allocation Mode
                </label>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    checked={paymentMode === "SINGLE"}
                    onChange={() => {
                      setPaymentMode("SINGLE");
                      setAllocations({});
                    }}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-semibold">
                      Pay against specific invoice
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Link payment directly to one invoice.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2 text-sm cursor-pointer mt-2">
                  <input
                    type="radio"
                    name="mode"
                    checked={paymentMode === "MULTI"}
                    onChange={() => {
                      setPaymentMode("MULTI");
                      setSelectedInvoiceId("");
                    }}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-semibold">
                      Advance / Split Payment
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Record advance funds or split payment across multiple
                      invoices.
                    </div>
                  </div>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Total Amount Received (₹) *
                </label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm font-bold text-lg"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {paymentMode === "SINGLE" && (
                <div className="space-y-2 border-l-2 border-blue-500 pl-3 py-2">
                  <label className="text-sm font-medium">
                    Select Invoice *
                  </label>
                  <select
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  >
                    <option value="">-- Choose an unpaid invoice --</option>
                    {unpaidInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - ₹
                        {Number(inv.amount).toLocaleString()} (
                        {inv.project?.name || "No Project"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {paymentMode === "MULTI" && unpaidInvoices.length > 0 && (
                <div className="space-y-2 border-l-2 border-blue-500 pl-3 py-2">
                  <label className="text-sm font-medium block">
                    Allocate to Invoices (Optional)
                  </label>
                  <div className="text-xs text-muted-foreground mb-3">
                    Any unallocated amount will remain as an advance credit
                    on the ledger.
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {unpaidInvoices.map((inv) => {
                      const directPaid =
                        inv.clientPayments?.reduce(
                          (acc, p) => acc + Number(p.amount),
                          0,
                        ) || 0;
                      const allocatedPaid =
                        inv.paymentAllocations?.reduce(
                          (acc, p) => acc + Number(p.allocatedAmount),
                          0,
                        ) || 0;
                      const balance =
                        Number(inv.amount) - (directPaid + allocatedPaid);

                      return (
                        <div
                          key={inv.id}
                          className="flex items-center gap-2 text-sm bg-white p-2 border rounded-md"
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {inv.invoiceNumber}
                            </div>
                            <div className="text-xs text-orange-600">
                              Due: ₹
                              {balance.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={balance}
                            placeholder="Amount"
                            className="w-24 h-8 rounded border px-2 text-right text-xs"
                            value={allocations[inv.id] || ""}
                            onChange={(e) =>
                              setAllocations((prev) => ({
                                ...prev,
                                [inv.id]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date *</label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="relative flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Payment Method
                  </label>
                  <select
                    name="method"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Note / Ref No</label>
                <input
                  name="note"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  placeholder="Txn ID, etc..."
                />
              </div>

              <SheetFooter className="mt-6">
                <SheetClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </SheetClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Processing..." : "Confirm Payment"}
                </Button>
              </SheetFooter>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
