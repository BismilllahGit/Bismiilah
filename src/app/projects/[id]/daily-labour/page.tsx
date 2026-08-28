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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApiResource, useApiMutation } from "@/hooks/useApiResource";

type EntryRow = {
  id: string;
  workerType: string;
  headcount: string;
  wageRate: string;
  contractorId: string;
  paidImmediately: boolean;
  title: string;
  customTypeName?: string;
  creatingCustom?: boolean;
};

export default function DailyLabourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formDate, setFormDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [formRows, setFormRows] = useState<EntryRow[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  const { data: presetsData, refetch: refetchPresets } = useApiResource<any[]>(
    "/api/worker-types",
  );
  const { data: contractorsRaw } = useApiResource<any[]>("/api/contacts");
  const contractors = (contractorsRaw || []).filter(
    (c: any) => c.type === "LABOUR_CONTRACTOR",
  );

  const {
    data: entriesResult,
    loading,
    refetch: refetchEntries,
  } = useApiResource<{
    data: any[];
    summary: { totalHeadcount: number; totalSpend: number };
  }>(
    projectId
      ? `/api/projects/${projectId}/daily-labour?startDate=${date}&endDate=${date}&limit=1000`
      : null,
  );
  const entries = entriesResult?.data || [];
  const summary = entriesResult?.summary || {
    totalHeadcount: 0,
    totalSpend: 0,
  };

  const [presets, setPresets] = useState<
    Record<string, { defaultRate: number; paymentCycle: string }>
  >({});

  useEffect(() => {
    if (!presetsData) return;
    const map: Record<string, { defaultRate: number; paymentCycle: string }> =
      {};
    presetsData.forEach((d: any) => {
      const typeName = d.workerType || d.name;
      map[typeName] = {
        defaultRate: Number(d.defaultRate || 0),
        paymentCycle: d.paymentCycle || "WEEKLY",
      };
    });
    setPresets(map);
  }, [presetsData]);

  const createWorkerType = useApiMutation<any, any>("POST");
  const logDailyLabour = useApiMutation<any, any>("POST");

  const handleOpenSheet = () => {
    setFormDate(date);
    setFormRows([
      {
        id: crypto.randomUUID(),
        workerType: "",
        headcount: "",
        wageRate: "",
        contractorId: "",
        paidImmediately: false,
        title: "",
      },
    ]);
    setSuccessMessage("");
    setIsSheetOpen(true);
  };

  const addRow = () => {
    setFormRows([
      ...formRows,
      {
        id: crypto.randomUUID(),
        workerType: "",
        headcount: "",
        wageRate: "",
        contractorId: "",
        paidImmediately: false,
        title: formRows[formRows.length - 1]?.title || "", // copy title from prev
      },
    ]);
  };

  const updateRow = (id: string, field: keyof EntryRow, value: any) => {
    setFormRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          if (field === "workerType" && presets[value] !== undefined) {
            updated.wageRate = presets[value].defaultRate.toString();
            updated.paidImmediately = presets[value].paymentCycle === "DAILY";
          }
          return updated;
        }
        return row;
      }),
    );
  };

  const removeRow = (id: string) => {
    setFormRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCreateInlineWorkerType = async (rowId: string, name: string) => {
    if (!name.trim()) return;
    updateRow(rowId, "creatingCustom", true);
    try {
      const data = await createWorkerType.mutate("/api/worker-types", {
        name: name.trim(),
        defaultRate: 0,
        paymentCycle: "WEEKLY",
      });
      const createdName = data.workerType || data.name;
      // Optimistically merge into presets so this row's dropdown shows the
      // new type immediately, without waiting for the refetch below.
      setPresets((prev) => ({
        ...prev,
        [createdName]: {
          defaultRate: Number(data.defaultRate || 0),
          paymentCycle: data.paymentCycle || "WEEKLY",
        },
      }));
      setFormRows((prev) =>
        prev.map((r) => {
          if (r.id === rowId) {
            return {
              ...r,
              workerType: createdName,
              wageRate: r.wageRate || data.defaultRate?.toString() || "0",
              paidImmediately: data.paymentCycle === "DAILY",
              customTypeName: undefined,
              creatingCustom: false,
            };
          }
          return r;
        }),
      );
      refetchPresets({ silent: true });
    } catch (err: any) {
      alert(err.message || "Failed to create worker type");
      updateRow(rowId, "creatingCustom", false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage("");

    // Validate rows
    const validRows = formRows.filter(
      (r) =>
        r.workerType &&
        r.workerType !== "__OTHERS__" &&
        Number(r.headcount) > 0 &&
        Number(r.wageRate) > 0,
    );
    if (validRows.length === 0) {
      alert("Please fill at least one valid row.");
      setSaving(false);
      return;
    }

    const payload = {
      date: formDate,
      entries: validRows.map((r) => ({
        workerType: r.workerType,
        headcount: Number(r.headcount),
        wageRate: Number(r.wageRate),
        contractorId: r.contractorId || null,
        paidImmediately: r.paidImmediately,
        title: r.title || undefined,
      })),
    };

    try {
      const result = await logDailyLabour.mutate(
        `/api/projects/${projectId}/daily-labour`,
        payload,
      );
      const types = Array.from(
        new Set(payload.entries.map((e) => e.workerType)),
      );

      // e.g., "Logged 10 Masons and 6 Helpers — Total: ₹18,300 for 14 June"
      setSuccessMessage(
        `Logged ${result.totalHeadcount} workers (${types.join(", ")}) — Total: ₹${result.totalSpend.toLocaleString("en-IN")} for ${new Date(formDate).toLocaleDateString()}`,
      );

      // Immediately trigger re-fetch or date change so entries appear instantly without waiting for timeout
      if (formDate === date) {
        refetchEntries();
      } else {
        setDate(formDate); // will trigger refetch via the hook's url change
      }

      // The daily-labour endpoint can silently create a new worker type
      // on the fly (when the submitted name doesn't match an existing
      // record). Refetch presets so it shows up in the dropdown without
      // requiring a page reload.
      refetchPresets({ silent: true });

      // Automatically close after a short delay
      setTimeout(() => {
        setIsSheetOpen(false);
      }, 2000);
    } catch (error: any) {
      alert(error.message || "Failed to log daily labour.");
    } finally {
      setSaving(false);
    }
  };

  const workerTypeOptions = Object.keys(presets).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Daily Labour</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Log and track daily headcount-based labour expenses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <Button onClick={handleOpenSheet} className="gap-2">
              <Plus className="h-4 w-4" /> Log Labour
            </Button>
            <SheetContent
              side="right"
              className="w-full sm:max-w-xl overflow-y-auto p-4 lg:min-w-2xl"
            >
              <SheetHeader className="p-0">
                <SheetTitle>Log Daily Labour</SheetTitle>
                <SheetDescription>
                  Log headcounts and wage rates for multiple worker types at
                  once.
                </SheetDescription>
              </SheetHeader>

              {successMessage ? (
                <div className="mt-8 p-4 bg-muted border border-border rounded-md animate-in fade-in text-foreground">
                  <h4 className="font-semibold mb-1">Success!</h4>
                  <p className="text-sm">{successMessage}</p>
                  <p className="text-xs mt-2 opacity-75">
                    Closing automatically...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                  <div className="space-y-2 space-x-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="relative flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>

                  <div className="space-y-4">
                    {formRows.map((row) => (
                      <div
                        key={row.id}
                        // Increased gap slightly for better breathing room
                        className="grid grid-cols-12 gap-3 p-4 bg-slate-50 border rounded-md relative items-start"
                      >
                        {/* Worker Type - Full width by default, 1/3 on large screens */}
                        <div className="col-span-12 lg:col-span-4 space-y-1">
                          <label className="text-xs font-medium text-slate-500">
                            Worker Type *
                          </label>
                          <select
                            required
                            className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            value={row.workerType}
                            onChange={(e) =>
                              updateRow(row.id, "workerType", e.target.value)
                            }
                          >
                            <option value="">Select...</option>
                            {workerTypeOptions.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                            <option value="__OTHERS__">Others…</option>
                          </select>
                          {row.workerType === "__OTHERS__" && (
                            <div className="flex items-center gap-1 pt-1">
                              <Input
                                placeholder="New type name..."
                                value={row.customTypeName || ""}
                                onChange={(e) =>
                                  updateRow(
                                    row.id,
                                    "customTypeName",
                                    e.target.value,
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleCreateInlineWorkerType(
                                      row.id,
                                      row.customTypeName || "",
                                    );
                                  }
                                }}
                                className="h-8 text-xs flex-1"
                                autoFocus
                              />
                              <Button
                                type="button"
                                size="sm"
                                disabled={
                                  row.creatingCustom ||
                                  !row.customTypeName?.trim()
                                }
                                onClick={() =>
                                  handleCreateInlineWorkerType(
                                    row.id,
                                    row.customTypeName || "",
                                  )
                                }
                                className="h-8 px-2 text-xs"
                              >
                                {row.creatingCustom ? "..." : "Add"}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  updateRow(row.id, "workerType", "")
                                }
                                className="h-8 px-2 text-xs text-slate-500"
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Count - Half width by default, 1/3 on large screens */}
                        <div className="col-span-6 lg:col-span-4 space-y-1">
                          <label className="text-xs font-medium text-slate-500">
                            Count *
                          </label>
                          <Input
                            required
                            type="number"
                            min="1"
                            step="1"
                            placeholder="e.g. 5"
                            value={row.headcount}
                            onChange={(e) =>
                              updateRow(row.id, "headcount", e.target.value)
                            }
                          />
                        </div>

                        {/* Wage - Half width by default, 1/3 on large screens */}
                        <div className="col-span-6 lg:col-span-4 space-y-1">
                          <label className="text-xs font-medium text-slate-500">
                            Wage (₹) *
                          </label>
                          <Input
                            required
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="e.g. 1000"
                            value={row.wageRate}
                            onChange={(e) =>
                              updateRow(row.id, "wageRate", e.target.value)
                            }
                          />
                        </div>

                        {/* Task & Contractor wrapper */}
                        <div className="col-span-12 space-y-3 mt-2">
                          <label className="text-xs font-medium text-slate-500">
                            Task & Contractor (Optional)
                          </label>

                          {/* Changed from sm:flex-row to lg:flex-row so it stacks vertically in the narrow drawer */}
                          <div className="flex flex-col lg:flex-row gap-3">
                            <Input
                              placeholder="Task (e.g. Slab cast)"
                              value={row.title}
                              onChange={(e) =>
                                updateRow(row.id, "title", e.target.value)
                              }
                              className="flex-1 w-full"
                            />
                            <select
                              value={row.contractorId}
                              onChange={(e) =>
                                updateRow(
                                  row.id,
                                  "contractorId",
                                  e.target.value,
                                )
                              }
                              className="flex h-8 w-full flex-1 lg:w-1/3 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                            >
                              <option value="">No Contractor</option>
                              {contractors.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-start space-x-2 pt-1">
                            <input
                              type="checkbox"
                              id={`paid-${row.id}`}
                              checked={row.paidImmediately}
                              onChange={(e) =>
                                updateRow(
                                  row.id,
                                  "paidImmediately",
                                  e.target.checked,
                                )
                              }
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                            />
                            <label
                              htmlFor={`paid-${row.id}`}
                              className="text-xs font-medium text-slate-700 cursor-pointer leading-tight"
                            >
                              Paid Immediately (Settled on spot in cash, exclude
                              from contractor balance)
                            </label>
                          </div>
                        </div>

                        {/* Delete button positioned cleanly */}
                        {formRows.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute -right-2 -top-2 h-7 w-7 rounded-full border bg-background text-destructive hover:bg-destructive/10 shadow-sm"
                            onClick={() => removeRow(row.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addRow}
                    className="w-full border-dashed"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Another Row
                  </Button>

                  <SheetFooter className="pt-4 border-t mt-4">
                    <SheetClose
                      render={<Button variant="outline" type="button" />}
                    >
                      Cancel
                    </SheetClose>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Log Labour"}
                    </Button>
                  </SheetFooter>
                </form>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile & Tablet Stacked Card View (below lg breakpoint) */}
      <div className="lg:hidden space-y-3.5">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
            Loading labour entries...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm font-medium">
            No labour logged on this date.
          </div>
        ) : (
          <>
            <div className="space-y-3.5">
              {entries.map((entry: any) => (
                <div
                  key={entry.id}
                  className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <span className="font-bold text-slate-900 text-base break-words">
                      {entry.workerType}
                    </span>
                    <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase shrink-0">
                      {entry.voucherNumber || "VOUCHER"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-slate-800 break-words">
                      {entry.title || "Daily Labour"}
                    </div>
                    {(entry.contractorName || entry.broughtBy) && (
                      <div className="text-xs font-medium text-slate-500">
                        Contractor:{" "}
                        <span className="text-slate-700 font-semibold">
                          {entry.contractorName || entry.broughtBy}
                        </span>
                      </div>
                    )}
                    {entry.paidImmediately && (
                      <div className="pt-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-bold bg-green-50 text-green-700 border border-green-200"
                        >
                          Paid on Spot
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-center">
                      <span className="text-slate-500 text-[10px] uppercase font-semibold">
                        Headcount
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                        {entry.headcount} Workers
                      </span>
                    </div>
                    <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-center">
                      <span className="text-slate-500 text-[10px] uppercase font-semibold">
                        Wage Rate
                      </span>
                      <span className="font-mono font-semibold text-slate-700 text-sm mt-0.5">
                        ₹
                        {Number(entry.wageRate).toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-center">
                      <span className="text-slate-500 text-[10px] uppercase font-semibold">
                        Total Spend
                      </span>
                      <span className="font-mono font-bold text-slate-950 text-sm sm:text-base mt-0.5">
                        ₹
                        {Number(entry.totalSpend).toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pinned Day Total Card */}
            <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-800">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <span className="uppercase text-xs font-bold tracking-wider text-slate-300">
                  Day Total Workers
                </span>
                <span className="font-mono text-base font-bold text-blue-400">
                  {summary.totalHeadcount}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-800 sm:border-0 pt-2 sm:pt-0">
                <span className="uppercase text-xs font-bold tracking-wider text-slate-300">
                  Day Total Spend
                </span>
                <span className="font-mono text-lg sm:text-xl font-bold text-emerald-400">
                  ₹
                  {summary.totalSpend?.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Desktop/Tablet Table View (lg breakpoint and above) */}
      <div className="hidden lg:block border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Worker Type</TableHead>
              <TableHead>Task / Brought By</TableHead>
              <TableHead className="text-right">Headcount</TableHead>
              <TableHead className="text-right">Wage Rate (₹)</TableHead>
              <TableHead className="text-right">Total Spend (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  Loading labour entries...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  No labour logged on this date.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.workerType}
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {entry.voucherNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">
                      {entry.title || "-"}
                    </div>
                    {(entry.contractorName || entry.broughtBy) && (
                      <div className="text-xs text-muted-foreground">
                        Contractor: {entry.contractorName || entry.broughtBy}
                      </div>
                    )}
                    {entry.paidImmediately && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-medium mt-0.5"
                      >
                        Paid on Spot
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.headcount}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(entry.wageRate).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(entry.totalSpend).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!loading && entries.length > 0 && (
            <tfoot className="bg-slate-50 font-bold border-t">
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-right uppercase text-xs tracking-wider"
                >
                  Day Total
                </TableCell>
                <TableCell className="text-right">
                  {summary.totalHeadcount}
                </TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right">
                  ₹
                  {summary.totalSpend?.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
              </TableRow>
            </tfoot>
          )}
        </Table>
      </div>
    </div>
  );
}
