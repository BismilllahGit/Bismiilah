"use client";

import React, { useState, useEffect, useRef } from "react";
import { PaginationControls } from "@/components/ui/pagination";
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
  Boxes,
  IndianRupee,
  Layers,
  Store,
} from "lucide-react";

export interface ProjectOption {
  id: string;
  name: string;
  location?: string | null;
}

export interface MaterialPurchaseRow {
  id: string;
  date: string;
  voucherNumber: string;
  projectId: string;
  projectName: string;
  itemName: string;
  unit: string;
  vendorName: string | null;
  quantity: number;
  unitCost: number;
  totalAmount: number;
}

export interface MaterialPurchasesData {
  rows: MaterialPurchaseRow[];
  totalValue: number;
  totalCount: number;
  topVendor: { name: string; totalValue: number } | null;
  page: number;
  pageSize: number;
  totalPages: number;
  startDate?: string | null;
  endDate?: string | null;
}

interface MaterialPurchasesReportViewProps {
  projects: ProjectOption[];
  initialData: MaterialPurchasesData;
}

const SEARCH_DEBOUNCE_MS = 300;

// `toISOString()` converts to UTC, which shifts the date by a day for users
// ahead of/behind UTC (e.g. IST just after midnight). Format in local time.
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Purchase dates are plain calendar dates serialized as UTC midnight, so
// format the ISO string directly instead of going through a timezone.
function formatPurchaseDate(iso: string): string {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

const NAME_MAX_CHARS = 15;

// Cut long project/vendor names to a fixed length so the table stays compact;
// the full name stays available through the cell's title tooltip.
function truncateName(name: string): string {
  return name.length > NAME_MAX_CHARS
    ? `${name.slice(0, NAME_MAX_CHARS)}…`
    : name;
}

export function MaterialPurchasesReportView({
  projects,
  initialData,
}: MaterialPurchasesReportViewProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activePreset, setActivePreset] = useState<
    "all" | "this_month" | "last_30" | "custom"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [data, setData] = useState<MaterialPurchasesData>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Refetch whenever a filter or the page changes. Typing is debounced, and an
  // in-flight request is aborted when a newer one starts so a slow, stale
  // response can never overwrite fresher results.
  const isFirstRun = useRef(true);
  const lastSearch = useRef(searchQuery);
  useEffect(() => {
    if (isFirstRun.current) {
      // The server already rendered the unfiltered first page.
      isFirstRun.current = false;
      return;
    }

    const searchChanged = lastSearch.current !== searchQuery;
    lastSearch.current = searchQuery;

    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError(null);
        try {
          const queryParams = new URLSearchParams();
          if (selectedProjectId !== "ALL")
            queryParams.set("projectId", selectedProjectId);
          if (startDate) queryParams.set("startDate", startDate);
          if (endDate) queryParams.set("endDate", endDate);
          if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());
          if (page > 1) queryParams.set("page", String(page));

          const res = await fetch(
            `/api/reports/usage?${queryParams.toString()}`,
            {
              signal: controller.signal,
            },
          );
          if (!res.ok) throw new Error(`Request failed (${res.status})`);
          const next: MaterialPurchasesData = await res.json();
          setData(next);
          // The server falls back to page 1 if the requested page is past the end.
          if (next.page !== page) setPage(next.page);
          setLoading(false);
        } catch (err) {
          if (controller.signal.aborted) return;
          console.error("Error fetching material purchases report:", err);
          setError("Could not update the report. Showing previous results.");
          setLoading(false);
        }
      },
      searchChanged ? SEARCH_DEBOUNCE_MS : 0,
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selectedProjectId, startDate, endDate, searchQuery, page]);

  const handleProjectSelect = (val: string | null) => {
    setSelectedProjectId(val || "ALL");
    setPage(1);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    setActivePreset("custom");
    setPage(1);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    setActivePreset("custom");
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handlePresetDate = (type: "all" | "this_month" | "last_30") => {
    const today = new Date();
    let s = "";
    let e = "";

    if (type === "this_month") {
      s = toLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
      e = toLocalDateString(today);
    } else if (type === "last_30") {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      s = toLocalDateString(thirtyDaysAgo);
      e = toLocalDateString(today);
    }

    setStartDate(s);
    setEndDate(e);
    setActivePreset(type);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedProjectId("ALL");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    setActivePreset("all");
    setPage(1);
  };

  // The Project column is only useful when rows span several projects.
  const showProjectColumn = selectedProjectId === "ALL";
  const columnCount = showProjectColumn ? 8 : 7;

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
            Material Purchases
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Every material purchase with its vendor, quantity and price, across
            projects and date ranges.
          </p>
        </div>
        <div className="shrink-0">
          <DownloadPdfButton
            reportType="top_usage"
            params={pdfParams}
            buttonText="Download Purchases PDF"
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
              Total Purchased Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              ₹{data.totalValue.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Purchase cost for the selected filters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Boxes className="h-4 w-4" />
              Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {data.totalCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Purchase entries recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Store className="h-4 w-4" />
              Top Vendor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {data.topVendor ? data.topVendor.name : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {data.topVendor
                ? `₹${data.topVendor.totalValue.toLocaleString("en-IN")} purchased`
                : "No vendor purchases recorded"}
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
                ? "All Projects"
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
                max={endDate || undefined}
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
                min={startDate || undefined}
                onChange={handleEndDateChange}
                className="h-9 w-full bg-background text-sm rounded-md px-3 border border-input shadow-none"
              />
            </div>

            {/* SEARCH USING INPUT COMPONENT */}
            <div className="flex flex-col min-w-0">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 h-4 mb-1.5">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span>Search</span>
              </label>
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder={
                    showProjectColumn
                      ? "Item, vendor or project..."
                      : "Item or vendor..."
                  }
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
            <div className="flex flex-wrap items-center gap-2">
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

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* DATA TABLE USING TABLE COMPONENT */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/40 py-3 px-4 flex flex-row items-center justify-between border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Purchase Register ({data.totalCount} purchases)
          </CardTitle>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating report...
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {/* MOBILE VIEW: stacked cards instead of a horizontally scrolling table */}
          <div className="md:hidden">
            {data.rows.length === 0 ? (
              <div className="py-12 px-4 text-center text-muted-foreground">
                <Package className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm font-medium">
                  No material purchases recorded for the selected filters.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Try clearing project or date filters to view broader purchase
                  data.
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {data.rows.map((row) => (
                    <div key={row.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground break-words">
                            {row.itemName}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5">
                            {formatPurchaseDate(row.date)} · {row.voucherNumber}
                          </p>
                        </div>
                        <p className="shrink-0 font-mono font-bold">
                          ₹{row.totalAmount.toLocaleString("en-IN")}
                        </p>
                      </div>

                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                        {showProjectColumn && (
                          <>
                            <dt className="text-muted-foreground">Project</dt>
                            <dd className="text-right break-words">
                              {row.projectName}
                            </dd>
                          </>
                        )}
                        <dt className="text-muted-foreground">Vendor</dt>
                        <dd className="text-right break-words">
                          {row.vendorName || "—"}
                        </dd>
                        <dt className="text-muted-foreground">Qty</dt>
                        <dd className="text-right font-mono">
                          {row.quantity.toLocaleString("en-IN")} {row.unit}
                        </dd>
                        <dt className="text-muted-foreground">Unit price</dt>
                        <dd className="text-right font-mono">
                          ₹{row.unitCost.toLocaleString("en-IN")} / {row.unit}
                        </dd>
                      </dl>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-3">
                  <span className="text-sm font-bold">
                    TOTAL ({data.totalCount} purchases)
                  </span>
                  <span className="font-mono text-base font-bold">
                    ₹{data.totalValue.toLocaleString("en-IN")}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* DESKTOP VIEW */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Voucher</TableHead>
                  {showProjectColumn && <TableHead>Project</TableHead>}
                  <TableHead>Item</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columnCount}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <Package className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm font-medium">
                        No material purchases recorded for the selected filters.
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Try clearing project or date filters to view broader
                        purchase data.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {formatPurchaseDate(row.date)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.voucherNumber}
                      </TableCell>
                      {showProjectColumn && (
                        <TableCell
                          className="text-muted-foreground"
                          title={row.projectName}
                        >
                          {truncateName(row.projectName)}
                        </TableCell>
                      )}
                      <TableCell className="font-medium text-foreground">
                        {row.itemName}
                      </TableCell>
                      <TableCell
                        className="text-muted-foreground"
                        title={row.vendorName || undefined}
                      >
                        {row.vendorName ? truncateName(row.vendorName) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium whitespace-nowrap">
                        {row.quantity.toLocaleString("en-IN")}{" "}
                        <span className="text-xs text-muted-foreground">
                          {row.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground whitespace-nowrap">
                        ₹{row.unitCost.toLocaleString("en-IN")}{" "}
                        <span className="text-xs">/ {row.unit}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold whitespace-nowrap">
                        ₹{row.totalAmount.toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {data.rows.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={columnCount - 1} className="font-bold">
                      TOTAL ({data.totalCount} purchases)
                    </TableCell>
                    <TableCell className="text-right font-mono text-base font-bold">
                      ₹{data.totalValue.toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      <PaginationControls
        page={data.page}
        totalPages={data.totalPages}
        total={data.totalCount}
        onPageChange={setPage}
      />
    </div>
  );
}
