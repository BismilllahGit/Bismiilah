"use client";

import { useEffect, useState, use } from "react";
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

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchActivities = async () => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/activity`);
    if (res.ok) setActivities(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, [projectId]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      date: formData.get("date"),
      description: formData.get("description"),
    };

    try {
      const res = await fetch(`/api/projects/${projectId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setOpen(false);
        fetchActivities();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to log activity");
      }
    } catch (err) {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Project
      </Link>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
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
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
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
              <TableHead className="w-[150px]">Date</TableHead>
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
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-10">
                  <NotepadText className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-20" />
                  <p className="text-muted-foreground">
                    No activities recorded yet.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              activities.map((act) => (
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
