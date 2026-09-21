"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

export function EditPaymentSheet({
  clientId,
  paymentId,
  open,
  onOpenChange,
  onSaved,
}: {
  clientId: string;
  paymentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open || !paymentId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: kicks off the fetch-on-open pattern for this sheet
    setLoading(true);
    fetch(`/api/clients/${clientId}/payments/${paymentId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((payment) => {
        setAmount(String(payment.amount));
        setDate(new Date(payment.paymentDate).toISOString().split("T")[0]);
        setMethod(payment.method);
        setNote(payment.note || "");
      })
      .catch(() => alert("Failed to load payment"))
      .finally(() => setLoading(false));
  }, [open, paymentId, clientId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!paymentId) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/clients/${clientId}/payments/${paymentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(amount),
            date,
            method,
            note: note || undefined,
          }),
        },
      );

      if (res.ok) {
        onOpenChange(false);
        onSaved();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update payment");
      }
    } catch {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto p-4">
        <SheetHeader className="p-0">
          <SheetTitle>Edit Payment</SheetTitle>
          <SheetDescription>
            Update the amount, date, method, or note for this payment.
          </SheetDescription>
        </SheetHeader>
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">
            Loading payment...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm font-bold md:text-lg"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="relative flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
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
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Txn ID, etc..."
              />
            </div>

            <SheetFooter className="mt-6">
              <SheetClose render={<Button variant="outline" type="button" />}>
                Cancel
              </SheetClose>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
