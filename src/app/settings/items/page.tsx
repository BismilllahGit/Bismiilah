"use client";

import { NativeSelect } from "@/components/ui/native-select";
import { useState } from "react";
import { useApiResource, useApiMutation } from "@/hooks/useApiResource";
import {
  usePagination,
  PaginationControls,
  SearchInput,
  FilterSelect,
  FilterBar,
  matchesSearch,
} from "@/components/ui/pagination";
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
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Package, Trash2, Pencil } from "lucide-react";
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

const BASE_TYPES = ["MATERIAL", "CEMENT", "PAINT", "TOOL"];
const TYPE_LABELS: Record<string, string> = {
  MATERIAL: "Material",
  CEMENT: "Cement",
  PAINT: "Paint",
  TOOL: "Tool",
};
const NEW_TYPE_OPTION = "__new__";

function formatTypeLabel(type: string) {
  return TYPE_LABELS[type] || type;
}

function ItemTypeField({
  defaultValue,
  knownTypes,
}: {
  defaultValue: string;
  knownTypes: string[];
}) {
  const [customMode, setCustomMode] = useState(
    defaultValue !== "" && !knownTypes.includes(defaultValue),
  );

  if (customMode) {
    return (
      <div className="space-y-1.5">
        <input
          name="type"
          required
          autoFocus
          maxLength={50}
          defaultValue={knownTypes.includes(defaultValue) ? "" : defaultValue}
          placeholder="e.g. Electrical"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        />
        <button
          type="button"
          onClick={() => setCustomMode(false)}
          className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
        >
          Choose from existing types
        </button>
      </div>
    );
  }

  return (
    <NativeSelect
      name="type"
      required
      defaultValue={defaultValue}
      onChange={(e) => {
        if (e.target.value === NEW_TYPE_OPTION) setCustomMode(true);
      }}
    >
      {!defaultValue && <option value="">Select type...</option>}
      {knownTypes.map((t) => (
        <option key={t} value={t}>
          {formatTypeLabel(t)}
        </option>
      ))}
      <option value={NEW_TYPE_OPTION}>+ Add new type…</option>
    </NativeSelect>
  );
}

export default function ItemsPage() {
  const {
    data: items,
    loading,
    refetch: refetchItems,
  } = useApiResource<Item[]>("/api/items");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const createItem = useApiMutation<Record<string, unknown>, Item>("POST");
  const updateItem = useApiMutation<Record<string, unknown>, Item>("PATCH");
  const deactivateItem = useApiMutation<undefined, void>("DELETE");

  const knownTypes = Array.from(
    new Set([...BASE_TYPES, ...(items || []).map((i) => i.type)]),
  );

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const filteredItems = (items || []).filter(
    (i) =>
      (!typeFilter || i.type === typeFilter) &&
      matchesSearch(search, i.name, i.grade, i.type, i.unit),
  );
  const pg = usePagination(filteredItems, undefined, `${search}|${typeFilter}`);
  const emptyMessage =
    search || typeFilter
      ? "No items match your filters."
      : "No items in the catalog yet.";

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

  const handleEditSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    setEditSaving(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      type: formData.get("type"),
      grade: formData.get("grade") || null,
      unit: formData.get("unit"),
      unitCost: Number(formData.get("unitCost")),
    };

    try {
      await updateItem.mutate(`/api/items/${editingItem.id}`, payload);
      setEditingItem(null);
      refetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update item");
    } finally {
      setEditSaving(false);
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
    <div className="space-y-6">
      <PageHeader
        title="Master Item Ledger"
        subtitle="Global catalog for materials and tools."
        action={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={<Button className="flex items-center gap-2" />}
            >
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
                  <ItemTypeField defaultValue="" knownTypes={knownTypes} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Grade (Optional)
                  </label>
                  <NativeSelect
                    name="grade"
                  >
                    <option value="">None</option>
                    <option value="GRADE_A">Grade A</option>
                    <option value="GRADE_B">Grade B</option>
                    <option value="GRADE_C">Grade C</option>
                  </NativeSelect>
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
                  <SheetClose
                    render={<Button variant="outline" type="button" />}
                  >
                    Cancel
                  </SheetClose>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Item"}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, grade or unit..."
        />
        <FilterSelect
          value={typeFilter}
          onChange={setTypeFilter}
          allLabel="All types"
          options={knownTypes.map((t) => ({
            value: t,
            label: formatTypeLabel(t),
          }))}
        />
      </FilterBar>

      {/* Mobile & Tablet Stacked Cards View (below lg breakpoint) */}
      <div className="lg:hidden space-y-3.5">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
            Loading items...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-white shadow-sm">
            <EmptyState icon={Package} message={emptyMessage} />
          </div>
        ) : (
          pg.pageItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="font-bold text-slate-900 text-base wrap-break-word">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium bg-slate-100 text-slate-700"
                    >
                      {formatTypeLabel(item.type)}
                    </Badge>
                    {item.grade && (
                      <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {item.grade.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingItem(item)}
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-50 h-9 w-9 p-0 border border-slate-200/70 rounded-lg"
                    title="Edit Item"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeactivateTarget(item.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 w-9 p-0 border border-slate-200/70 rounded-lg"
                    title="Remove Item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
        <Table className="min-w-175">
          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
            <TableRow>
              <TableHead className="w-60 font-semibold text-slate-700">
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
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-14">
                  <EmptyState
                    icon={Package}
                    message={emptyMessage}
                    variant="cell"
                  />
                </TableCell>
              </TableRow>
            ) : (
              pg.pageItems.map((item) => (
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
                      {formatTypeLabel(item.type)}
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
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingItem(item)}
                        className="text-slate-500 hover:text-slate-700 hover:bg-slate-100/80"
                        title="Edit Item"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeactivateTarget(item.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50/80"
                        title="Remove Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls
        page={pg.page}
        totalPages={pg.totalPages}
        total={pg.total}
        onPageChange={pg.setPage}
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate this item?"
        description="This will hide the record but preserve historical data."
        confirmLabel="Deactivate"
        onConfirm={() => handleDeactivate(deactivateTarget!)}
      />

      <Sheet
        open={editingItem !== null}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <SheetContent className="sm:max-w-md p-4">
          <SheetHeader className="p-0">
            <SheetTitle>Edit Item</SheetTitle>
            <SheetDescription>
              Update this item in the catalog.
            </SheetDescription>
          </SheetHeader>
          {editingItem && (
            <form
              key={editingItem.id}
              onSubmit={handleEditSave}
              className="space-y-4 mt-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Item Name *</label>
                <input
                  name="name"
                  required
                  defaultValue={editingItem.name}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  placeholder="e.g. River Sand"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type *</label>
                <ItemTypeField
                  defaultValue={editingItem.type}
                  knownTypes={knownTypes}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Grade (Optional)
                </label>
                <NativeSelect
                  name="grade"
                  defaultValue={editingItem.grade || ""}
                >
                  <option value="">None</option>
                  <option value="GRADE_A">Grade A</option>
                  <option value="GRADE_B">Grade B</option>
                  <option value="GRADE_C">Grade C</option>
                </NativeSelect>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit *</label>
                  <input
                    name="unit"
                    required
                    defaultValue={editingItem.unit}
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
                    min="0"
                    required
                    defaultValue={editingItem.unitCost}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <SheetFooter className="mt-6">
                <SheetClose
                  render={<Button variant="outline" type="button" />}
                >
                  Cancel
                </SheetClose>
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? "Saving..." : "Save Changes"}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
