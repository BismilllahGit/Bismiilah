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
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

type Item = { id: string; name: string; unit: string; unitCost: number };

export function LogTransactionSheet({
  txnOpen,
  setTxnOpen,
  itemName,
  itemCost,
  setItemCost,
  handleItemNameChange,
  items,
  handleLogTransaction,
  mutating,
}: {
  txnOpen: boolean;
  setTxnOpen: (open: boolean) => void;
  itemName: string;
  itemCost: string;
  setItemCost: (val: string) => void;
  handleItemNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  items: Item[];
  handleLogTransaction: (e: React.FormEvent<HTMLFormElement>) => void;
  mutating: boolean;
}) {
  return (
    <Sheet open={txnOpen} onOpenChange={setTxnOpen}>
      <SheetTrigger
        render={<Button className="flex items-center gap-2" />}
      >
        <Plus className="h-4 w-4" /> Log Transaction
      </SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto p-4">
        <SheetHeader className="p-0">
          <SheetTitle>Log Inventory Transaction</SheetTitle>
          <SheetDescription>
            Record buying, issuing, or returning an item.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleLogTransaction} className="space-y-4 mt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Item Name *</label>
            <Input
              required
              value={itemName}
              onChange={handleItemNameChange}
              list="items-list"
              placeholder="Type to search or add new..."
            />
            <datalist id="items-list">
              {items.map((i) => (
                <option key={i.id} value={i.name} />
              ))}
            </datalist>
            <p className="text-[10px] text-muted-foreground">
              If the item doesn&apos;t exist, it will be automatically created.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Transaction Type *
            </label>
            <select
              name="type"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="BUY">Buy (Inward to Site)</option>
              <option value="ISSUE">Issue (Used on Site)</option>
              <option value="RETURN">Return (Outward from Site)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
              <label className="text-sm font-medium">
                Unit Cost (₹) *
              </label>
              <input
                id="unitCost"
                name="unitCost"
                type="number"
                step="0.01"
                value={itemCost}
                onChange={(e) => setItemCost(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                placeholder="0.00"
              />
            </div>
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
            <label className="text-sm font-medium">
              Note / Reference
            </label>
            <input
              name="note"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              placeholder="Invoice or slip number..."
            />
          </div>
          <SheetFooter className="mt-6">
            <SheetClose
              render={<Button variant="outline" type="button" />}
            >
              Cancel
            </SheetClose>
            <Button type="submit" disabled={mutating}>
              {mutating ? "Saving..." : "Log Transaction"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
