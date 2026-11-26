"use client";

import { NativeSelect } from "@/components/ui/native-select";
import { useState, use } from "react";
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
import { ArrowLeft, Plus, Hammer, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  usePagination,
  PaginationControls,
  SearchInput,
  FilterSelect,
  FilterBar,
  matchesSearch,
} from "@/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LinkedInventory = {
  itemId: string;
  itemName: string;
  unit: string;
  type: string;
  quantity: number;
  value: number;
};

type ExtraWork = {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: string;
  linkedInventory?: LinkedInventory[];
};

const TXN_LABEL: Record<string, string> = {
  BUY: "Bought",
  ISSUE: "Issued",
  RETURN: "Returned",
  ADJUST: "Adjusted",
};

function LinkedInventoryList({
  rows,
  projectId,
}: {
  rows?: LinkedInventory[];
  projectId: string;
}) {
  if (!rows?.length) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {rows.map((r) => (
        <Link
          key={`${r.itemId}:${r.type}`}
          href={`/projects/${projectId}/inventory`}
          className="text-xs text-slate-700 hover:text-blue-600"
          title={`Value: ₹${r.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        >
          <span className="font-medium">{r.itemName}</span>{" "}
          <span className="text-muted-foreground">
            · {TXN_LABEL[r.type] ?? r.type}{" "}
            {r.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
            {r.unit}
          </span>
        </Link>
      ))}
    </div>
  );
}

import { DateSortButton, useDateSort } from "@/components/ui/date-sort-button";
import { formatDate, todayISO } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

export default function ExtraWorkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const {
    data: works,
    loading,
    refetch,
  } = useApiResource<ExtraWork[]>(`/api/projects/${projectId}/extra-work`);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const filteredWorks = (works || []).filter(
    (w) =>
      (!statusFilter || w.status === statusFilter) &&
      matchesSearch(search, w.description),
  );
  const { sorted, dir, toggle } = useDateSort(filteredWorks, (w) => w.date);
  const pg = usePagination(
    sorted,
    undefined,
    `${search}|${statusFilter}|${dir}`,
  );
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExtraWork | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExtraWork | null>(null);
  const createExtraWork = useApiMutation<Record<string, unknown>, ExtraWork>(
    "POST",
  );
  const updateExtraWork = useApiMutation<Record<string, unknown>, ExtraWork>(
    "PATCH",
  );
  const deleteExtraWork = useApiMutation<undefined, { id: string }>("DELETE");

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (w: ExtraWork) => {
    setEditing(w);
    setOpen(true);
  };

  const handleDelete = async (w: ExtraWork) => {
    try {
      await deleteExtraWork.mutate(
        `/api/projects/${projectId}/extra-work/${w.id}`,
      );
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete extra work");
      throw err;
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      description: formData.get("description"),
      amount: Number(formData.get("amount")),
      date: formData.get("date"),
      status: formData.get("status"),
    };

    try {
      if (editing) {
        await updateExtraWork.mutate(
          `/api/projects/${projectId}/extra-work/${editing.id}`,
          payload,
        );
      } else {
        await createExtraWork.mutate(
          `/api/projects/${projectId}/extra-work`,
          payload,
        );
      }
      setOpen(false);
      setEditing(null);
      refetch();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : editing
            ? "Failed to update extra work"
            : "Failed to log extra work",
      );
    } finally {
      setSaving(false);
    }
  };

  const totalUnbilled = (works || [])
    .filter((w) => w.status === "UNBILLED")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalBilled = (works || [])
    .filter((w) => w.status === "BILLED")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalCollected = (works || [])
    .filter((w) => w.status === "COLLECTED")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div className="p-2 md:p-4 max-w-7xl mx-auto space-y-6">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Project
      </Link>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Extra Work (Deviations)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track work outside the initial project scope.
          </p>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <Button className="flex items-center gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Log Extra Work
          </Button>
          <SheetContent className="sm:max-w-md p-4">
            <SheetHeader className="p-0">
              <SheetTitle>
                {editing ? "Edit Extra Work" : "Log Extra Work"}
              </SheetTitle>
              <SheetDescription>
                {editing
                  ? "Update the details of this deviation entry."
                  : "Record deviation work to bill the client later."}
              </SheetDescription>
            </SheetHeader>
            <form
              key={editing?.id ?? "new"}
              onSubmit={handleSave}
              className="space-y-4 mt-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Description *</label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  defaultValue={editing?.description ?? ""}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  placeholder="e.g. Additional electrical points in living room..."
                />
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
                    defaultValue={editing ? Number(editing.amount) : undefined}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date *</label>
                  <DatePicker
                    name="date"
                    required
                    defaultValue={
                      editing ? editing.date.slice(0, 10) : todayISO()
                    }
                    className="h-9 w-full"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status *</label>
                <NativeSelect
                  name="status"
                  required
                  defaultValue={editing?.status ?? "UNBILLED"}
                >
                  <option value="UNBILLED">Unbilled</option>
                  <option value="BILLED">Billed</option>
                  <option value="COLLECTED">Collected</option>
                </NativeSelect>
              </div>
              <SheetFooter className="mt-6">
                <SheetClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </SheetClose>
                <Button type="submit" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Save Changes"
                      : "Save Entry"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">
              Unbilled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ₹
              {totalUnbilled.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Billed (Pending)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹
              {totalBilled.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹
              {totalCollected.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search description..."
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          allLabel="All statuses"
          options={[
            { value: "UNBILLED", label: "Unbilled" },
            { value: "BILLED", label: "Billed" },
            { value: "COLLECTED", label: "Collected" },
          ]}
        />
      </FilterBar>

      {/* Mobile Stacked Card View (below md breakpoint) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg bg-white">
            Loading extra work...
          </div>
        ) : filteredWorks.length === 0 ? (
          <div className="text-center py-10 border rounded-lg bg-white p-4">
            <EmptyState
              icon={Hammer}
              message="No extra work deviations recorded."
              messageClassName="text-muted-foreground text-sm"
              compact
            />
          </div>
        ) : (
          pg.pageItems.map((w) => (
            <div
              key={w.id}
              className="bg-white border rounded-lg p-3.5 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between border-b pb-1.5 text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {formatDate(w.date)}
                </span>
                <Badge
                  variant={
                    w.status === "UNBILLED"
                      ? "secondary"
                      : w.status === "COLLECTED"
                        ? "default"
                        : "outline"
                  }
                  className={
                    w.status === "COLLECTED"
                      ? "bg-green-500 text-xs"
                      : w.status === "UNBILLED"
                        ? "bg-orange-100 text-orange-800 text-xs"
                        : "bg-blue-100 text-blue-800 text-xs"
                  }
                >
                  {w.status}
                </Badge>
              </div>
              <div className="text-sm text-slate-800 font-medium">
                {w.description}
              </div>
              {!!w.linkedInventory?.length && (
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                    Linked Inventory
                  </div>
                  <LinkedInventoryList
                    rows={w.linkedInventory}
                    projectId={projectId}
                  />
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(w)}
                    aria-label="Edit extra work"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(w)}
                    aria-label="Delete extra work"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  ₹
                  {Number(w.amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop/Tablet Table View (md breakpoint and above) */}
      <div className="hidden md:block border rounded-md bg-white shadow-sm">
        <Table className="min-w-150">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-30">
                <DateSortButton dir={dir} onToggle={toggle} />
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Linked Inventory</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading extra work...
                </TableCell>
              </TableRow>
            ) : filteredWorks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <EmptyState
                    icon={Hammer}
                    message="No extra work deviations recorded."
                    messageClassName="text-muted-foreground"
                    variant="cell"
                    compact
                  />
                </TableCell>
              </TableRow>
            ) : (
              pg.pageItems.map((w) => (
                <TableRow key={w.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatDate(w.date)}
                  </TableCell>
                  <TableCell className="text-sm">{w.description}</TableCell>
                  <TableCell>
                    <LinkedInventoryList
                      rows={w.linkedInventory}
                      projectId={projectId}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        w.status === "UNBILLED"
                          ? "secondary"
                          : w.status === "COLLECTED"
                            ? "default"
                            : "outline"
                      }
                      className={
                        w.status === "COLLECTED"
                          ? "bg-green-500"
                          : w.status === "UNBILLED"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-blue-100 text-blue-800"
                      }
                    >
                      {w.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    ₹
                    {Number(w.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(w)}
                        aria-label="Edit extra work"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(w)}
                        aria-label="Delete extra work"
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this extra work?"
        description={
          deleteTarget
            ? `${deleteTarget.description} (₹${Number(deleteTarget.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}).${deleteTarget.linkedInventory?.length ? " Linked inventory entries will be kept but unlinked." : ""} This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        onConfirm={() => handleDelete(deleteTarget!)}
      />

      <PaginationControls
        page={pg.page}
        totalPages={pg.totalPages}
        total={pg.total}
        onPageChange={pg.setPage}
      />
    </div>
  );
}
