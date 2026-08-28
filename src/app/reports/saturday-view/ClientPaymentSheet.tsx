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
import type { DueClient } from "./SaturdayViewClient";
import { formatCurrency } from "./utils";

interface ClientPaymentSheetProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedClientDue: DueClient | null;
  clientPayAmount: string;
  setClientPayAmount: (val: string) => void;
  saving: boolean;
  successData: any;
  setSuccessData: (data: any) => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
  today: Date;
}

export function ClientPaymentSheet({
  open,
  setOpen,
  selectedClientDue,
  clientPayAmount,
  setClientPayAmount,
  saving,
  successData,
  setSuccessData,
  onSave,
  today,
}: ClientPaymentSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) setTimeout(() => setSuccessData(null), 300);
      }}
    >
      <SheetContent className="sm:max-w-md overflow-y-auto">
        {successData ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 mt-6">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <h3 className="text-xl font-bold text-slate-800">
              Payment Recorded!
            </h3>
            <p className="text-slate-500 text-center text-sm px-4">
              Successfully logged ₹{successData.amount.toLocaleString()} from{" "}
              {successData.clientName}.
            </p>
            <div className="pt-6 w-full space-y-3">
              <ShareViaWhatsAppButton
                phone={successData.clientPhone}
                message={`Hi ${successData.clientName}, I've received your payment of ₹${successData.amount} on ${new Date(successData.date).toLocaleDateString()} for ${successData.projectName}. Thank you! — Bismillah Construction`}
                onShare={() => setOpen(false)}
                className="w-full font-bold h-11"
                size="lg"
                logType="CLIENT_RECEIPT"
                referenceId={successData.id || "unknown"}
                referenceType="ClientPayment"
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
            <SheetHeader>
              <SheetTitle>Record Client Payment</SheetTitle>
              <SheetDescription>
                Log an incoming payment from {selectedClientDue?.clientName}{" "}
                against Invoice #{selectedClientDue?.invoiceNumber}.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={onSave} className="space-y-4 mt-6">
              <div className="bg-slate-50 p-3 rounded-md border text-sm space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Invoice Amount Due:</span>
                  <span className="font-mono text-slate-900">
                    {selectedClientDue
                      ? formatCurrency(selectedClientDue.balance)
                      : "₹0.00"}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Project:</span>
                  <span>{selectedClientDue?.projectName}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Amount Received (₹) *
                  </label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={clientPayAmount}
                    onChange={(e) => setClientPayAmount(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Payment Date *
                  </label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={today.toISOString().split("T")[0]}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  Payment Method *
                </label>
                <select
                  name="method"
                  defaultValue="BANK_TRANSFER"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  Note / Reference
                </label>
                <input
                  name="note"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  placeholder="Saturday weekly settlement..."
                />
              </div>

              <SheetFooter className="mt-6 pt-2 border-t flex items-center justify-end gap-2">
                <SheetClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </SheetClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Confirm Payment"}
                </Button>
              </SheetFooter>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
