"use client";

import { Plus } from "lucide-react";
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

export default function ExpenseFormSheet({
  open,
  onOpenChange,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <Button className="flex items-center gap-2 max-sm:w-full justify-center h-8" />
        }
      >
        <Plus className="h-4 w-4" /> Log Petty Cash Expense
      </SheetTrigger>
      <SheetContent className="sm:max-w-md p-4">
        <SheetHeader className="p-0">
          <SheetTitle>Log Site Expense</SheetTitle>
          <SheetDescription>
            Record a petty cash transaction for this project.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category *</label>
            <select
              name="category"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="Food & Tea">Food & Tea</option>
              <option value="Travel/Transport">Travel/Transport</option>
              <option value="Stationery/Print">Stationery/Print</option>
              <option value="Misc Materials">Misc Materials</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (₹) *</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="1"
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
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <input
              name="description"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              placeholder="Details of expense..."
            />
          </div>
          <SheetFooter className="mt-6">
            <SheetClose render={<Button variant="outline" type="button" />}>
              Cancel
            </SheetClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Expense"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
