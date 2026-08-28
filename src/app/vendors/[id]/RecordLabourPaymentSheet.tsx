"use client";

import { Plus, CheckCircle2 } from "lucide-react";
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

export function RecordLabourPaymentSheet({
  paymentOpen,
  setPaymentOpen,
  successLabourData,
  setSuccessLabourData,
  vendorName,
  handleSaveLabourPayment,
  saving,
}: {
  paymentOpen: boolean;
  setPaymentOpen: React.Dispatch<React.SetStateAction<boolean>>;
  successLabourData: any;
  setSuccessLabourData: React.Dispatch<React.SetStateAction<any>>;
  vendorName?: string;
  handleSaveLabourPayment: (e: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  return (
    <Sheet
      open={paymentOpen}
      onOpenChange={(val) => {
        setPaymentOpen(val);
        if (!val) setTimeout(() => setSuccessLabourData(null), 300);
      }}
    >
      <SheetTrigger
        render={
          <Button className="flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm" />
        }
      >
        <Plus className="h-4 w-4" /> Add Payment
      </SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto p-4">
        {successLabourData ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 mt-6">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <h3 className="text-xl font-bold text-slate-800">
              Payment Recorded!
            </h3>
            <p className="text-slate-500 text-center text-sm px-4">
              Successfully logged ₹
              {successLabourData.amount.toLocaleString()} payment to{" "}
              {successLabourData.contractorName}.
            </p>
            <div className="pt-6 w-full space-y-3">
              <ShareViaWhatsAppButton
                phone={successLabourData.contractorPhone}
                message={`Hi ${successLabourData.contractorName}, I've paid ₹${successLabourData.amount} on ${new Date(successLabourData.paymentDate).toLocaleDateString()} for labour supplied. Thank you — Bismillah Construction`}
                onShare={() => setPaymentOpen(false)}
                className="w-full font-bold h-11"
                size="lg"
                logType="LABOUR_PAYMENT"
                referenceId={successLabourData.id || "unknown"}
                referenceType="DailyLabourEntry"
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
              <SheetTitle>Log Labour Payment</SheetTitle>
              <SheetDescription>
                Record a payment out made to labour contractor {vendorName}.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSaveLabourPayment} className="space-y-4 mt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (₹) *</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Payment Date *
                  </label>
                  <input
                    name="paymentDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Payment Method *
                </label>
                <select
                  name="method"
                  defaultValue="CASH"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Note / Description
                </label>
                <input
                  name="note"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  placeholder="Weekly settlement advance..."
                />
              </div>
              <SheetFooter className="mt-6">
                <SheetClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </SheetClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Log Payment"}
                </Button>
              </SheetFooter>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
