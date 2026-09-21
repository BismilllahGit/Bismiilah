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

type WorkerType = { id: string; name: string };

export function EditLabourEntrySheet({
  contactId,
  entryId,
  open,
  onOpenChange,
  onSaved,
}: {
  contactId: string;
  entryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workerTypes, setWorkerTypes] = useState<WorkerType[]>([]);
  const [date, setDate] = useState("");
  const [workerTypeId, setWorkerTypeId] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [wageRate, setWageRate] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open || !entryId) return;
    if (workerTypes.length === 0) {
      fetch("/api/worker-types").then((r) => {
        if (r.ok) r.json().then(setWorkerTypes);
      });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: kicks off the fetch-on-open pattern for this sheet
    setLoading(true);
    fetch(`/api/contacts/${contactId}/daily-labour/${entryId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((entry) => {
        setDate(new Date(entry.date).toISOString().split("T")[0]);
        setWorkerTypeId(entry.workerTypeId);
        setHeadcount(String(entry.headcount));
        setWageRate(String(entry.wageRate));
        setTitle(entry.title || "");
        setNote(entry.note || "");
      })
      .catch(() => alert("Failed to load labour entry"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entryId, contactId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!entryId) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/contacts/${contactId}/daily-labour/${entryId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            workerTypeId,
            headcount: Number(headcount),
            wageRate: Number(wageRate),
            title: title || undefined,
            note: note || undefined,
          }),
        },
      );

      if (res.ok) {
        onOpenChange(false);
        onSaved();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update labour entry");
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
          <SheetTitle>Edit Labour Entry</SheetTitle>
          <SheetDescription>
            Update this day&apos;s logged labour for this contractor.
          </SheetDescription>
        </SheetHeader>
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">
            Loading entry...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Worker Type *</label>
              <select
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={workerTypeId}
                onChange={(e) => setWorkerTypeId(e.target.value)}
              >
                <option value="">-- Select worker type --</option>
                {workerTypes.map((wt) => (
                  <option key={wt.id} value={wt.id}>
                    {wt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Headcount *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={headcount}
                  onChange={(e) => setHeadcount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Wage Rate (₹) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={wageRate}
                  onChange={(e) => setWageRate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title (Optional)</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Foundation work"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note</label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
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
