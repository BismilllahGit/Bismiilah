"use client";

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
import { ArrowLeft, Plus, NotepadText, Pencil, Trash2, X } from "lucide-react";
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
import Link from "next/link";
import {
  usePagination,
  PaginationControls,
  SearchInput,
  FilterBar,
  matchesSearch,
} from "@/components/ui/pagination";

type Activity = {
  id: string;
  date: string;
  description: string;
};

import { DateSortButton, useDateSort } from "@/components/ui/date-sort-button";

export default function SiteActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const {
    data: activities,
    loading,
    refetch,
  } = useApiResource<Activity[]>(`/api/projects/${projectId}/activity`);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filteredActivities = (activities || []).filter((a) => {
    const day = a.date.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return matchesSearch(
      search,
      a.description,
      new Date(a.date).toLocaleDateString(),
    );
  });
  const hasFilters = Boolean(search || from || to);
  const { sorted, dir, toggle } = useDateSort(filteredActivities, (a) => a.date);
  const pg = usePagination(sorted, undefined, `${search}|${from}|${to}|${dir}`);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);
  const createActivity = useApiMutation<Record<string, unknown>, Activity>(
    "POST",
  );
  const updateActivity = useApiMutation<Record<string, unknown>, Activity>(
    "PATCH",
  );
  const deleteActivity = useApiMutation<undefined, { id: string }>("DELETE");

  const closeSheet = (next: boolean) => {
    setOpen(next);
    if (!next) setEditing(null);
  };

  const openEdit = (act: Activity) => {
    setEditing(act);
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteActivity.mutate(
        `/api/projects/${projectId}/activity/${deleting.id}`,
      );
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete activity");
      throw err;
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      date: formData.get("date"),
      description: formData.get("description"),
    };

    try {
      if (editing) {
        await updateActivity.mutate(
          `/api/projects/${projectId}/activity/${editing.id}`,
          payload,
        );
      } else {
        await createActivity.mutate(
          `/api/projects/${projectId}/activity`,
          payload,
        );
      }
      closeSheet(false);
      refetch();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : editing
            ? "Failed to update activity"
            : "Failed to log activity",
      );
    } finally {
      setSaving(false);
    }
  };

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
            Site Activity Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record daily updates and progress.
          </p>
        </div>

        <Button
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Log Activity
        </Button>

        <Sheet open={open} onOpenChange={closeSheet}>
          <SheetContent className="sm:max-w-md p-4">
            <SheetHeader className="p-0">
              <SheetTitle>
                {editing ? "Edit Site Activity" : "Log Site Activity"}
              </SheetTitle>
              <SheetDescription>
                {editing
                  ? "Update the date or description."
                  : "Record daily progress or incidents."}
              </SheetDescription>
            </SheetHeader>
            <form
              key={editing?.id ?? "new"}
              onSubmit={handleSave}
              className="space-y-4 mt-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Date *</label>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={
                    editing
                      ? editing.date.slice(0, 10)
                      : new Date().toISOString().split("T")[0]
                  }
                  className="relative flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description *</label>
                <textarea
                  name="description"
                  required
                  rows={5}
                  defaultValue={editing?.description ?? ""}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  placeholder="e.g. Plastering completed on the second floor. Electrician started wiring..."
                />
              </div>
              <SheetFooter className="mt-6">
                <SheetClose
                  render={
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => closeSheet(false)}
                    />
                  }
                >
                  Cancel
                </SheetClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editing ? "Save Changes" : "Save Log"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search activity..."
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>From</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          />
          <span>To</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="cursor-pointer"
            onClick={() => {
              setSearch("");
              setFrom("");
              setTo("");
            }}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </FilterBar>

      <div className="border rounded-md bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-37.5">
                <DateSortButton dir={dir} onToggle={toggle} />
              </TableHead>
              <TableHead>Activity Description</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading activity logs...
                </TableCell>
              </TableRow>
            ) : filteredActivities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10">
                  <EmptyState
                    icon={NotepadText}
                    message={
                      hasFilters
                        ? "No activities match your filters."
                        : "No activities recorded yet."
                    }
                    messageClassName="text-muted-foreground"
                    variant="cell"
                    compact
                  />
                </TableCell>
              </TableRow>
            ) : (
              pg.pageItems.map((act) => (
                <TableRow key={act.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium align-top">
                    {new Date(act.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="whitespace-pre-wrap">
                    {act.description}
                  </TableCell>
                  <TableCell className="align-top text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label="Edit activity"
                        onClick={() => openEdit(act)}
                        className="p-1 rounded-md cursor-pointer text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete activity"
                        onClick={() => setDeleting(act)}
                        className="p-1 rounded-md cursor-pointer text-slate-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this activity?"
        description="This activity log entry will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
