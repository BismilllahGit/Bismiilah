"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Phone, Trash2 } from "lucide-react";
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

type Client = {
  id: string;
  name: string;
  phone: string | null;

  address: string | null;
  invoices: { projectId: string }[];
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    const res = await fetch("/api/clients");
    if (res.ok) setClients(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      phone: formData.get("phone") || undefined,

      address: formData.get("address") || undefined,
    };

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setOpen(false);
        fetchClients();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save client");
      }
    } catch (err) {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (
      !confirm(
        "This will hide the record but preserve historical data. Are you sure?",
      )
    )
      return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchClients();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to deactivate client");
      }
    } catch (err) {
      alert("An error occurred");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your clients and their projects.
          </p>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button className="flex items-center gap-2" />}>
            <Plus className="h-4 w-4" /> New Client
          </SheetTrigger>
          <SheetContent className="sm:max-w-md p-4">
            <SheetHeader className="p-0">
              <SheetTitle>Add Client</SheetTitle>
              <SheetDescription>
                Register a new client profile.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Full Name / Company *
                </label>
                <input
                  name="name"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    placeholder="e.g. +91 9876543210"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <textarea
                  name="address"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  placeholder="Client billing address..."
                />
              </div>
              <SheetFooter className="mt-6">
                <SheetClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </SheetClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Client"}
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
            Loading clients...
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-white shadow-sm">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-muted-foreground font-medium text-sm">
              No clients registered yet.
            </p>
          </div>
        ) : (
          clients.map((client) => {
            const projectCount = new Set(
              client.invoices.map((i) => i.projectId),
            ).size;
            return (
              <div
                key={client.id}
                className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-slate-900 text-base break-words">
                      {client.name}
                    </h3>
                    {client.phone ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />{" "}
                        {client.phone}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        No phone number provided
                      </span>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs font-mono shrink-0 py-1 px-2.5 bg-slate-100 text-slate-700 font-bold"
                    title="Active Projects"
                  >
                    {projectCount} {projectCount === 1 ? "Project" : "Projects"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-1 gap-2">
                  <Link href={`/clients/${client.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full font-semibold text-blue-600 border-blue-200/80 bg-blue-50/50 hover:bg-blue-100/70 hover:text-blue-700 h-9"
                    >
                      View Details & Ledger
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeactivate(client.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 px-3 border border-slate-200/70 rounded-lg shrink-0"
                    title="Remove Client"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View (lg breakpoint and above) */}
      <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table className="min-w-[650px]">
          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
            <TableRow>
              <TableHead className="w-[240px] font-semibold text-slate-700">
                Client Name
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Contact Info
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Active Projects
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
                  colSpan={4}
                  className="text-center py-12 text-muted-foreground"
                >
                  Loading clients...
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-14">
                  <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
                  <p className="text-muted-foreground font-medium">
                    No clients registered yet.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow
                  key={client.id}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <TableCell className="font-semibold text-slate-800">
                    {client.name}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {client.phone ? (
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />{" "}
                          {client.phone}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="font-mono text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-700"
                    >
                      {new Set(client.invoices.map((i) => i.projectId)).size}{" "}
                      Projects
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/clients/${client.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/80"
                        >
                          View Details
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(client.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50/80"
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
    </div>
  );
}
