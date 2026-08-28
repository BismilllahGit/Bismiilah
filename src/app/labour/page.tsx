"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, IndianRupee } from "lucide-react";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";
import { useApiResource } from "@/hooks/useApiResource";
import { LabourMobileList } from "./LabourMobileList";
import { LabourDesktopTable } from "./LabourDesktopTable";

export default function LabourLedgerPage() {
  // Filters
  const [datePreset, setDatePreset] = useState("THIS_MONTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [projectId, setProjectId] = useState("ALL");
  const [workerType, setWorkerType] = useState("ALL");
  const [groupBy, setGroupBy] = useState("NONE"); // NONE, date, workerType, project

  // Options
  const { data: projectsData } = useApiResource<any[]>("/api/projects");
  const { data: workerTypesData } = useApiResource<any[]>("/api/worker-types");
  const projects = projectsData || [];
  const workerTypes = workerTypesData || [];

  useEffect(() => {
    const now = new Date();
    if (datePreset === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(lastDay.toISOString().split("T")[0]);
    } else if (datePreset === "LAST_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(lastDay.toISOString().split("T")[0]);
    } else if (datePreset === "ALL_TIME") {
      setStartDate("");
      setEndDate("");
    }
  }, [datePreset]);

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
    data: any[];
    summary: { totalHeadcount: number; totalSpend: number; entryCount: number };
  }>(labourUrl);

  const data = labourResult?.data || [];
  const summary = labourResult?.summary || {
    totalHeadcount: 0,
    totalSpend: 0,
    entryCount: 0,
  };

  const formatCurrency = (val: number) => {
    return `₹${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Labour Ledger</h2>
          <p className="text-muted-foreground mt-1">
            Cross-project daily labour spend and aggregates.
          </p>
        </div>
        <DownloadPdfButton
          reportType="labour_report"
          params={{ startDate, endDate, projectId, workerType, groupBy }}
          buttonText="Export Labour Report"
          className="self-start sm:self-center"
        />
      </div>

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
              onChange={(e) => setDatePreset(e.target.value)}
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
                  onChange={(e) => setStartDate(e.target.value)}
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
                  onChange={(e) => setEndDate(e.target.value)}
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
    </div>
  );
}
