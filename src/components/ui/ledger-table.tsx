import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DownloadPdfButton } from "@/components/pdf/DownloadPdfButton";
import { ShareViaWhatsAppButton } from "@/components/ui/share-via-whatsapp-button";

export type LedgerRow = {
  id?: string;
  voucherNumber: string;
  date: string;
  description: React.ReactNode;
  debit: number;
  credit: number;
  runningBalance: number;
  runningValueBalance?: number;
};

interface LedgerTableProps {
  openingBalance: number;
  rows: LedgerRow[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  debitLabel?: React.ReactNode;
  creditLabel?: React.ReactNode;
  currencyOrUnit?: "currency" | "quantity";
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  onSearchChange?: (search: string) => void;
  loading?: boolean;
  showValueBalance?: boolean;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  pdfReportType?: string;
  pdfParams?: Record<string, string | undefined>;
  contactName?: string;
  contactPhone?: string | null;
  shareLinkType?: "vendor_ledger" | "client_ledger" | "labour_ledger";
}

export function LedgerTable({
  openingBalance,
  rows,
  totalDebit,
  totalCredit,
  closingBalance,
  debitLabel = "Debit",
  creditLabel = "Credit",
  currencyOrUnit = "currency",
  onDateRangeChange,
  onSearchChange,
  loading = false,
  showValueBalance = false,
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  pdfReportType,
  pdfParams = {},
  contactName,
  contactPhone,
  shareLinkType,
}: LedgerTableProps) {
  const [datePreset, setDatePreset] = useState("all-time");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [searchText, setSearchText] = useState("");
  const [activeStart, setActiveStart] = useState("");
  const [activeEnd, setActiveEnd] = useState("");

  // Keep stable references to callback functions to avoid infinite re-renders
  const onSearchChangeRef = useRef(onSearchChange);
  const onDateRangeChangeRef = useRef(onDateRangeChange);
  const lastSentSearch = useRef("");
  const lastSentDateRange = useRef({ start: "", end: "" });

  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  useEffect(() => {
    onDateRangeChangeRef.current = onDateRangeChange;
  }, [onDateRangeChange]);

  // FIXED: Search debounce logic correctly clearing timeouts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchText !== lastSentSearch.current) {
        lastSentSearch.current = searchText;
        onSearchChangeRef.current?.(searchText);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const formatVal = (val: number) => {
    if (currencyOrUnit === "currency") {
      return `₹${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getBalanceSuffix = (bal: number) => {
    return bal >= 0 ? " Dr" : " Cr";
  };

  useEffect(() => {
    const today = new Date();
    let start = "";
    let end = "";

    if (datePreset === "this-month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      start = firstDay.toISOString().split("T")[0];
      end = lastDay.toISOString().split("T")[0];
    } else if (datePreset === "last-month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      start = firstDay.toISOString().split("T")[0];
      end = lastDay.toISOString().split("T")[0];
    } else if (datePreset === "custom") {
      start = customStart;
      end = customEnd;
    }

    if (
      start === lastSentDateRange.current.start &&
      end === lastSentDateRange.current.end
    ) {
      return;
    }

    if (datePreset !== "custom" || (start && end)) {
      lastSentDateRange.current = { start, end };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncs the derived active date-range into local state (and notifies the parent's fetch-on-change callback, deduped via ref) whenever the date filter changes
      setActiveStart(start);
      setActiveEnd(end);
      onDateRangeChangeRef.current?.(start, end);
    } else {
      setActiveStart("");
      setActiveEnd("");
    }
  }, [datePreset, customStart, customEnd]);

  return (
    <div className="space-y-4">
      {/* Date Range & Search Picker Controls */}
      {(onDateRangeChange || onSearchChange || pdfReportType) && (
        <div className="flex flex-col lg:flex-row flex-wrap xl:flex-nowrap gap-3 lg:gap-4 items-end bg-slate-50 p-3 rounded-md border shadow-sm">
          {onSearchChange && (
            <div className="w-full sm:w-60 shrink-0">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Search Ledger
              </label>
              <Input
                type="text"
                placeholder="Search description, note or voucher..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="bg-white h-9"
              />
            </div>
          )}

          {onDateRangeChange && (
            <>
              <div className="w-full sm:w-40 shrink-0">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Date Range
                </label>
                <Select
                  value={datePreset}
                  onValueChange={(val) => {
                    if (val !== null) setDatePreset(val);
                  }}
                >
                  <SelectTrigger className="bg-white h-9 w-full">
                    <SelectValue placeholder="Select Range">
                      {datePreset === "this-month"
                        ? "This Month"
                        : datePreset === "last-month"
                          ? "Last Month"
                          : datePreset === "custom"
                            ? "Custom Range"
                            : datePreset === "all-time"
                              ? "All Time"
                              : "Select Range"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                    <SelectItem value="all-time">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {datePreset === "custom" && (
                <>
                  <div className="w-full sm:w-36 shrink-0">
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="bg-white h-9"
                    />
                  </div>
                  <div className="w-full sm:w-36 shrink-0">
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="bg-white h-9"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {pdfReportType && (
            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-2 sm:ml-auto shrink-0 pt-1 lg:pt-0">
              <DownloadPdfButton
                reportType={pdfReportType}
                params={{
                  ...pdfParams,
                  startDate: activeStart || undefined,
                  endDate: activeEnd || undefined,
                  search: searchText || undefined,
                }}
                className="w-full sm:w-auto h-9"
                buttonText="Download Statement"
              />
              {shareLinkType && contactName && contactPhone && (
                <ShareViaWhatsAppButton
                  phone={contactPhone}
                  message={`Hi ${contactName}, here is your ledger statement from Bismillah Construction. View it here: ${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareLinkType}/${pdfParams.contactId}?startDate=${activeStart || ""}&endDate=${activeEnd || ""}&search=${searchText || ""}`}
                  variant="secondary"
                  className="w-full sm:w-auto h-9"
                  logType={
                    shareLinkType === "vendor_ledger"
                      ? "VENDOR_LEDGER"
                      : shareLinkType === "labour_ledger"
                        ? "LABOUR_LEDGER"
                        : "CLIENT_LEDGER"
                  }
                  referenceId={pdfParams.contactId}
                  referenceType="Contact"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile & Tablet Stacked Card View (below lg breakpoint) */}
      <div className="lg:hidden space-y-3.5">
        {/* Pinned Opening Balance Card */}
        <div className="bg-slate-100 border border-slate-300/80 rounded-xl p-3.5 shadow-sm flex items-center justify-between font-medium">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-600">
            Opening Balance
          </span>
          <span className="font-mono text-base text-slate-900 font-extrabold">
            {formatVal(Math.abs(openingBalance))}
            {getBalanceSuffix(openingBalance)}
          </span>
        </div>

        {/* Transaction Cards List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
              Loading ledger transactions...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border rounded-xl bg-white shadow-sm">
              No transactions found for this period.
            </div>
          ) : (
            rows.map((row, idx) => (
              <div
                key={row.id || idx}
                className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                {/* Top Row: Date and Voucher Number */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800 text-sm">
                    {new Date(row.date).toLocaleDateString("en-GB")}
                  </span>
                  <span className="font-mono bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-md font-semibold">
                    {row.voucherNumber || "VOUCHER"}
                  </span>
                </div>

                {/* Middle Row: Description */}
                <div className="text-sm text-slate-700 leading-relaxed wrap-break-word font-normal">
                  {row.description || (
                    <span className="italic text-muted-foreground">
                      No description
                    </span>
                  )}
                </div>

                {/* Bottom Row: Amount & Running Balance Boxes */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50/80 rounded-lg p-2.5 flex flex-col justify-center border border-slate-100/80">
                    {row.debit > 0 ? (
                      <>
                        <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-0.5 wrap-break-word">
                          {debitLabel}
                        </span>
                        <span className="font-mono font-bold text-orange-600 text-sm sm:text-base">
                          {formatVal(row.debit)}
                        </span>
                      </>
                    ) : row.credit > 0 ? (
                      <>
                        <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-0.5 wrap-break-word">
                          {creditLabel}
                        </span>
                        <span className="font-mono font-bold text-green-600 text-sm sm:text-base">
                          {formatVal(row.credit)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
                          Amount
                        </span>
                        <span className="font-mono text-slate-500 text-sm">
                          0.00
                        </span>
                      </>
                    )}
                  </div>

                  <div className="bg-slate-50/80 rounded-lg p-2.5 flex flex-col justify-center border border-slate-100/80 text-right">
                    <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-0.5">
                      Running Balance
                    </span>
                    <span className="font-mono font-extrabold text-slate-900 text-sm sm:text-base">
                      {formatVal(Math.abs(row.runningBalance))}
                      {getBalanceSuffix(row.runningBalance)}
                    </span>
                    {showValueBalance && (
                      <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Val: ₹
                        {(row.runningValueBalance || 0).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pinned Closing Balance & Totals Banner */}
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md space-y-3.5 border border-slate-800">
          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-800 text-center">
            <div className="bg-slate-800/90 rounded-lg p-2.5 border border-slate-700/60">
              <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-1 wrap-break-word">
                Total {debitLabel}
              </span>
              <span className="font-mono font-bold text-orange-400 text-sm sm:text-base">
                {formatVal(totalDebit)}
              </span>
            </div>
            <div className="bg-slate-800/90 rounded-lg p-2.5 border border-slate-700/60">
              <span className="block text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-1 wrap-break-word">
                Total {creditLabel}
              </span>
              <span className="font-mono font-bold text-green-400 text-sm sm:text-base">
                {formatVal(totalCredit)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
              Closing Balance
            </span>
            <span className="font-mono font-extrabold text-lg sm:text-xl text-white">
              {formatVal(Math.abs(closingBalance))}
              {getBalanceSuffix(closingBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Table View (lg and above) */}
      <div className="hidden lg:block border rounded-md bg-white shadow-sm">
        <Table className="min-w-200">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-30">Date</TableHead>
              <TableHead className="w-37.5">Voucher No.</TableHead>
              <TableHead>Particulars</TableHead>
              <TableHead className="text-right w-35">{debitLabel}</TableHead>
              <TableHead className="text-right w-35">{creditLabel}</TableHead>
              <TableHead className="text-right w-40">Balance</TableHead>
              {showValueBalance && (
                <TableHead className="text-right w-40">Value (₹)</TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Opening Balance Row */}
            <TableRow className="bg-slate-50 font-medium">
              <TableCell></TableCell>
              <TableCell
                colSpan={2}
                className="text-right italic text-slate-600"
              >
                Opening Balance
              </TableCell>
              <TableCell className="text-right font-mono"></TableCell>
              <TableCell className="text-right font-mono"></TableCell>
              <TableCell className="text-right font-mono text-slate-700">
                {formatVal(Math.abs(openingBalance))}
                {getBalanceSuffix(openingBalance)}
              </TableCell>
              {showValueBalance && (
                <TableCell className="text-right font-mono text-slate-700"></TableCell>
              )}
            </TableRow>

            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={showValueBalance ? 7 : 6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading ledger data...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showValueBalance ? 7 : 6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No transactions found for this period.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={row.id || idx} className="hover:bg-slate-50/50">
                  <TableCell className="whitespace-nowrap font-medium">
                    {new Date(row.date).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell className="font-medium text-xs text-slate-600">
                    {row.voucherNumber}
                  </TableCell>
                  <TableCell className="text-sm">{row.description}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {row.debit > 0 ? formatVal(row.debit) : ""}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {row.credit > 0 ? formatVal(row.credit) : ""}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-sm">
                    {formatVal(Math.abs(row.runningBalance))}
                    {getBalanceSuffix(row.runningBalance)}
                  </TableCell>
                  {showValueBalance && (
                    <TableCell className="text-right font-mono font-medium text-sm text-slate-700">
                      ₹
                      {(row.runningValueBalance || 0).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}

            {/* Closing Balance Row */}
            <TableRow className="bg-slate-50 font-medium">
              <TableCell></TableCell>
              <TableCell
                colSpan={2}
                className="text-right italic text-slate-700"
              >
                Closing Balance
              </TableCell>
              <TableCell className="text-right font-mono"></TableCell>
              <TableCell className="text-right font-mono"></TableCell>
              <TableCell className="text-right font-mono text-slate-900 border-t-2 border-slate-300 font-bold">
                {formatVal(Math.abs(closingBalance))}
                {getBalanceSuffix(closingBalance)}
              </TableCell>
              {showValueBalance && (
                <TableCell className="text-right font-mono text-slate-900 border-t-2 border-slate-300 font-bold"></TableCell>
              )}
            </TableRow>
          </TableBody>

          <TableFooter className="bg-slate-100 font-bold border-t-2 border-slate-300">
            <TableRow>
              <TableCell></TableCell>
              <TableCell colSpan={2} className="text-right">
                Totals
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatVal(totalDebit)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatVal(totalCredit)}
              </TableCell>
              <TableCell></TableCell>
              {showValueBalance && <TableCell></TableCell>}
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages !== undefined && totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-3 bg-slate-50 border rounded-md text-sm">
          <div className="text-slate-600 text-xs max-sm:text-sm">
            Showing page <span className="font-semibold">{page}</span> of{" "}
            <span className="font-semibold">{totalPages}</span> ({total} total
            transactions)
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange && onPageChange(page - 1)}
              className="h-8 max-sm:h-10 max-sm:px-4 max-sm:min-h-10 max-sm:min-w-17.5 text-xs max-sm:text-sm"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange && onPageChange(page + 1)}
              className="h-8 max-sm:h-10 max-sm:px-4 max-sm:min-h-10 max-sm:min-w-17.5 text-xs max-sm:text-sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
