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
import { ArrowLeft, Plus, NotepadText } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
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
import Link from "next/link";

type Activity = {
  id: string;
  date: string;
  description: string;
};

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
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const createActivity = useApiMutation<Record<string, unknown>, Activity>(
    "POST",
  );

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      date: formData.get("date"),
      description: formData.get("description"),
    };

    try {
      await createActivity.mutate(
        `/api/projects/${projectId}/activity`,
        payload,
      );
      setOpen(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to log activity");
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

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button className="flex items-center gap-2" />}>
            <Plus className="h-4 w-4" /> Log Activity
          </SheetTrigger>
          <SheetContent className="sm:max-w-md p-4">
            <SheetHeader className="p-0">
              <SheetTitle>Log Site Activity</SheetTitle>
              <SheetDescription>
                Record daily progress or incidents.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date *</label>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="relative flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description *</label>
                <textarea
                  name="description"
                  required
                  rows={5}
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
                      onClick={() => setOpen(false)}
                    />
                  }
                >
                  Cancel
                </SheetClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Log"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="border rounded-md bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-37.5">Date</TableHead>
              <TableHead>Activity Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading activity logs...
                </TableCell>
              </TableRow>
            ) : (activities || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-10">
                  <EmptyState
                    icon={NotepadText}
                    message="No activities recorded yet."
                    messageClassName="text-muted-foreground"
                    variant="cell"
                    compact
                  />
                </TableCell>
              </TableRow>
            ) : (
              (activities || []).map((act) => (
                <TableRow key={act.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium align-top">
                    {new Date(act.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="whitespace-pre-wrap">
                    {act.description}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
