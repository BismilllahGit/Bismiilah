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

export function EditInventoryTransactionSheet({
  projectId,
  transactionId,
  open,
  onOpenChange,
  onSaved,
}: {
  projectId: string;
  transactionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<"BUY" | "ISSUE" | "RETURN" | "ADJUST">(
    "BUY",
  );
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open || !transactionId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: kicks off the fetch-on-open pattern for this sheet
    setLoading(true);
    fetch(`/api/projects/${projectId}/inventory/transactions/${transactionId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((txn) => {
        setType(
          txn.type === "ISSUE" || txn.type === "RETURN" || txn.type === "ADJUST"
            ? txn.type
            : "BUY",
        );
        setQuantity(String(txn.quantity));
        setUnitCost(String(txn.unitCost));
        setDate(new Date(txn.date).toISOString().split("T")[0]);
        setNote(txn.note || "");
      })
      .catch(() => alert("Failed to load transaction"))
      .finally(() => setLoading(false));
  }, [open, transactionId, projectId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transactionId) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/inventory/transactions/${transactionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            quantity: Number(quantity),
            unitCost: Number(unitCost),
            date,
            note: note || undefined,
          }),
        },
      );

      if (res.ok) {
        onOpenChange(false);
        onSaved();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update transaction");
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
          <SheetTitle>Edit Inventory Transaction</SheetTitle>
          <SheetDescription>
            Update this buy, issue or return entry.
          </SheetDescription>
        </SheetHeader>
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">
            Loading transaction...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Transaction Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="BUY">Buy (Inward to Site)</option>
                <option value="ISSUE">Issue (Used on Site)</option>
                <option value="RETURN">Return (Outward from Site)</option>
                {type === "ADJUST" && (
                  <option value="ADJUST">Adjust (Opening Balance)</option>
                )}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit Cost (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date *</label>
              <input
                type="date"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note / Reference</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Invoice or slip number..."
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
