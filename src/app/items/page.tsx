"use client";

import { useState } from "react";
import { useApiResource, useApiMutation } from "@/hooks/useApiResource";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Package, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

type Item = {
  id: string;
  name: string;
  type: string;
  grade: string | null;
  unit: string;
  unitCost: number;
};

export default function ItemsPage() {
  const {
    data: items,
    loading,
    refetch: refetchItems,
  } = useApiResource<Item[]>("/api/items");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(
    null,
  );
  const createItem = useApiMutation<Record<string, unknown>, Item>("POST");
  const deactivateItem = useApiMutation<undefined, void>("DELETE");

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      type: formData.get("type"),
      grade: formData.get("grade") || null,
      unit: formData.get("unit"),
      unitCost: Number(formData.get("unitCost")),
    };

    try {
      await createItem.mutate("/api/items", payload);
      setOpen(false);
      refetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateItem.mutate(`/api/items/${id}`);
      refetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to deactivate item");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Master Item Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global catalog for materials and tools.
          </p>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button className="flex items-center gap-2" />}>
            <Plus className="h-4 w-4" /> New Item
          </SheetTrigger>
          <SheetContent className="sm:max-w-md p-4">
            <SheetHeader className="p-0">
              <SheetTitle>Add Item to Catalog</SheetTitle>
              <SheetDescription>
                Define a new material, tool, paint or cement type here.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Item Name *</label>
                <input
                  name="name"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  placeholder="e.g. River Sand"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type *</label>
                <select
                  name="type"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="MATERIAL">Material</option>
                  <option value="CEMENT">Cement</option>
                  <option value="PAINT">Paint</option>
                  <option value="TOOL">Tool</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Grade (Optional)</label>
                <select
                  name="grade"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">None</option>
                  <option value="GRADE_A">Grade A</option>
                  <option value="GRADE_B">Grade B</option>
                  <option value="GRADE_C">Grade C</option>
                </select>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit *</label>
                  <input
                    name="unit"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    placeholder="e.g. tonne, bag, kg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Est. Unit Cost (₹) *
                  </label>
                  <input
                    name="unitCost"
                    type="number"
                    step="0.01"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <SheetFooter className="mt-6">
                <SheetClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </SheetClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Item"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Mobile & Tablet Stacked Cards View (below lg breakpoint) */}
      <div className="lg:hidden space-y-3.5">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
            Loading items...
          </div>
        ) : (items || []).length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-white shadow-sm">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-muted-foreground font-medium text-sm">
              No items in the catalog yet.
            </p>
          </div>
        ) : (
          (items || []).map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="font-bold text-slate-900 text-base break-words">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium bg-slate-100 text-slate-700"
                    >
                      {item.type}
                    </Badge>
                    {item.grade && (
                      <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {item.grade.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeactivateTarget(item.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 w-9 p-0 border border-slate-200/70 rounded-lg shrink-0"
                  title="Remove Item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                <div className="bg-slate-50/80 rounded-lg p-2.5 flex flex-col justify-center border border-slate-100/80">
                  <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
                    Unit Measurement
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {item.unit}
                  </span>
                </div>
                <div className="bg-slate-50/80 rounded-lg p-2.5 flex flex-col justify-center border border-slate-100/80 text-right">
                  <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
                    Unit Cost (₹)
                  </span>
                  <span className="font-mono font-bold text-green-600 text-sm sm:text-base">
                    ₹
                    {Number(item.unitCost).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (lg breakpoint and above) */}
      <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table className="min-w-[700px]">
          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
            <TableRow>
              <TableHead className="w-[240px] font-semibold text-slate-700">
                Item Name
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Type
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Grade
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Unit
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-700">
                Unit Cost
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-700">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-muted-foreground"
                >
                  Loading items...
                </TableCell>
              </TableRow>
            ) : (items || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-14">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
                  <p className="text-muted-foreground font-medium">
                    No items in the catalog yet.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              (items || []).map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <TableCell className="font-semibold text-slate-800">
                    {item.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium bg-slate-50 text-slate-700"
                    >
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.grade ? (
                      <span className="text-sm font-medium text-slate-600">
                        {item.grade.replace("_", " ")}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600 font-medium">
                    {item.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900">
                    ₹
                    {Number(item.unitCost).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeactivateTarget(item.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate this item?"
        description="This will hide the record but preserve historical data."
        confirmLabel="Deactivate"
        onConfirm={() => handleDeactivate(deactivateTarget!)}
      />
    </div>
  );
}
