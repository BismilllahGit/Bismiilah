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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, IndianRupee } from "lucide-react";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";
import { Badge } from "@/components/ui/badge";

export default function LabourLedgerPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalHeadcount: 0,
    totalSpend: 0,
    entryCount: 0,
  });

  // Filters
  const [datePreset, setDatePreset] = useState("THIS_MONTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [projectId, setProjectId] = useState("ALL");
  const [workerType, setWorkerType] = useState("ALL");
  const [groupBy, setGroupBy] = useState("NONE"); // NONE, date, workerType, project

  // Options
  const [projects, setProjects] = useState<any[]>([]);
  const [workerTypes, setWorkerTypes] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/worker-types").then((r) => r.json()),
    ])
      .then(([projData, presetsData]) => {
        setProjects(projData);
        // Store the full objects so we have access to the IDs
        setWorkerTypes(presetsData);
      })
      .catch(console.error);
  }, []);

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

  useEffect(() => {
    // Only fetch if custom dates are ready, or if using preset
    if (datePreset === "CUSTOM" && (!startDate || !endDate)) return;

    setLoading(true);
    let url = `/api/daily-labour?limit=1000`; // High limit for flat list since pagination isn't strictly requested in UI yet, just API

    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (projectId !== "ALL") url += `&projectId=${projectId}`;
    if (workerType !== "ALL") url += `&workerType=${workerType}`;
    if (groupBy !== "NONE") url += `&groupBy=${groupBy}`;

    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        setData(res.data || []);
        setSummary(
          res.summary || { totalHeadcount: 0, totalSpend: 0, entryCount: 0 },
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [startDate, endDate, projectId, workerType, groupBy, datePreset]);

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
        <div className="lg:hidden space-y-3.5">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
              Loading labour records...
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm font-medium">
              No labour entries found for this filter.
            </div>
          ) : (
            <>
              <div className="space-y-3.5">
                {data.map((row: any, i: number) => (
                  <div
                    key={row.id || i}
                    className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
                  >
                    {groupBy === "NONE" ? (
                      <>
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 text-base block break-words">
                              {row.projectName}
                            </span>
                            <span className="text-xs font-medium text-slate-500 block">
                              {new Date(row.date).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase shrink-0">
                            {row.voucherNumber || "VOUCHER"}
                          </span>
                        </div>
                        <div className="flex flex-row justify-between w-full">
                          <div className="space-y-1 text-xs flex flex-col">
                            <div className="font-bold text-slate-800 text-sm">
                              {row.workerType}
                            </div>
                            {row.title && (
                              <div className="text-slate-600 font-medium">
                                {row.title}
                              </div>
                            )}
                            {(row.contractorName || row.broughtBy) && (
                              <div className="text-slate-500 font-medium text-[11px]">
                                Contractor:{" "}
                                <span className="text-slate-700 font-semibold">
                                  {row.contractorName || row.broughtBy}
                                </span>
                              </div>
                            )}
                          </div>
                          {row.paidImmediately && (
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
                          <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-start">
                            <span className="text-slate-500 text-[10px] uppercase font-semibold">
                              Headcount
                            </span>
                            <span className="font-mono font-semibold text-slate-700 text-sm mt-0.5 flex flex-1 items-center justify-center">
                              {row.headcount} Workers
                            </span>
                          </div>
                          <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-start">
                            <span className="text-slate-500 text-[10px] uppercase font-semibold">
                              Wage Rate
                            </span>
                            <span className="font-mono font-semibold text-slate-700 text-sm mt-0.5 flex flex-1 items-center justify-center">
                              {formatCurrency(row.wageRate)}
                            </span>
                          </div>
                          <div className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/80 flex flex-col justify-start">
                            <span className="text-slate-500 text-[10px] uppercase font-semibold">
                              Total
                            </span>
                            <span className="font-mono font-bold text-slate-700 text-sm mt-0.5 flex flex-1 items-center justify-center">
                              {formatCurrency(row.totalSpend)}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                          <span className="font-bold text-slate-900 text-base break-words">
                            {groupBy === "date"
                              ? new Date(row.date).toLocaleDateString()
                              : groupBy === "workerType"
                                ? row.workerType
                                : row.projectName}
                          </span>
                          <span className="font-mono font-bold text-green-600 text-base shrink-0">
                            {formatCurrency(row.totalSpend)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 pt-0.5 flex justify-between items-center">
                          <span className="font-semibold text-slate-500 uppercase text-[11px]">
                            Total Headcount
                          </span>
                          <span className="font-mono font-bold text-slate-900 text-sm bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                            {row.totalHeadcount} Workers
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Pinned Total Summary Card */}
              <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-800">
                <div className="flex items-center justify-between sm:justify-start gap-4">
                  <span className="uppercase text-xs font-bold tracking-wider text-slate-300">
                    Total Workers
                  </span>
                  <span className="font-mono text-base font-bold text-blue-400">
                    {summary.totalHeadcount}
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-800 sm:border-0 pt-2 sm:pt-0">
                  <span className="uppercase text-xs font-bold tracking-wider text-slate-300">
                    Total Spend
                  </span>
                  <span className="font-mono text-lg sm:text-xl font-bold text-emerald-400">
                    {formatCurrency(summary.totalSpend)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Desktop/Tablet Table View (lg breakpoint and above) */}
        <div className="hidden lg:block rounded-xl border bg-white shadow-sm overflow-hidden">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-slate-50">
              <TableRow>
                {groupBy === "NONE" && (
                  <>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Worker Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Headcount</TableHead>
                    <TableHead className="text-right">Wage Rate</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                  </>
                )}
                {groupBy === "date" && (
                  <>
                    <TableHead className="w-[140px]">Date</TableHead>
                    <TableHead className="text-right">
                      Total Headcount
                    </TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                  </>
                )}
                {groupBy === "workerType" && (
                  <>
                    <TableHead className="w-[180px]">Worker Type</TableHead>
                    <TableHead className="text-right">
                      Total Headcount
                    </TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                  </>
                )}
                {groupBy === "project" && (
                  <>
                    <TableHead className="w-[180px]">Project</TableHead>
                    <TableHead className="text-right">
                      Total Headcount
                    </TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No labour entries found for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row: any, i) => (
                  <TableRow key={row.id || i} className="hover:bg-slate-50/50">
                    {groupBy === "NONE" && (
                      <>
                        <TableCell className="whitespace-nowrap font-medium">
                          {new Date(row.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.projectName}
                        </TableCell>
                        <TableCell>
                          {row.workerType}
                          <div className="text-[10px] text-muted-foreground uppercase">
                            {row.voucherNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {row.title || "-"}
                          </div>
                          {(row.contractorName || row.broughtBy) && (
                            <div className="text-xs text-muted-foreground">
                              Contractor: {row.contractorName || row.broughtBy}
                            </div>
                          )}
                          {row.paidImmediately && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-medium mt-1"
                            >
                              Paid on Spot
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.headcount}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(row.wageRate)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(row.totalSpend)}
                        </TableCell>
                      </>
                    )}

                    {groupBy === "date" && (
                      <>
                        <TableCell className="font-medium whitespace-nowrap">
                          {new Date(row.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.totalHeadcount}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(row.totalSpend)}
                        </TableCell>
                      </>
                    )}

                    {groupBy === "workerType" && (
                      <>
                        <TableCell className="font-medium">
                          {row.workerType}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.totalHeadcount}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(row.totalSpend)}
                        </TableCell>
                      </>
                    )}

                    {groupBy === "project" && (
                      <>
                        <TableCell className="font-medium">
                          {row.projectName}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.totalHeadcount}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(row.totalSpend)}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
            {!loading && data.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t">
                <TableRow>
                  <TableCell className="text-right uppercase text-xs tracking-wider">
                    Total
                  </TableCell>
                  {groupBy === "NONE" && (
                    <TableCell colSpan={3} className="bg-slate-50"></TableCell>
                  )}
                  <TableCell className="text-right font-mono">
                    {summary.totalHeadcount}
                  </TableCell>
                  {groupBy === "NONE" && <TableCell></TableCell>}
                  <TableCell className="text-right font-mono">
                    {formatCurrency(summary.totalSpend)}
                  </TableCell>
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>
      </div>
    </div>
  );
}
