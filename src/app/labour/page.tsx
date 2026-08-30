"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, IndianRupee } from "lucide-react";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";
import { useApiResource } from "@/hooks/useApiResource";
import { PageShell } from "@/components/ui/page-shell";
import { PageHeader } from "@/components/ui/page-header";
import { LabourMobileList } from "./LabourMobileList";
import { LabourDesktopTable } from "./LabourDesktopTable";
import type {
  DailyLabourFlatRow,
  DailyLabourGroupedRow,
} from "@/lib/queries/report-queries";

type ProjectOption = { id: string; name: string };
type WorkerTypeOption = { id: string; name?: string; workerType?: string };

// GET /api/daily-labour returns either the flat row shape or one of the
// grouped-by shapes depending on `groupBy` — merged here (all fields
// optional) since the table/list views branch on `groupBy` at render time
// to pick which fields to read.
export type LabourRow = Partial<DailyLabourFlatRow> &
  Partial<DailyLabourGroupedRow> & {
    // Read defensively in LabourMobileList/LabourDesktopTable's contractor
    // fallback (`row.contractorName || row.broughtBy`) but never actually
    // returned by the API — pre-existing dead fallback, preserved as-is.
    broughtBy?: string;
  };

export default function LabourLedgerPage() {
  // Filters
  const [datePreset, setDatePreset] = useState("THIS_MONTH");
  // Only used for the CUSTOM preset's manual date inputs; THIS_MONTH/
  // LAST_MONTH/ALL_TIME derive their dates below via useMemo instead.
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [projectId, setProjectId] = useState("ALL");
  const [workerType, setWorkerType] = useState("ALL");
  const [groupBy, setGroupBy] = useState("NONE"); // NONE, date, workerType, project

  // Options
  const { data: projectsData } = useApiResource<ProjectOption[]>("/api/projects");
  const { data: workerTypesData } =
    useApiResource<WorkerTypeOption[]>("/api/worker-types");
  const projects = projectsData || [];
  const workerTypes = workerTypesData || [];

  // Derived purely from datePreset for the three fixed presets. CUSTOM is
  // excluded here and instead reads from customStartDate/customEndDate
  // state below, so this memo never overrides a user's manual entry.
  const presetDates = useMemo(() => {
    const now = new Date();
    if (datePreset === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: firstDay.toISOString().split("T")[0],
        endDate: lastDay.toISOString().split("T")[0],
      };
    }
    if (datePreset === "LAST_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: firstDay.toISOString().split("T")[0],
        endDate: lastDay.toISOString().split("T")[0],
      };
    }
    return { startDate: "", endDate: "" }; // ALL_TIME (and unused for CUSTOM)
  }, [datePreset]);

  const startDate =
    datePreset === "CUSTOM" ? customStartDate : presetDates.startDate;
  const endDate =
    datePreset === "CUSTOM" ? customEndDate : presetDates.endDate;

  // Switching directly from a fixed preset into CUSTOM inherits whatever
  // date range was active a moment ago (matching the old shared-state
  // behavior), instead of starting the CUSTOM inputs blank.
  const handleDatePresetChange = (nextPreset: string) => {
    if (nextPreset === "CUSTOM" && datePreset !== "CUSTOM") {
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
    }
    setDatePreset(nextPreset);
  };

  // Only fetch if custom dates are ready, or if using preset
  const labourUrl =
    datePreset === "CUSTOM" && (!startDate || !endDate)
      ? null
      : (() => {
          let url = `/api/daily-labour?limit=1000`; // High limit for flat list since pagination isn't strictly requested in UI yet, just API
          if (startDate) url += `&startDate=${startDate}`;
          if (endDate) url += `&endDate=${endDate}`;
          if (projectId !== "ALL") url += `&projectId=${projectId}`;
          if (workerType !== "ALL") url += `&workerType=${workerType}`;
          if (groupBy !== "NONE") url += `&groupBy=${groupBy}`;
          return url;
        })();

  const { data: labourResult, loading } = useApiResource<{
    data: LabourRow[];
    summary: { totalHeadcount: number; totalSpend: number; entryCount: number };
  }>(labourUrl);

  const data = labourResult?.data || [];
  const summary = labourResult?.summary || {
    totalHeadcount: 0,
    totalSpend: 0,
    entryCount: 0,
  };

  const formatCurrency = (val: number | undefined) => {
    return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <PageShell>
      <PageHeader
        wrapperClassName="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        titleAs="h2"
        title="Labour Ledger"
        subtitle="Cross-project daily labour spend and aggregates."
        subtitleClassName="text-muted-foreground mt-1"
        action={
          <DownloadPdfButton
            reportType="labour_report"
            params={{ startDate, endDate, projectId, workerType, groupBy }}
            buttonText="Export Labour Report"
            className="self-start sm:self-center"
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Headcount
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {summary.totalHeadcount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {summary.entryCount} selected entries
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(summary.totalSpend)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total wage cost for active filters
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
        <div className="grid grid-cols-2 md:flex flex-col sm:flex-row gap-4 flex-wrap items-start">
          <div className="space-y-1">
            <label className="block text-xs max-sm:text-sm font-medium text-slate-500">
              Date Range
            </label>
            <select
              className="flex h-9 w-full md:w-40 max-sm:w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={datePreset}
              onChange={(e) => handleDatePresetChange(e.target.value)}
            >
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="ALL_TIME">All Time</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {datePreset === "CUSTOM" && (
            <>
              <div className="space-y-1">
                <label className="block text-xs max-sm:text-sm font-medium text-slate-500">
                  Start Date
                </label>
                <Input
                  type="date"
                  className="relative flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer shadow-sm"
                  value={startDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs max-sm:text-sm font-medium text-slate-500">
                  End Date
                </label>
                <Input
                  type="date"
                  className="relative flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer shadow-sm"
                  value={endDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="block text-xs max-sm:text-sm font-medium text-slate-500">
              Worker Type
            </label>
            <select
              className="flex h-9 w-40 max-sm:w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={workerType}
              onChange={(e) => setWorkerType(e.target.value)}
            >
              <option value="ALL">All Types</option>
              {workerTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.workerType}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs max-sm:text-sm font-medium text-slate-500">
              Project
            </label>
            <select
              className="flex h-9 w-full md:w-56 max-sm:w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs max-sm:text-sm font-medium text-slate-500">
              Group By
            </label>
            <select
              className="flex h-9 w-full md:w-40 max-sm:w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <option value="NONE">None (Flat List)</option>
              <option value="date">Date</option>
              <option value="workerType">Worker Type</option>
              <option value="project">Project</option>
            </select>
          </div>
        </div>

        {/* Mobile & Tablet Stacked Cards (below lg breakpoint) */}
        <LabourMobileList
          loading={loading}
          data={data}
          groupBy={groupBy}
          summary={summary}
          formatCurrency={formatCurrency}
        />

        {/* Desktop/Tablet Table View (lg breakpoint and above) */}
        <LabourDesktopTable
          loading={loading}
          data={data}
          groupBy={groupBy}
          summary={summary}
          formatCurrency={formatCurrency}
        />
      </div>
    </PageShell>
  );
}
