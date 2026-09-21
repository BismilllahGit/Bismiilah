"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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

type LineItem = { description: string; quantity: number; unitPrice: number };

export function EditInvoiceSheet({
  invoiceId,
  open,
  onOpenChange,
  onSaved,
}: {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState("");
  const [details, setDetails] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  useEffect(() => {
    if (!open || !invoiceId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: kicks off the fetch-on-open pattern for this sheet
    setLoading(true);
    fetch(`/api/invoices/${invoiceId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((invoice) => {
        setDate(new Date(invoice.issuedDate).toISOString().split("T")[0]);
        setDetails(invoice.notes || "");
        setLineItems(
          invoice.lineItems.map(
            (li: {
              description: string;
              quantity: number;
              unitPrice: number;
            }) => ({
              description: li.description,
              quantity: Number(li.quantity),
              unitPrice: Number(li.unitPrice),
            }),
          ),
        );
      })
      .catch(() => alert("Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [open, invoiceId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!invoiceId) return;
    if (lineItems.length === 0) {
      alert("Please add at least one line item.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          details: details || undefined,
          lineItems: lineItems.map((li) => ({
            description: li.description,
            quantity: Number(li.quantity),
            unitPrice: Number(li.unitPrice),
          })),
        }),
      });

      if (res.ok) {
        onOpenChange(false);
        onSaved();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update invoice");
      }
    } catch {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto p-4">
        <SheetHeader className="p-0">
          <SheetTitle>Edit Invoice</SheetTitle>
          <SheetDescription>
            Update the issued date, notes, or line items.
          </SheetDescription>
        </SheetHeader>
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">
            Loading invoice...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Issued Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="relative flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>

            <div className="border rounded-md p-4 space-y-3 bg-slate-50">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold">Line Items</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setLineItems([
                      ...lineItems,
                      { description: "", quantity: 1, unitPrice: 0 },
                    ])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Row
                </Button>
              </div>
              {lineItems.map((item, index) => (
                <div key={index} className="flex flex-col items-start gap-2">
                  <input
                    required
                    placeholder="Description"
                    className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                    value={item.description}
                    onChange={(e) => {
                      const newItems = [...lineItems];
                      newItems[index].description = e.target.value;
                      setLineItems(newItems);
                    }}
                  />
                  <div className="flex flex-row gap-x-4">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      placeholder="Qty"
                      className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...lineItems];
                        newItems[index].quantity = Number(e.target.value);
                        setLineItems(newItems);
                      }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="Price"
                      className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const newItems = [...lineItems];
                        newItems[index].unitPrice = Number(e.target.value);
                        setLineItems(newItems);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-500"
                      onClick={() =>
                        setLineItems(lineItems.filter((_, i) => i !== index))
                      }
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="text-right font-bold pt-2 border-t mt-2">
                Total: ₹
                {lineItems
                  .reduce(
                    (acc, curr) => acc + curr.quantity * curr.unitPrice,
                    0,
                  )
                  .toLocaleString()}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Internal Notes</label>
              <textarea
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                placeholder="Milestone 1, extra work..."
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
