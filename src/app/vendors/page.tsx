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
import { Plus, Users, Phone, Trash2 } from "lucide-react";
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

type Contact = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  specialty: string | null;
  address: string | null;
};

export default function VendorsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchContacts = async () => {
    setLoading(true);
    const res = await fetch("/api/contacts");
    if (res.ok) {
      setContacts(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      type: formData.get("type"),
      phone: formData.get("phone") || undefined,
      specialty: formData.get("specialty") || undefined,
      address: formData.get("address") || undefined,
    };

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setOpen(false);
        fetchContacts();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save contact");
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
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchContacts();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to deactivate vendor");
      }
    } catch (err) {
      alert("An error occurred");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors & Shops</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Directory of material suppliers and contractors.
          </p>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button className="flex items-center gap-2" />}>
            <Plus className="h-4 w-4" /> New Vendor
          </SheetTrigger>
          <SheetContent className="sm:max-w-md p-4">
            <SheetHeader className="p-0">
              <SheetTitle>Register Vendor</SheetTitle>
              <SheetDescription>
                Add a new supplier or shop to your directory.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name / Company *</label>
                <input
                  name="name"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  placeholder="e.g. ABC Cements"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type *</label>
                  <select
                    name="type"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="VENDOR">Vendor</option>
                    <option value="SHOP">Shop</option>
                    <option value="ELECTRICIAN">
                      Electrician (Contractor)
                    </option>
                    <option value="LABOUR_CONTRACTOR">Labour Contractor</option>
                  </select>
                </div>
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
                <label className="text-sm font-medium">Specialty</label>
                <input
                  name="specialty"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  placeholder="e.g. Plumbing materials, Sand"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <textarea
                  name="address"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  placeholder="Shop location..."
                />
              </div>
              <SheetFooter className="mt-6">
                <SheetClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </SheetClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Vendor"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Mobile Stacked Cards View (below lg breakpoint) */}
      <div className="lg:hidden space-y-3.5">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
            Loading vendors...
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-12 border rounded-xl bg-white shadow-sm">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-muted-foreground text-sm font-medium">
              No vendors registered yet.
            </p>
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="font-bold text-slate-900 text-base break-words">
                    {contact.name}
                  </h3>
                  {contact.specialty && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {contact.specialty}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold bg-slate-50 text-slate-700 shrink-0"
                >
                  {contact.type}
                </Badge>
              </div>

              {contact.phone ? (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50/70 p-2 rounded-lg border border-slate-100/80">
                  <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="font-medium">{contact.phone}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic pl-1">
                  No contact number provided
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
                <Link href={`/vendors/${contact.id}`} className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full font-semibold text-blue-600 border-blue-200/80 bg-blue-50/50 hover:bg-blue-100/70 hover:text-blue-700 h-9"
                  >
                    View Ledger
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeactivate(contact.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 px-3 border border-slate-200/70 rounded-lg shrink-0"
                  title="Remove Vendor"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
                Vendor Name
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Type
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Specialty
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                Contact
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
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground"
                >
                  Loading vendors...
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-14">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
                  <p className="text-muted-foreground font-medium">
                    No vendors registered yet.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <TableCell className="font-semibold text-slate-800">
                    {contact.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-xs font-medium bg-slate-50 text-slate-700"
                    >
                      {contact.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {contact.specialty || "-"}
                  </TableCell>
                  <TableCell>
                    {contact.phone ? (
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />{" "}
                        {contact.phone}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/vendors/${contact.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50/80"
                        >
                          View Ledger
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(contact.id)}
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
