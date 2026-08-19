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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Plus } from "lucide-react";

export default function WageRatesSettingsPage() {
  const [presets, setPresets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [editingValues, setEditingValues] = useState<Record<string, string>>(
    {},
  );
  const [editingCycles, setEditingCycles] = useState<Record<string, string>>(
    {},
  );

  // New worker type state
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeRate, setNewTypeRate] = useState("");
  const [newTypeCycle, setNewTypeCycle] = useState("WEEKLY");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const res = await fetch("/api/worker-types");
      if (res.ok) {
        const data = await res.json();
        data.sort((a: any, b: any) =>
          (a.workerType || a.name).localeCompare(b.workerType || b.name),
        );
        setPresets(data);
        const ev: Record<string, string> = {};
        const ec: Record<string, string> = {};
        data.forEach((d: any) => {
          const typeName = d.workerType || d.name;
          ev[typeName] = d.defaultRate?.toString() || "0";
          ec[typeName] = d.paymentCycle || "WEEKLY";
        });
        setEditingValues(ev);
        setEditingCycles(ec);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (workerType: string) => {
    const val = editingValues[workerType];
    const cycle = editingCycles[workerType] || "WEEKLY";
    if (!val || isNaN(Number(val)) || Number(val) < 0) {
      alert("Please enter a valid positive number for rate");
      return;
    }

    setSavingMap((prev) => ({ ...prev, [workerType]: true }));
    try {
      const res = await fetch(`/api/worker-types/${workerType}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultRate: Number(val), paymentCycle: cycle }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save.");
      }
    } catch (e) {
      alert("Error saving.");
    } finally {
      setSavingMap((prev) => ({ ...prev, [workerType]: false }));
    }
  };

  const handleCreateNewType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) {
      alert("Please enter a worker type name");
      return;
    }
    const rateVal = Number(newTypeRate || 0);
    if (isNaN(rateVal) || rateVal < 0) {
      alert("Rate must be a positive number");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/worker-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTypeName.trim(),
          defaultRate: rateVal,
          paymentCycle: newTypeCycle,
        }),
      });
      if (res.ok) {
        setNewTypeName("");
        setNewTypeRate("");
        setNewTypeCycle("WEEKLY");
        fetchPresets();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create worker type");
      }
    } catch (err) {
      alert("An error occurred while creating worker type.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Worker Types & Wage Rates
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure daily wage rates and payment cycles (Daily vs Weekly) for
            each worker category.
          </p>
        </div>
        <Button
          onClick={() => {
            const input = document.getElementById("new-type-name-input");
            if (input) {
              input.scrollIntoView({ behavior: "smooth", block: "center" });
              input.focus();
            }
          }}
          className="bg-primary hover:bg-primary/90 text-white shadow-sm shrink-0 flex items-center gap-2 font-semibold px-4 py-2"
        >
          <Plus className="h-4 w-4" />
          Add New Worker Type
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm bg-slate-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-slate-900">
            Administrative Bulk Creation
          </CardTitle>
          <CardDescription className="text-xs">
            Directly create new official categories of trade or labour to be
            made immediately available in project logs and daily entry forms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleCreateNewType}
            className="flex flex-col sm:flex-row gap-4 items-end"
          >
            <div className="flex-1 space-y-1 w-full">
              <label className="text-xs font-semibold text-slate-700">
                Worker Type Name *
              </label>
              <Input
                id="new-type-name-input"
                placeholder="e.g. Tiles Mason, Bar Bender, Steel Fixer"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                required
                className="bg-white h-9"
              />
            </div>
            <div className="w-full sm:w-[160px] space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Default Rate (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="font-mono bg-white h-9"
                value={newTypeRate}
                onChange={(e) => setNewTypeRate(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[160px] space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Payment Cycle
              </label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={newTypeCycle}
                onChange={(e) => setNewTypeCycle(e.target.value)}
              >
                <option value="WEEKLY">Weekly</option>
                <option value="DAILY">Daily</option>
              </select>
            </div>
            <Button
              type="submit"
              disabled={creating}
              className="w-full sm:w-auto font-medium shadow-xs"
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-4 w-4" />
              )}
              Add New Worker Type
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured Types & Rates</CardTitle>
          <CardDescription>
            These settings pre-fill the Daily Labour form. Selecting a DAILY
            cycle trade (like Helper) defaults "Paid on Spot" to checked; WEEKLY
            trades default to unchecked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile & Tablet Cards View (below lg breakpoint) */}
          <div className="lg:hidden space-y-3.5">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
                Loading worker types...
              </div>
            ) : (
              presets.map((preset) => {
                const typeName = preset.workerType || preset.name;
                const isSaving = savingMap[typeName];
                return (
                  <div
                    key={typeName}
                    className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <h3 className="font-bold text-slate-900 text-base break-words">
                        {typeName}
                      </h3>
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold bg-slate-50"
                      >
                        {editingCycles[typeName] ?? "WEEKLY"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                          Daily Rate (₹)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full font-mono font-semibold text-slate-900 h-10 text-sm shadow-sm"
                          value={editingValues[typeName] ?? ""}
                          onChange={(e) =>
                            setEditingValues((prev) => ({
                              ...prev,
                              [typeName]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave(typeName);
                          }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                          Payment Cycle
                        </label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm font-medium text-slate-800 shadow-sm"
                          value={editingCycles[typeName] ?? "WEEKLY"}
                          onChange={(e) => {
                            const newCycle = e.target.value;
                            setEditingCycles((prev) => ({
                              ...prev,
                              [typeName]: newCycle,
                            }));
                          }}
                        >
                          <option value="WEEKLY">Weekly</option>
                          <option value="DAILY">Daily</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <Button
                        onClick={() => handleSave(typeName)}
                        disabled={isSaving}
                        size="sm"
                        className="w-full font-bold bg-green-600 hover:bg-green-700 text-white h-9 shadow-sm"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Check className="h-4 w-4 mr-1.5" />
                        )}
                        {isSaving ? "Saving..." : "Save Rate & Cycle"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (lg breakpoint and above) */}
          <div className="hidden lg:block rounded-xl border bg-white shadow-sm overflow-hidden">
            <Table className="min-w-[600px]">
              <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                <TableRow>
                  <TableHead className="w-[240px] font-semibold text-slate-700">
                    Worker Type
                  </TableHead>
                  <TableHead className="w-[220px] font-semibold text-slate-700">
                    Default Daily Rate (₹)
                  </TableHead>
                  <TableHead className="w-[180px] font-semibold text-slate-700">
                    Payment Cycle
                  </TableHead>
                  <TableHead className="w-[120px] text-right font-semibold text-slate-700">
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
                      Loading worker types...
                    </TableCell>
                  </TableRow>
                ) : (
                  presets.map((preset) => {
                    const typeName = preset.workerType || preset.name;
                    return (
                      <TableRow
                        key={typeName}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <TableCell className="font-semibold text-slate-800">
                          {typeName}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="max-w-[150px] font-mono font-semibold"
                            value={editingValues[typeName] ?? ""}
                            onChange={(e) =>
                              setEditingValues((prev) => ({
                                ...prev,
                                [typeName]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(typeName);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            className="flex h-9 w-[140px] rounded-md border border-input bg-transparent px-2.5 py-1 text-sm font-medium text-slate-700 shadow-sm"
                            value={editingCycles[typeName] ?? "WEEKLY"}
                            onChange={(e) => {
                              const newCycle = e.target.value;
                              setEditingCycles((prev) => ({
                                ...prev,
                                [typeName]: newCycle,
                              }));
                            }}
                          >
                            <option value="WEEKLY">Weekly</option>
                            <option value="DAILY">Daily</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSave(typeName)}
                            disabled={savingMap[typeName]}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50/80 font-semibold"
                          >
                            {savingMap[typeName] ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Check className="h-4 w-4 mr-1" />
                            )}
                            {savingMap[typeName] ? "" : "Save"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
