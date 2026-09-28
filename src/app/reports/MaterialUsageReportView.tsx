"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";
import {
  Package,
  Calendar,
  Building2,
  Search,
  RotateCcw,
  Loader2,
  TrendingUp,
  Boxes,
  IndianRupee,
  Layers,
} from "lucide-react";

export interface ProjectOption {
  id: string;
  name: string;
  location?: string | null;
}

export interface MaterialUsageRow {
  itemId: string;
  itemName: string;
  unit: string;
  unitCost: number;
  totalQtyIssued: number;
  totalValueIssued: number;
}

export interface MaterialUsageData {
  rows: MaterialUsageRow[];
  totalValue: number;
  totalItems: number;
  startDate?: string | null;
  endDate?: string | null;
}

interface MaterialUsageReportViewProps {
  projects: ProjectOption[];
  initialData: MaterialUsageData;
}

export function MaterialUsageReportView({
  projects,
  initialData,
}: MaterialUsageReportViewProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activePreset, setActivePreset] = useState<
    "all" | "this_month" | "last_30" | "custom"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [usageData, setUsageData] = useState<MaterialUsageData>(initialData);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchUsageData = useCallback(
    async (projId: string, sDate: string, eDate: string, srch: string) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (projId && projId !== "ALL") queryParams.set("projectId", projId);
        if (sDate) queryParams.set("startDate", sDate);
        if (eDate) queryParams.set("endDate", eDate);
        if (srch && srch.trim() !== "") queryParams.set("search", srch.trim());

        const res = await fetch(`/api/reports/usage?${queryParams.toString()}`);
        if (res.ok) {
          const data: MaterialUsageData = await res.json();
          setUsageData(data);
        }
      } catch (err) {
        console.error("Error fetching material usage report:", err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleProjectSelect = (val: string | null) => {
    const projId = val || "ALL";
    setSelectedProjectId(projId);
    fetchUsageData(projId, startDate, endDate, searchQuery);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartDate(val);
    setActivePreset("custom");
    fetchUsageData(selectedProjectId, val, endDate, searchQuery);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEndDate(val);
    setActivePreset("custom");
    fetchUsageData(selectedProjectId, startDate, val, searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchUsageData(selectedProjectId, startDate, endDate, val);
  };

  const handlePresetDate = (type: "all" | "this_month" | "last_30") => {
    const today = new Date();
    let s = "";
    let e = "";

    if (type === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      s = firstDay.toISOString().split("T")[0];
      e = today.toISOString().split("T")[0];
    } else if (type === "last_30") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      s = thirtyDaysAgo.toISOString().split("T")[0];
      e = today.toISOString().split("T")[0];
    }

    setStartDate(s);
    setEndDate(e);
    setActivePreset(type);
    fetchUsageData(selectedProjectId, s, e, searchQuery);
  };

  const handleResetFilters = () => {
    setSelectedProjectId("ALL");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    setActivePreset("all");
    fetchUsageData("ALL", "", "", "");
  };

  // Local rows from usageData
  const filteredRows = usageData.rows;

  // Highest consumption item
  const topItem = usageData.rows.length > 0 ? usageData.rows[0] : null;

  // PDF report params to pass to DownloadPdfButton
  const pdfParams: Record<string, string | undefined> = {};
  if (selectedProjectId && selectedProjectId !== "ALL") {
    pdfParams.projectId = selectedProjectId;
  }
  if (startDate) pdfParams.startDate = startDate;
  if (endDate) pdfParams.endDate = endDate;
  if (searchQuery.trim()) pdfParams.search = searchQuery.trim();

  return (
    <div className="space-y-6">
      {/* HEADER & DESCRIPTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Material Consumption & Inventory Usage
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Summarizes actual material consumption across projects and date
            ranges, excluding inter-project stock transfers.
          </p>
        </div>
        <div className="shrink-0">
          <DownloadPdfButton
            reportType="top_usage"
            params={pdfParams}
            buttonText="Download Usage PDF"
            variant="outline"
          />
        </div>
      </div>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <IndianRupee className="h-4 w-4" />
              Total Consumed Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              ₹{usageData.totalValue.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Issued stock total cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Boxes className="h-4 w-4" />
              Unique Items Issued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {usageData.totalItems}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Distinct materials consumed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Highest Usage Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {topItem ? topItem.itemName : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {topItem
                ? `₹${topItem.totalValueIssued.toLocaleString("en-IN")} (${topItem.totalQtyIssued} ${topItem.unit})`
                : "No usage recorded"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              Scope & Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">
              {selectedProjectId === "ALL"
                ? "All Active Projects"
                : projects.find((p) => p.id === selectedProjectId)?.name ||
                  "Selected Project"}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {startDate || endDate
                ? `${startDate || "Start"} → ${endDate || "Present"}`
                : "All-time history"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* FILTER BAR USING EXISTING UI COMPONENTS */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {/* PROJECT FILTER USING SELECT COMPONENT */}
            <div className="flex flex-col min-w-0">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 h-4 mb-1.5">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span>Select Project</span>
              </label>
              <Select
                value={selectedProjectId}
                onValueChange={handleProjectSelect}
              >
                <SelectTrigger className="w-full h-9 bg-background text-sm font-normal rounded-md px-3 border border-input shadow-none">
                  <SelectValue placeholder="All Projects">
                    {selectedProjectId === "ALL"
                      ? "All Projects"
                      : projects.find((p) => p.id === selectedProjectId)
                          ?.name || "All Projects"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Projects</SelectItem>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name} {proj.location ? `(${proj.location})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* START DATE USING INPUT COMPONENT */}
            <div className="flex flex-col min-w-0">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 h-4 mb-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>Start Date</span>
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className="h-9 w-full bg-background text-sm rounded-md px-3 border border-input shadow-none"
              />
            </div>

            {/* END DATE USING INPUT COMPONENT */}
            <div className="flex flex-col min-w-0">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 h-4 mb-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>End Date</span>
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                className="h-9 w-full bg-background text-sm rounded-md px-3 border border-input shadow-none"
              />
            </div>

            {/* SEARCH ITEM USING INPUT COMPONENT */}
            <div className="flex flex-col min-w-0">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 h-4 mb-1.5">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span>Search Material</span>
              </label>
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="Filter by item name..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="h-9 w-full bg-background text-sm pl-8 pr-3 border border-input rounded-md shadow-none"
                />
                <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* QUICK PRESETS & RESET USING BUTTON COMPONENT */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Quick Ranges:
              </span>
              <Button
                type="button"
                variant={activePreset === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetDate("all")}
                className="text-xs h-8 px-3"
              >
                All Time
              </Button>
              <Button
                type="button"
                variant={activePreset === "this_month" ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetDate("this_month")}
                className="text-xs h-8 px-3"
              >
                This Month
              </Button>
              <Button
                type="button"
                variant={activePreset === "last_30" ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetDate("last_30")}
                className="text-xs h-8 px-3"
              >
                Last 30 Days
              </Button>
            </div>

            {(selectedProjectId !== "ALL" ||
              startDate ||
              endDate ||
              searchQuery) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs h-8 px-3 flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DATA TABLE USING TABLE COMPONENT */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/40 py-3 px-4 flex flex-row items-center justify-between border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Material Consumption Breakdown ({filteredRows.length} items)
          </CardTitle>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating report...
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-center">Unit</TableHead>
                <TableHead className="text-right">Avg Unit Cost</TableHead>
                <TableHead className="text-right">Total Qty Issued</TableHead>
                <TableHead className="text-right">Total Value Issued</TableHead>
                <TableHead className="text-center w-36">% Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <Package className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm font-medium">
                      No material issues recorded for the selected filters.
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Try clearing project or date filters to view broader
                      consumption data.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row, idx) => {
                  const percentage =
                    usageData.totalValue > 0
                      ? (row.totalValueIssued / usageData.totalValue) * 100
                      : 0;

                  return (
                    <TableRow key={row.itemId || idx}>
                      <TableCell className="text-center text-xs font-mono text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {row.itemName}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {row.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        ₹{row.unitCost.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {row.totalQtyIssued.toLocaleString("en-IN")}{" "}
                        <span className="text-xs text-muted-foreground">
                          {row.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        ₹{row.totalValueIssued.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-9 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {filteredRows.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="font-bold">
                    TOTAL ({filteredRows.length} items)
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    -
                  </TableCell>
                  <TableCell className="text-right font-mono text-base font-bold">
                    ₹
                    {filteredRows
                      .reduce((sum, r) => sum + r.totalValueIssued, 0)
                      .toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
