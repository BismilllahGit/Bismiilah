import React from "react";
import prisma from "@/lib/prisma";
import type { BusinessProfile } from "@prisma/client";
import { formatRs, formatDate } from "@/lib/pdf/format";
import { PdfTable, PdfColumn } from "@/lib/pdf/ReportLayout";
import { BOQPdfTable } from "@/lib/pdf/BOQPdfTable";
import {
  getVendorLedgerData,
  getLabourContractorLedgerData,
} from "@/lib/queries/ledger-queries";
import type { FormattedLedgerRow } from "@/lib/queries/ledger-helpers";
import { getClosureReportData } from "@/lib/queries/report-queries";
import { getEnrichedProjectBOQ } from "@/lib/queries/boq-queries";

export interface RenderedReport {
  title: string;
  subtitle: string;
  summaryItems: Array<{ label: string; value: string | number }>;
  children: React.ReactNode;
}

interface LedgerReportParams {
  id: string;
  startDate?: string | null;
  endDate?: string | null;
  search?: string | null;
}

function ledgerColumns(labels: { debit: string; credit: string }): PdfColumn[] {
  return [
    { header: "Date", width: "15%" },
    { header: "Voucher #", width: "18%" },
    { header: "Particulars", flex: 1 },
    { header: labels.debit, width: "14%", align: "right" },
    { header: labels.credit, width: "14%", align: "right" },
    { header: "Balance", width: "16%", align: "right" },
  ];
}

function ledgerRows(
  rows: FormattedLedgerRow[],
  balance: (row: { runningBalance: number }) => string,
) {
  return rows.map((row) => [
    formatDate(row.date),
    row.voucherNumber,
    row.description,
    row.debit ? formatRs(row.debit) : "-",
    row.credit ? formatRs(row.credit) : "-",
    balance(row),
  ]);
}

export async function renderVendorLedgerReport(params: LedgerReportParams): Promise<RenderedReport> {
  const data = await getVendorLedgerData(params.id, { ...params, limit: 2000, page: 1 });
  const columns = ledgerColumns({ debit: "Debit", credit: "Credit" });
  const rows = ledgerRows(data.rows, (row) => `${formatRs(row.runningBalance)}${row.runningBalance >= 0 ? " Cr" : " Dr"}`);
  const footerRow = ["", "TOTALS", "", formatRs(data.totalDebit), formatRs(data.totalCredit), formatRs(data.closingBalance)];

  return {
    title: "Vendor Ledger Statement",
    subtitle: `Vendor: ${data.contact.name} ${data.contact.phone ? `(Phone: ${data.contact.phone})` : ""}`,
    summaryItems: [
      { label: "Opening Balance", value: formatRs(data.openingBalance) },
      { label: "Total Debits (Payments)", value: formatRs(data.totalDebit) },
      { label: "Total Credits (Purchases)", value: formatRs(data.totalCredit) },
      { label: "Closing Balance", value: `${formatRs(data.closingBalance)}${data.closingBalance >= 0 ? " Cr" : " Dr"}` },
    ],
    children: <PdfTable columns={columns} rows={rows} footerRow={footerRow} />,
  };
}

export async function renderLabourLedgerReport(
  params: LedgerReportParams,
  variant: "full" | "public",
): Promise<RenderedReport> {
  const data = await getLabourContractorLedgerData(params.id, { ...params, limit: 2000, page: 1 });
  const columns = ledgerColumns({ debit: "Supplied", credit: "Paid" });
  const rows = ledgerRows(
    data.rows,
    variant === "public"
      ? (row) => `${formatRs(row.runningBalance)}${row.runningBalance >= 0 ? " Dr" : " Cr"}`
      : (row) => formatRs(row.runningBalance),
  );
  const footerRow = ["", "TOTALS", "", formatRs(data.totalDebit), formatRs(data.totalCredit), formatRs(data.closingBalance)];

  return {
    title: "Labour Contractor Ledger Statement",
    subtitle: `Contractor: ${data.contact.name} ${data.contact.phone ? `(Phone: ${data.contact.phone})` : ""}`,
    summaryItems: [
      { label: "Opening Balance", value: formatRs(data.openingBalance) },
      { label: "Total Labour Supplied (Dr)", value: formatRs(data.totalDebit) },
      { label: "Total Payments Out (Cr)", value: formatRs(data.totalCredit) },
      { label: "Net Payable Balance", value: `${formatRs(data.closingBalance)}${data.closingBalance >= 0 ? " Dr" : " Cr"}` },
    ],
    children: <PdfTable columns={columns} rows={rows} footerRow={footerRow} />,
  };
}

export async function renderClosureReport(projectId: string): Promise<RenderedReport> {
  const data = await getClosureReportData(projectId);

  const columns: PdfColumn[] = [
    { header: "Financial Category / Metric", flex: 2 },
    { header: "Amount / Status", width: "35%", align: "right" },
  ];

  const rows = [
    ["Total Billed Invoices", formatRs(data.summary.totalBilled)],
    ["Total Collected Receipts", formatRs(data.summary.totalCollected)],
    ["Net Outstanding Receivables", formatRs(data.summary.outstandingReceivables)],
    ["Total Site & Operational Expenses", formatRs(data.summary.totalSiteExpenses)],
    ["Billed Extra Work", formatRs(data.summary.totalExtraWork - data.summary.unbilledExtraWork)],
    ["Unbilled Extra Work Items", formatRs(data.summary.unbilledExtraWork)],
    ["Estimated Consumed Material Cost", formatRs(data.summary.estimatedMaterialCost)],
    ["Official Closure Date", formatDate(data.summary.closureDate || new Date())],
  ];

  return {
    title: "Project Closure & Financial Audit Report",
    subtitle: `Project: ${data.project.name} | Status: ${data.isClosed ? "CLOSED" : "PRE-CLOSURE AUDIT"}`,
    summaryItems: [
      { label: "Total Billed", value: formatRs(data.summary.totalBilled) },
      { label: "Total Collected", value: formatRs(data.summary.totalCollected) },
      { label: "Outstanding Receivables", value: formatRs(data.summary.outstandingReceivables) },
      { label: "Total Site Expenses", value: formatRs(data.summary.totalSiteExpenses) },
    ],
    children: <PdfTable columns={columns} rows={rows} />,
  };
}

interface BoqReportParams {
  projectId: string;
  boqVersionNumber?: number;
  /** "full" adds the Target Budget summary row (reports/pdf only);
   *  "public" matches the share route's leaner summary. Preserves the
   *  pre-refactor difference between the two routes exactly. */
  variant: "full" | "public";
  businessProfile?: BusinessProfile | null;
}

export async function renderBoqReport(params: BoqReportParams): Promise<RenderedReport | null> {
  const [project, boqData] = await Promise.all([
    prisma.project.findUnique({ where: { id: params.projectId } }),
    getEnrichedProjectBOQ(params.projectId, params.boqVersionNumber),
  ]);

  if (!project || !boqData.current) return null;

  const boq = boqData.current;
  const summaryItems =
    params.variant === "full"
      ? [
          { label: "Quotation Version", value: `v${boq.versionNumber} (${boq.status})` },
          { label: "Total Sections", value: (boq.sections || []).length },
          { label: "Target Budget Ceiling", value: boq.targetBudget ? formatRs(boq.targetBudget) : "N/A" },
          { label: "Grand Total (G-TOTAL)", value: formatRs(boq.grandTotal) },
        ]
      : [
          { label: "Quotation Version", value: `v${boq.versionNumber} (${boq.status})` },
          { label: "Total Sections", value: (boq.sections || []).length },
          { label: "Grand Total (G-TOTAL)", value: formatRs(boq.grandTotal) },
        ];

  return {
    title: "Project Bill of Quantities / Quotation",
    subtitle: `Project: ${project.name} | Location: ${project.location} | Revision: Version ${boq.versionNumber} (${boq.status})`,
    summaryItems,
    children: <BOQPdfTable boq={boq} businessProfile={params.businessProfile} />,
  };
}
