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
import { ArrowLeft, Plus, Hammer } from "lucide-react";
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
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ExtraWork = {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: string;
};

export default function ExtraWorkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [works, setWorks] = useState<ExtraWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchExtraWork = async () => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/extra-work`);
    if (res.ok) setWorks(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchExtraWork();
  }, [projectId]);

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
      const res = await fetch(`/api/projects/${projectId}/extra-work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setOpen(false);
        fetchExtraWork();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to log extra work");
      }
    } catch (err) {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const totalUnbilled = works
    .filter((w) => w.status === "UNBILLED")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalBilled = works
    .filter((w) => w.status === "BILLED")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalCollected = works
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
          <SheetTrigger render={<Button className="flex items-center gap-2" />}>
            <Plus className="h-4 w-4" /> Log Extra Work
          </SheetTrigger>
          <SheetContent className="sm:max-w-md p-4">
            <SheetHeader className="p-0">
              <SheetTitle>Log Extra Work</SheetTitle>
              <SheetDescription>
                Record deviation work to bill the client later.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Description *</label>
                <textarea
                  name="description"
                  required
                  rows={3}
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
                <label className="text-sm font-medium">Status *</label>
                <select
                  name="status"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="UNBILLED">Unbilled</option>
                  <option value="BILLED">Billed</option>
                  <option value="COLLECTED">Collected</option>
                </select>
              </div>
              <SheetFooter className="mt-6">
                <SheetClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </SheetClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Entry"}
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

      {/* Mobile Stacked Card View (below md breakpoint) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg bg-white">
            Loading extra work...
          </div>
        ) : works.length === 0 ? (
          <div className="text-center py-10 border rounded-lg bg-white p-4">
            <Hammer className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-20" />
            <p className="text-muted-foreground text-sm">
              No extra work deviations recorded.
            </p>
          </div>
        ) : (
          works.map((w) => (
            <div
              key={w.id}
              className="bg-white border rounded-lg p-3.5 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between border-b pb-1.5 text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {new Date(w.date).toLocaleDateString()}
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
              <div className="flex items-center justify-end pt-1 border-t border-slate-100">
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
        <Table className="min-w-[600px]">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading extra work...
                </TableCell>
              </TableRow>
            ) : works.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">
                  <Hammer className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-20" />
                  <p className="text-muted-foreground">
                    No extra work deviations recorded.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              works.map((w) => (
                <TableRow key={w.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium whitespace-nowrap">
                    {new Date(w.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">{w.description}</TableCell>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
