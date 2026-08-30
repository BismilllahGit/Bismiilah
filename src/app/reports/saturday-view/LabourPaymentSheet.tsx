import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CheckCircle2 } from "lucide-react";
import { ShareViaWhatsAppButton } from "@/components/ui/share-via-whatsapp-button";
import type {
  DueContractor,
  LabourPaymentSuccessData,
} from "./SaturdayViewClient";
import { formatCurrency } from "./utils";

interface LabourPaymentSheetProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedContractor: DueContractor | null;
  labourPayAmount: string;
  setLabourPayAmount: (val: string) => void;
  saving: boolean;
  successData: LabourPaymentSuccessData | null;
  setSuccessData: (data: LabourPaymentSuccessData | null) => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
  today: Date;
}

export function LabourPaymentSheet({
  open,
  setOpen,
  selectedContractor,
  labourPayAmount,
  setLabourPayAmount,
  saving,
  successData,
  setSuccessData,
  onSave,
  today,
}: LabourPaymentSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) setTimeout(() => setSuccessData(null), 300);
      }}
    >
      <SheetContent className="max-w-xl overflow-y-auto p-4">
        {successData ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 mt-6">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <h3 className="text-xl font-bold text-slate-800">
              Payment Recorded!
            </h3>
            <p className="text-slate-500 text-center text-sm px-4">
              Successfully logged ₹{successData.amount.toLocaleString()}{" "}
              payment to {successData.contractorName}.
            </p>
            <div className="pt-6 w-full space-y-3">
              <ShareViaWhatsAppButton
                phone={successData.contractorPhone}
                message={`Hi ${successData.contractorName}, I've paid ₹${successData.amount} on ${new Date(successData.paymentDate ?? "").toLocaleDateString()} for labour supplied. Thank you — Bismillah Construction`}
                onShare={() => setOpen(false)}
                className="w-full font-bold h-11"
                size="lg"
                logType="LABOUR_PAYMENT"
                referenceId={successData.id || "unknown"}
                referenceType="DailyLabourEntry"
              />
              <Button
                variant="outline"
                className="w-full font-bold h-11 shadow-sm"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <SheetHeader className="p-0">
              <SheetTitle>Record Labour Payment</SheetTitle>
              <SheetDescription>
                Log an outgoing weekly settlement payment to labour contractor{" "}
                {selectedContractor?.contractorName}.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={onSave} className="space-y-4 mt-6">
              <div className="bg-slate-50 p-3 rounded-md border text-sm space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">
                    Total Payable Balance:
                  </span>
                  <span className="font-mono text-slate-900">
                    {selectedContractor
                      ? formatCurrency(selectedContractor.payableBalance)
                      : "₹0.00"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground bg-slate-100 p-1.5 rounded mt-1">
                  Settling unpaid weekly-cycle labour supplied by this
                  contractor.
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Payment Amount (₹) *
                  </label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={labourPayAmount}
                    onChange={(e) => setLabourPayAmount(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Payment Date *
                  </label>
                  <input
                    name="paymentDate"
                    type="date"
                    required
                    defaultValue={today.toISOString().split("T")[0]}
                    className="relative flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
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
                <label className="text-xs font-semibold text-slate-700">
                  Note / Description
                </label>
                <input
                  name="note"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  placeholder="Saturday weekly wage settlement..."
                />
              </div>

              <SheetFooter className="mt-6 pt-2 border-t flex items-center justify-end gap-2">
                <SheetClose
                  render={
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full bg-white"
                    />
                  }
                >
                  Cancel
                </SheetClose>
                <Button className="w-full" type="submit" disabled={saving}>
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
