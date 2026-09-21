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

type Project = { id: string; name: string };

export function EditVendorTransactionSheet({
  contactId,
  transactionId,
  open,
  onOpenChange,
  onSaved,
}: {
  contactId: string;
  transactionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [type, setType] = useState<"PURCHASE" | "PAYMENT">("PURCHASE");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open || !transactionId) return;
    if (projects.length === 0) {
      fetch("/api/projects").then((r) => {
        if (r.ok) r.json().then(setProjects);
      });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: kicks off the fetch-on-open pattern for this sheet
    setLoading(true);
    fetch(`/api/contacts/${contactId}/transactions/${transactionId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((txn) => {
        setType(txn.type);
        setAmount(String(txn.amount));
        setDate(new Date(txn.date).toISOString().split("T")[0]);
        setProjectId(txn.projectId || "");
        setDescription(txn.description || "");
      })
      .catch(() => alert("Failed to load transaction"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transactionId, contactId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transactionId) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/contacts/${contactId}/transactions/${transactionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            amount: Number(amount),
            date,
            description: description || undefined,
            projectId: projectId || undefined,
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
          <SheetTitle>Edit Vendor Transaction</SheetTitle>
          <SheetDescription>
            Update this purchase or payment record.
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
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="type"
                    checked={type === "PURCHASE"}
                    onChange={() => setType("PURCHASE")}
                  />
                  Purchase (Bill)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="type"
                    checked={type === "PAYMENT"}
                    onChange={() => setType("PAYMENT")}
                  />
                  Payment Out
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <label className="text-sm font-medium">Date *</label>
                <input
                  type="date"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Project (Optional)</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">-- No specific project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bill number, items..."
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
