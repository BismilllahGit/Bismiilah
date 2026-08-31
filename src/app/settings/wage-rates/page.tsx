"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { useApiResource, useApiMutation } from "@/hooks/useApiResource";
import { WageRatesMobileList } from "./WageRatesMobileList";
import { WageRatesDesktopTable } from "./WageRatesDesktopTable";
import type { WorkerType } from "@prisma/client";

// Shape returned by GET/POST/PATCH /api/worker-types
// (src/app/api/worker-types/route.ts and its [id]/route.ts): the server
// maps WorkerType rows to plain objects with `defaultRate` converted from
// Decimal to `number`, and a `workerType` compatibility alias for `name`
// (kept for older callers/forms that key off `workerType`). `createdAt`/
// `updatedAt` (DateTime fields) arrive as ISO strings over JSON.
export type WageRatePreset = Omit<
  WorkerType,
  "defaultRate" | "createdAt" | "updatedAt"
> & {
  workerType: string;
  defaultRate: number;
  createdAt: string;
  updatedAt: string;
};

export default function WageRatesSettingsPage() {
  const {
    data: presetsData,
    loading,
    refetch,
  } = useApiResource<WageRatePreset[]>("/api/worker-types");
  const sortedPresets = useMemo(
    () =>
      [...(presetsData ?? [])].sort((a: WageRatePreset, b: WageRatePreset) =>
        (a.workerType || a.name).localeCompare(b.workerType || b.name),
      ),
    [presetsData],
  );
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [editingValues, setEditingValues] = useState<Record<string, string>>(
    {},
  );
  const [editingCycles, setEditingCycles] = useState<Record<string, string>>(
    {},
  );

  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeRate, setNewTypeRate] = useState("");
  const [newTypeCycle, setNewTypeCycle] = useState("WEEKLY");
  const [creating, setCreating] = useState(false);

  const updateWorkerType = useApiMutation<
    Record<string, unknown>,
    WageRatePreset
  >("PATCH");
  const createWorkerType = useApiMutation<
    Record<string, unknown>,
    WageRatePreset
  >("POST");

  useEffect(() => {
    if (!presetsData) return;
    const ev: Record<string, string> = {};
    const ec: Record<string, string> = {};
    presetsData.forEach((d: WageRatePreset) => {
      const typeName = d.workerType || d.name;
      ev[typeName] = d.defaultRate?.toString() || "0";
      ec[typeName] = d.paymentCycle || "WEEKLY";
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncs fetched data into locally-editable state for optimistic edits
    setEditingValues(ev);
    setEditingCycles(ec);
  }, [presetsData]);

  const handleSave = async (id: string, typeName: string) => {
    const val = editingValues[typeName];
    const cycle = editingCycles[typeName] || "WEEKLY";
    if (!val || isNaN(Number(val)) || Number(val) < 0) {
      alert("Please enter a valid positive number for rate");
      return;
    }

    setSavingMap((prev) => ({ ...prev, [typeName]: true }));
    try {
      await updateWorkerType.mutate(`/api/worker-types/${id}`, {
        defaultRate: Number(val),
        paymentCycle: cycle,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : undefined;
      alert(message || "Failed to save.");
    } finally {
      setSavingMap((prev) => ({ ...prev, [typeName]: false }));
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
      await createWorkerType.mutate("/api/worker-types", {
        name: newTypeName.trim(),
        defaultRate: rateVal,
        paymentCycle: newTypeCycle,
      });
      setNewTypeName("");
      setNewTypeRate("");
      setNewTypeCycle("WEEKLY");
      refetch({ silent: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      alert(message || "An error occurred while creating worker type.");
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
            <div className="w-full sm:w-40 space-y-1">
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
            <div className="w-full sm:w-40 space-y-1">
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
            cycle trade (like Helper) defaults &ldquo;Paid on Spot&rdquo; to
            checked; WEEKLY trades default to unchecked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile & Tablet Cards View (below lg breakpoint) */}
          <WageRatesMobileList
            loading={loading}
            sortedPresets={sortedPresets}
            savingMap={savingMap}
            editingValues={editingValues}
            setEditingValues={setEditingValues}
            editingCycles={editingCycles}
            setEditingCycles={setEditingCycles}
            handleSave={handleSave}
          />

          {/* Desktop Table View (lg breakpoint and above) */}
          <WageRatesDesktopTable
            loading={loading}
            sortedPresets={sortedPresets}
            savingMap={savingMap}
            editingValues={editingValues}
            setEditingValues={setEditingValues}
            editingCycles={editingCycles}
            setEditingCycles={setEditingCycles}
            handleSave={handleSave}
          />
        </CardContent>
      </Card>
    </div>
  );
}
