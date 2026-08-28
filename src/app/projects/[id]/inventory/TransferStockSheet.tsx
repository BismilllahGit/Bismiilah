"use client";

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
import { Button } from "@/components/ui/button";
import { ArrowRightLeft } from "lucide-react";

type Item = { id: string; name: string; unit: string; unitCost: number };
type InventoryBalance = {
  id: string;
  itemId: string;
  qtyBought: number;
  qtyIssued: number;
  qtyReturned: number;
  qtyTransferredIn: number;
  qtyTransferredOut: number;
  item: Item;
};
type Project = { id: string; name: string };

export function TransferStockSheet({
  transferOpen,
  setTransferOpen,
  projects,
  inventory,
  selectedItem,
  handleTransfer,
  mutating,
}: {
  transferOpen: boolean;
  setTransferOpen: (open: boolean) => void;
  projects: Project[];
  inventory: InventoryBalance[];
  selectedItem: Item | null;
  handleTransfer: (e: React.FormEvent<HTMLFormElement>) => void;
  mutating: boolean;
}) {
  return (
    <Sheet open={transferOpen} onOpenChange={setTransferOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" className="flex items-center gap-2" />
        }
      >
        <ArrowRightLeft className="h-4 w-4" /> Transfer Out
      </SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto p-4">
        <SheetHeader className="p-0">
          <SheetTitle>Transfer Stock to Another Site</SheetTitle>
          <SheetDescription>
            Move materials from this site to another active site.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleTransfer} className="space-y-4 mt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Destination Project *
            </label>
            <select
              name="destinationProjectId"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Item to Transfer *
            </label>
            <select
              name="itemId"
              required
              defaultValue={selectedItem?.id || ""}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select from current stock...</option>
              {inventory.map((inv) => {
                const stock =
                  Number(inv.qtyBought) +
                  Number(inv.qtyTransferredIn) -
                  Number(inv.qtyIssued) -
                  Number(inv.qtyReturned) -
                  Number(inv.qtyTransferredOut);
                if (stock <= 0) return null;
                return (
                  <option key={inv.item.id} value={inv.item.id}>
                    {inv.item.name} (Max: {stock})
                  </option>
                );
              })}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity *</label>
            <input
              name="quantity"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date *</label>
            <input
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Note / Reason</label>
            <input
              name="note"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              placeholder="e.g., Requested by Site Engineer"
            />
          </div>
          <SheetFooter className="mt-6">
            <SheetClose
              render={<Button variant="outline" type="button" />}
            >
              Cancel
            </SheetClose>
            <Button type="submit" disabled={mutating}>
              {mutating ? "Transferring..." : "Transfer Stock"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
