"use client";

import { useEffect, useState, use } from "react";
import { Input } from "@/components/ui/input";
import { useApiResource, useApiMutation } from "@/hooks/useApiResource";
import { DailyLabourFormSheet } from "./DailyLabourFormSheet";
import { DailyLabourMobileList } from "./DailyLabourMobileList";
import { DailyLabourDesktopTable } from "./DailyLabourDesktopTable";
import type { Contact, PaymentCycle } from "@prisma/client";
import type { DailyLabourFlatRow } from "@/lib/queries/report-queries";

export type EntryRow = {
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

// Row shape returned by GET /api/projects/[id]/daily-labour (this page never
// passes `groupBy`, so the API always returns the flat listing — see the
// flat-query branch of getDailyLabourReportData in
// src/lib/queries/report-queries.ts). `date` (a `Date` there, from the raw
// SQL row) arrives as an ISO string over JSON.
//
// `broughtBy` is NOT part of the actual API response — Desktop/Mobile
// satellites read `entry.contractorName || entry.broughtBy` as a fallback
// that has always evaluated to `undefined` at runtime under the previous
// `any` typing (pre-existing dead/vestigial code, not something this task
// should silently remove). Declared optional here, always absent, to
// preserve that existing behavior without changing it.
export type DailyLabourEntryRow = Omit<DailyLabourFlatRow, "date"> & {
  date: string;
  broughtBy?: string;
};

// Contact rows returned by GET /api/contacts (src/app/api/contacts/route.ts),
// filtered client-side to LABOUR_CONTRACTOR type. `createdAt`/`updatedAt`
// (DateTime fields) arrive as ISO strings over JSON.
export type LabourContractor = Omit<Contact, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

// Presets fetched from GET /api/worker-types (src/app/api/worker-types/route.ts).
// Only the fields this page actually reads are modeled; see WageRatePreset in
// src/app/settings/wage-rates/page.tsx for the fuller shape of that same
// endpoint's response (kept separate here so each feature stays self-contained).
type WorkerTypePreset = {
  id: string;
  name: string;
  workerType: string;
  defaultRate: number;
  paymentCycle: PaymentCycle;
};

// Response of POST /api/worker-types (src/app/api/worker-types/route.ts),
// used here only for the fields this page reads back after inline-creating
// a worker type.
type CreatedWorkerType = {
  name: string;
  workerType: string;
  defaultRate: number;
  paymentCycle: PaymentCycle;
};

// Response of POST /api/projects/[id]/daily-labour
// (src/app/api/projects/[id]/daily-labour/route.ts). `rows` isn't read by
// this page, so it's left unmodeled (`unknown[]`) rather than typed further.
type DailyLabourSubmitResult = {
  rows: unknown[];
  totalHeadcount: number;
  totalSpend: number;
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

  const { data: presetsData, refetch: refetchPresets } = useApiResource<
    WorkerTypePreset[]
  >("/api/worker-types");
  const { data: contractorsRaw } = useApiResource<LabourContractor[]>(
    "/api/contacts",
  );
  const contractors = (contractorsRaw || []).filter(
    (c: LabourContractor) => c.type === "LABOUR_CONTRACTOR",
  );

  const {
    data: entriesResult,
    loading,
    refetch: refetchEntries,
  } = useApiResource<{
    data: DailyLabourEntryRow[];
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
    presetsData.forEach((d: WorkerTypePreset) => {
      const typeName = d.workerType || d.name;
      map[typeName] = {
        defaultRate: Number(d.defaultRate || 0),
        paymentCycle: d.paymentCycle || "WEEKLY",
      };
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncs fetched data into locally-editable state for optimistic edits
    setPresets(map);
  }, [presetsData]);

  const createWorkerType = useApiMutation<
    Record<string, unknown>,
    CreatedWorkerType
  >("POST");
  const logDailyLabour = useApiMutation<
    Record<string, unknown>,
    DailyLabourSubmitResult
  >("POST");

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

  const updateRow = (
    id: string,
    field: keyof EntryRow,
    value: EntryRow[keyof EntryRow],
  ) => {
    setFormRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          // TS can't correlate the `field === "workerType"` check with
          // `value`'s type across these two separate parameters (no
          // discriminated union between them) — at runtime, callers only
          // ever pass a string for `value` when `field` is "workerType"
          // (it's always a <select>'s e.target.value). Cast preserves that
          // existing behavior; EntryRow["workerType"] is `string`.
          const workerTypeValue = value as EntryRow["workerType"];
          if (field === "workerType" && presets[workerTypeValue] !== undefined) {
            updated.wageRate = presets[workerTypeValue].defaultRate.toString();
            updated.paidImmediately =
              presets[workerTypeValue].paymentCycle === "DAILY";
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
    } catch (err) {
      const message = err instanceof Error ? err.message : undefined;
      alert(message || "Failed to create worker type");
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
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      alert(message || "Failed to log daily labour.");
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
          <DailyLabourFormSheet
            open={isSheetOpen}
            onOpenChange={setIsSheetOpen}
            onTriggerClick={handleOpenSheet}
            successMessage={successMessage}
            onSubmit={handleSubmit}
            formDate={formDate}
            onFormDateChange={setFormDate}
            formRows={formRows}
            onUpdateRow={updateRow}
            onRemoveRow={removeRow}
            onAddRow={addRow}
            workerTypeOptions={workerTypeOptions}
            contractors={contractors}
            onCreateInlineWorkerType={handleCreateInlineWorkerType}
            saving={saving}
          />
        </div>
      </div>

      {/* Mobile & Tablet Stacked Card View (below lg breakpoint) */}
      <DailyLabourMobileList entries={entries} loading={loading} summary={summary} />

      {/* Desktop/Tablet Table View (lg breakpoint and above) */}
      <DailyLabourDesktopTable entries={entries} loading={loading} summary={summary} />
    </div>
  );
}
