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
import {
  ArrowLeft,
  Plus,
  Receipt,
  HardHat,
  Package,
  Store,
  Wallet,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type Expense = {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
};

type LabourEntry = {
  id: string;
  date: string;
  headcount: number;
  wageRate: number;
  title: string | null;
  workerType: { name: string } | null;
  contractor: { name: string } | null;
};

type MaterialEntry = {
  id: string;
  qtyIssued: number;
  item: { name: string; unit: string; unitCost: number };
};

type VendorTxn = {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string | null;
  contact: { name: string };
};

export default function SiteExpensesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [labourEntries, setLabourEntries] = useState<LabourEntry[]>([]);
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [vendorTxns, setVendorTxns] = useState<VendorTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/expenses`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        setExpenses(data);
      } else {
        setExpenses(data.siteExpenses || []);
        setLabourEntries(data.labourEntries || []);
        setMaterials(data.materials || []);
        setVendorTxns(data.vendorTransactions || []);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, [projectId]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      category: formData.get("category"),
      amount: Number(formData.get("amount")),
      date: formData.get("date"),
      description: formData.get("description") || undefined,
    };

    try {
      const res = await fetch(`/api/projects/${projectId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setOpen(false);
        fetchExpenses();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to log expense");
      }
    } catch (err) {
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const totalPettyCash = expenses.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0,
  );
  const totalLabour = labourEntries.reduce(
    (acc, curr) => acc + Number(curr.headcount) * Number(curr.wageRate),
    0,
  );
  const totalMaterials = materials.reduce(
    (acc, curr) => acc + Number(curr.qtyIssued) * Number(curr.item.unitCost),
    0,
  );
  const totalVendor = vendorTxns.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0,
  );

  // Overall Buy-side Outflow without double counting any category
  const totalOutflow =
    totalPettyCash + totalLabour + totalMaterials + totalVendor;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Project
      </Link>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Site Expenses & Buy-Side Costs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Categorized breakdown of labour wages, materials issued, vendor
            transactions, and petty cash.
          </p>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button className="flex items-center gap-2 max-sm:w-full justify-center h-10" />
            }
          >
            <Plus className="h-4 w-4" /> Log Petty Cash Expense
          </SheetTrigger>
          <SheetContent className="sm:max-w-md p-4">
            <SheetHeader className="p-0">
              <SheetTitle>Log Site Expense</SheetTitle>
              <SheetDescription>
                Record a petty cash transaction for this project.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category *</label>
                <select
                  name="category"
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="Food & Tea">Food & Tea</option>
                  <option value="Travel/Transport">Travel/Transport</option>
                  <option value="Stationery/Print">Stationery/Print</option>
                  <option value="Misc Materials">Misc Materials</option>
                  <option value="Other">Other</option>
                </select>
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
                <label className="text-sm font-medium">Description</label>
                <input
                  name="description"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  placeholder="Details of expense..."
                />
              </div>
              <SheetFooter className="mt-6">
                <SheetClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </SheetClose>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Expense"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Summary Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-slate-50 border-slate-200 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center justify-between">
              Total Buy / Outflow <Wallet className="h-4 w-4 text-slate-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-slate-900">
              ₹
              {totalOutflow.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              All categories (0% double-count)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50/70 border-orange-200 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-orange-800 flex items-center justify-between">
              Labour Wages <HardHat className="h-4 w-4 text-orange-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-orange-700">
              ₹
              {totalLabour.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-orange-600 mt-1">
              Dedicated labour spend
            </p>
          </CardContent>
        </Card>

        <Card className="bg-red-50/70 border-red-200 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-red-800 flex items-center justify-between">
              Petty Cash <Receipt className="h-4 w-4 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-red-700">
              ₹
              {totalPettyCash.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-red-600 mt-1">General site expenses</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/70 border-blue-200 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-blue-800 flex items-center justify-between">
              Materials Issued <Package className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-blue-700">
              ₹
              {totalMaterials.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-blue-600 mt-1">Assigned stock value</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/70 border-amber-200 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-800 flex items-center justify-between">
              Vendor Payments <Store className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-700">
              ₹
              {totalVendor.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-amber-600 mt-1">Project vendor bills</p>
          </CardContent>
        </Card>
      </div>

      {/* Categorized Line Item Tables */}
      <Tabs defaultValue="labour" className="w-full space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1.5 rounded-lg justify-start">
          <TabsTrigger
            value="labour"
            className="flex items-center gap-2 py-2 px-4 max-sm:text-xs h-10 min-w-[140px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-700"
          >
            <HardHat className="h-4 w-4 text-orange-600" />
            <span>Labour (Wages)</span>
            <Badge
              variant="secondary"
              className="ml-1 text-xs bg-orange-100 text-orange-800"
            >
              {labourEntries.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="petty_cash"
            className="flex items-center gap-2 py-2 px-4 max-sm:text-xs h-10 min-w-[140px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-red-700"
          >
            <Receipt className="h-4 w-4 text-red-600" />
            <span>General Site Expenses</span>
            <Badge
              variant="secondary"
              className="ml-1 text-xs bg-red-100 text-red-800"
            >
              {expenses.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="materials"
            className="flex items-center gap-2 py-2 px-4 max-sm:text-xs h-10 min-w-[140px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700"
          >
            <Package className="h-4 w-4 text-blue-600" />
            <span>Materials Issued</span>
            <Badge
              variant="secondary"
              className="ml-1 text-xs bg-blue-100 text-blue-800"
            >
              {materials.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="vendor"
            className="flex items-center gap-2 py-2 px-4 max-sm:text-xs h-10 min-w-[140px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-amber-700"
          >
            <Store className="h-4 w-4 text-amber-600" />
            <span>Vendor Transactions</span>
            <Badge
              variant="secondary"
              className="ml-1 text-xs bg-amber-100 text-amber-800"
            >
              {vendorTxns.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* LABOUR TAB CONTENT */}
        <TabsContent value="labour" className="m-0 space-y-3">
          {/* Mobile & Tablet Stacked Cards (below lg breakpoint) */}
          <div className="lg:hidden space-y-3.5">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
                Loading labour wages...
              </div>
            ) : labourEntries.length === 0 ? (
              <div className="text-center py-12 border rounded-xl bg-white p-4 shadow-sm">
                <HardHat className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
                <p className="text-muted-foreground text-sm font-medium">
                  No daily labour entries recorded for this project yet.
                </p>
              </div>
            ) : (
              labourEntries.map((l) => {
                const spend = Number(l.headcount) * Number(l.wageRate);
                return (
                  <div
                    key={l.id}
                    className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                      <span className="font-bold text-slate-900 text-base block break-words">
                        {l.workerType?.name || l.title || "General Labour"}
                      </span>
                      <span className="text-xs font-medium text-slate-500 shrink-0">
                        {new Date(l.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-0.5">
                        Contractor / Brought By
                      </span>
                      <span className="font-medium text-slate-800 text-sm">
                        {l.contractor?.name || (
                          <span className="italic text-slate-400 font-normal">
                            Direct / Unspecified
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="bg-slate-50/80 rounded-lg p-2 flex flex-col justify-center border border-slate-100/80">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold">
                          Headcount & Rate
                        </span>
                        <span className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                          {l.headcount} @ ₹
                          {Number(l.wageRate).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="bg-orange-50/70 rounded-lg p-2 flex flex-col justify-center border border-orange-100/80 text-right">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold">
                          Total Wage Outflow
                        </span>
                        <span className="font-mono font-bold text-orange-700 text-sm sm:text-base mt-0.5">
                          ₹
                          {spend.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (lg breakpoint and above) */}
          <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
            <Table className="min-w-[700px]">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[130px] font-semibold">
                    Date
                  </TableHead>
                  <TableHead className="font-semibold">
                    Worker Type / Role
                  </TableHead>
                  <TableHead className="font-semibold">
                    Brought By / Contractor
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Headcount x Rate
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Total Wage Outflow
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-muted-foreground"
                    >
                      Loading labour wages...
                    </TableCell>
                  </TableRow>
                ) : labourEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <HardHat className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-20" />
                      <p className="text-muted-foreground font-medium">
                        No daily labour entries recorded for this project yet.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Log labour under the Daily Labour tab to view wage spend
                        here.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  labourEntries.map((l) => {
                    const spend = Number(l.headcount) * Number(l.wageRate);
                    return (
                      <TableRow key={l.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium whitespace-nowrap">
                          {new Date(l.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900">
                          {l.workerType?.name || l.title || "General Labour"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {l.contractor?.name || (
                            <span className="italic text-muted-foreground">
                              Direct / Unspecified
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {l.headcount} @ ₹
                          {Number(l.wageRate).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-orange-700 font-bold">
                          ₹
                          {spend.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* PETTY CASH TAB CONTENT */}
        <TabsContent value="petty_cash" className="m-0 space-y-3">
          {/* Mobile & Tablet Stacked Cards (below lg breakpoint) */}
          <div className="lg:hidden space-y-3.5">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
                Loading expenses...
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12 border rounded-xl bg-white p-4 shadow-sm">
                <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
                <p className="text-muted-foreground text-sm font-medium">
                  No petty cash expenses recorded yet.
                </p>
              </div>
            ) : (
              expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                    <span className="font-bold text-slate-900 text-base block break-words">
                      {exp.category}
                    </span>
                    <span className="text-xs font-medium text-slate-500 shrink-0">
                      {new Date(exp.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 break-words">
                    {exp.description || (
                      <span className="text-slate-400 italic font-normal text-xs">
                        No description provided
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                      Expense Amount
                    </span>
                    <span className="font-mono font-bold text-red-600 text-base">
                      ₹
                      {Number(exp.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View (lg breakpoint and above) */}
          <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
            <Table className="min-w-[600px]">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[130px] font-semibold">
                    Date
                  </TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="text-right font-semibold">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-10 text-muted-foreground"
                    >
                      Loading expenses...
                    </TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">
                      <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-20" />
                      <p className="text-muted-foreground font-medium">
                        No petty cash expenses recorded yet.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use the Log Petty Cash Expense button above to add
                        entries.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((exp) => (
                    <TableRow key={exp.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium whitespace-nowrap">
                        {new Date(exp.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {exp.category}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {exp.description || (
                          <span className="text-muted-foreground italic">
                            No description
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600 font-bold">
                        ₹
                        {Number(exp.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* MATERIALS TAB CONTENT */}
        <TabsContent value="materials" className="m-0 space-y-3">
          {/* Mobile & Tablet Stacked Cards (below lg breakpoint) */}
          <div className="lg:hidden space-y-3.5">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
                Loading inventory...
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-12 border rounded-xl bg-white p-4 shadow-sm">
                <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
                <p className="text-muted-foreground text-sm font-medium">
                  No materials issued to this site yet.
                </p>
              </div>
            ) : (
              materials.map((m) => {
                const value = Number(m.qtyIssued) * Number(m.item.unitCost);
                return (
                  <div
                    key={m.id}
                    className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                      <span className="font-bold text-slate-900 text-base block break-words">
                        {m.item.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold bg-slate-50 shrink-0"
                      >
                        {m.item.unit}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="bg-slate-50/80 rounded-lg p-2.5 flex flex-col justify-center border border-slate-100/80">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold">
                          Qty & Unit Cost
                        </span>
                        <span className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                          {Number(m.qtyIssued).toLocaleString()} @ ₹
                          {Number(m.item.unitCost).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="bg-blue-50/70 rounded-lg p-2.5 flex flex-col justify-center border border-blue-100/80 text-right">
                        <span className="text-slate-500 text-[10px] uppercase font-semibold">
                          Estimated Value
                        </span>
                        <span className="font-mono font-bold text-blue-700 text-sm sm:text-base mt-0.5">
                          ₹
                          {value.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (lg breakpoint and above) */}
          <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
            <Table className="min-w-[650px]">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[220px] font-semibold">
                    Item Name
                  </TableHead>
                  <TableHead className="font-semibold">Unit</TableHead>
                  <TableHead className="text-right font-semibold">
                    Quantity Issued
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Unit Cost
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Total Estimated Value
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-muted-foreground"
                    >
                      Loading inventory...
                    </TableCell>
                  </TableRow>
                ) : materials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <Package className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-20" />
                      <p className="text-muted-foreground font-medium">
                        No materials issued to this site yet.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Issue stock under Project Inventory to populate this
                        view.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  materials.map((m) => {
                    const value = Number(m.qtyIssued) * Number(m.item.unitCost);
                    return (
                      <TableRow key={m.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                          {m.item.name}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {m.item.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {Number(m.qtyIssued).toLocaleString()} {m.item.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          ₹
                          {Number(m.item.unitCost).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-700 font-bold">
                          ₹
                          {value.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* VENDOR TAB CONTENT */}
        <TabsContent value="vendor" className="m-0 space-y-3">
          {/* Mobile & Tablet Stacked Cards (below lg breakpoint) */}
          <div className="lg:hidden space-y-3.5">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
                Loading vendor transactions...
              </div>
            ) : vendorTxns.length === 0 ? (
              <div className="text-center py-12 border rounded-xl bg-white p-4 shadow-sm">
                <Store className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-30" />
                <p className="text-muted-foreground text-sm font-medium">
                  No direct vendor transactions assigned to this project.
                </p>
              </div>
            ) : (
              vendorTxns.map((v) => (
                <div
                  key={v.id}
                  className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                    <span className="font-bold text-slate-900 text-base block break-words">
                      {v.contact.name}
                    </span>
                    <span className="text-xs font-medium text-slate-500 shrink-0">
                      {new Date(v.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-700 text-sm font-medium break-words">
                      {v.description || (
                        <span className="text-slate-400 italic font-normal">
                          No description provided
                        </span>
                      )}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        v.type === "PURCHASE"
                          ? "border-amber-500 font-bold text-amber-700 bg-amber-50 shrink-0"
                          : "border-emerald-500 font-bold text-emerald-700 bg-emerald-50 shrink-0"
                      }
                    >
                      {v.type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                      Transaction Amount
                    </span>
                    <span className="font-mono text-amber-700 font-bold text-base">
                      ₹
                      {Number(v.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View (lg breakpoint and above) */}
          <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
            <Table className="min-w-[650px]">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[130px] font-semibold">
                    Date
                  </TableHead>
                  <TableHead className="font-semibold">Vendor Name</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="text-right font-semibold">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-muted-foreground"
                    >
                      Loading vendor transactions...
                    </TableCell>
                  </TableRow>
                ) : vendorTxns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <Store className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-20" />
                      <p className="text-muted-foreground font-medium">
                        No direct vendor transactions assigned to this project.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Assign vendor purchases/payments to this project in
                        Vendor ledgers.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  vendorTxns.map((v) => (
                    <TableRow key={v.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium whitespace-nowrap">
                        {new Date(v.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {v.contact.name}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={
                            v.type === "PURCHASE"
                              ? "border-amber-500 text-amber-700 bg-amber-50"
                              : "border-emerald-500 text-emerald-700 bg-emerald-50"
                          }
                        >
                          {v.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {v.description || (
                          <span className="text-muted-foreground italic">
                            No description
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-amber-700 font-bold">
                        ₹
                        {Number(v.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
