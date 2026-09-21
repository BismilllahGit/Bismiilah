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

export function EditLabourPaymentSheet({
  contactId,
  paymentId,
  open,
  onOpenChange,
  onSaved,
}: {
  contactId: string;
  paymentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open || !paymentId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: kicks off the fetch-on-open pattern for this sheet
    setLoading(true);
    fetch(`/api/contacts/${contactId}/labour-payments/${paymentId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((payment) => {
        setAmount(String(payment.amount));
        setPaymentDate(
          new Date(payment.paymentDate).toISOString().split("T")[0],
        );
        setMethod(payment.method);
        setNote(payment.note || "");
      })
      .catch(() => alert("Failed to load payment"))
      .finally(() => setLoading(false));
  }, [open, paymentId, contactId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!paymentId) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/contacts/${contactId}/labour-payments/${paymentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(amount),
            paymentDate,
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
          <SheetTitle>Edit Labour Payment</SheetTitle>
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
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm font-mono"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Date *</label>
                <input
                  type="date"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method *</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note / Description</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Weekly settlement advance..."
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
