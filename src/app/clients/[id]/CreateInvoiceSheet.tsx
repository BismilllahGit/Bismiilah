"use client";

import { Plus, Trash2 } from "lucide-react";
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

type Project = { id: string; name: string };

type LineItem = { description: string; quantity: number; unitPrice: number };

export function CreateInvoiceSheet({
  invoiceOpen,
  setInvoiceOpen,
  clientName,
  projects,
  setProjects,
  lineItems,
  setLineItems,
  saving,
  handleSaveInvoice,
}: {
  invoiceOpen: boolean;
  setInvoiceOpen: React.Dispatch<React.SetStateAction<boolean>>;
  clientName?: string;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  lineItems: LineItem[];
  setLineItems: React.Dispatch<React.SetStateAction<LineItem[]>>;
  saving: boolean;
  handleSaveInvoice: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Sheet
      open={invoiceOpen}
      onOpenChange={(open) => {
        setInvoiceOpen(open);
        if (open && projects.length === 0) {
          fetch("/api/projects").then((r) => {
            if (r.ok) r.json().then(setProjects);
          });
        }
      }}
    >
      <SheetTrigger
        render={
          <Button
            variant="outline"
            className="flex items-center justify-center gap-2 flex-1 sm:flex-initial"
          />
        }
      >
        <Plus className="h-4 w-4" /> Create Invoice
      </SheetTrigger>
      <SheetContent className="sm:max-w-2xl overflow-y-auto p-4">
        <SheetHeader className="p-0">
          <SheetTitle>Generate Invoice</SheetTitle>
          <SheetDescription>
            Bill {clientName} for a specific project.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSaveInvoice} className="space-y-4 mt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project *</label>
            <select
              name="projectId"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select Project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Issued Date *</label>
            <input
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
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
                {/* <div className="flex-1"> */}
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
                {/* </div> */}
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
                  {/* </div> */}
                  {/* <div className="w-28"> */}
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
                .reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0)
                .toLocaleString()}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Internal Notes</label>
            <textarea
              name="details"
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              placeholder="Milestone 1, extra work..."
            />
          </div>

          <SheetFooter className="mt-6">
            <SheetClose render={<Button variant="outline" type="button" />}>
              Cancel
            </SheetClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create Invoice"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
