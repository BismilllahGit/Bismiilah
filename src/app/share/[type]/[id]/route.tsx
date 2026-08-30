import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { ReportLayout, PdfTable, PdfColumn } from "@/lib/pdf/ReportLayout";
import { uploadPdfAndGetSignedUrl } from "@/lib/storage";
import { formatRs, formatDate } from "@/lib/pdf/format";
import { getClientLedgerData } from "@/lib/queries/ledger-queries";
import {
  renderVendorLedgerReport,
  renderLabourLedgerReport,
  renderClosureReport,
  renderBoqReport,
} from "@/lib/pdf/report-renderers";

export const dynamic = "force-dynamic";

// SECURITY MODEL:
// This route is intentionally public and unauthenticated, since the recipient (client or vendor)
// has no login to the app. Access is protected only by the UUID being effectively unguessable
// (standard v4 UUIDs), the same trust model used by common link-sharing tools.
// If stronger protection is ever needed (e.g., an expiring share-specific token instead of the raw
// entity ID), that would be a deliberate future upgrade, not assumed here.

export async function GET(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  try {
    const { type, id } = await params;

    const searchParams = new URL(request.url).searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const businessProfile = await prisma.businessProfile.findFirst();

    let report: Awaited<ReturnType<typeof renderVendorLedgerReport>> | null = null;
    let filePath = "";

    const ledgerParams = { id, startDate, endDate, search };

    if (type === "boq") {
      const target = await prisma.bOQ.findUnique({ where: { id } });
      if (!target) return new NextResponse("BOQ not found", { status: 404 });

      report = await renderBoqReport({ projectId: target.projectId, boqVersionNumber: target.versionNumber, variant: "public" });
      if (!report) return new NextResponse("BOQ estimate data missing or project not found", { status: 404 });

      filePath = `shares/boq/quotation_${target.projectId}_v${target.versionNumber}_${Date.now()}.pdf`;
    } else if (type === "closure-report") {
      report = await renderClosureReport(id);
      filePath = `shares/closure_report/closure_${id}_${Date.now()}.pdf`;
    } else if (type === "vendor_ledger") {
      report = await renderVendorLedgerReport(ledgerParams);
      filePath = `shares/ledger/vendor_${id}_${Date.now()}.pdf`;
    } else if (type === "client_ledger") {
      // UNCHANGED, not a shared branch — see reports/pdf/route.tsx's client_ledger
      // comment for why (title/column/summary-label divergence found via real testing).
      const data = await getClientLedgerData(id, { startDate: startDate || undefined, endDate: endDate || undefined, search: search || undefined, limit: 2000, page: 1 });
      const title = "Client Ledger Statement";
      const subtitle = `Client: ${data.client.name} ${data.client.phone ? `(Phone: ${data.client.phone})` : ""}`;
      const summaryItems = [
        { label: "Opening Balance", value: formatRs(data.openingBalance) },
        { label: "Total Debits (Invoiced)", value: formatRs(data.totalDebit) },
        { label: "Total Credits (Received)", value: formatRs(data.totalCredit) },
        { label: "Closing Balance", value: `${formatRs(data.closingBalance)}${data.closingBalance >= 0 ? " Dr" : " Cr"}` },
      ];
      const columns: PdfColumn[] = [
        { header: "Date", width: "15%" },
        { header: "Voucher #", width: "18%" },
        { header: "Particulars", flex: 1 },
        { header: "Invoiced", width: "14%", align: "right" },
        { header: "Received", width: "14%", align: "right" },
        { header: "Balance", width: "16%", align: "right" },
      ];
      const rows = data.rows.map((row) => [
        formatDate(row.date),
        row.voucherNumber,
        row.description,
        row.debit ? formatRs(row.debit) : "-",
        row.credit ? formatRs(row.credit) : "-",
        `${formatRs(row.runningBalance)}${row.runningBalance >= 0 ? " Dr" : " Cr"}`,
      ]);
      const footerRow = ["", "TOTALS", "", formatRs(data.totalDebit), formatRs(data.totalCredit), `${formatRs(data.closingBalance)}`];
      report = { title, subtitle, summaryItems, children: <PdfTable columns={columns} rows={rows} footerRow={footerRow} /> };
      filePath = `shares/ledger/client_${id}_${Date.now()}.pdf`;
    } else if (type === "labour_ledger") {
      report = await renderLabourLedgerReport(ledgerParams, "public");
      filePath = `shares/ledger/labour_${id}_${Date.now()}.pdf`;
    } else if (type === "invoice") {
      return new NextResponse("Invoice PDF sharing is not yet implemented.", { status: 501 });
    } else {
      return new NextResponse("Unsupported share type", { status: 400 });
    }

    const pdfDocument = (
      <ReportLayout title={report.title} subtitle={report.subtitle} summaryItems={report.summaryItems} businessProfile={businessProfile}>
        {report.children}
      </ReportLayout>
    );

    const buffer = await renderToBuffer(pdfDocument);
    const signedUrl = await uploadPdfAndGetSignedUrl(buffer, filePath);
    const redirectUrl = signedUrl.startsWith("http") ? signedUrl : new URL(signedUrl, request.url).toString();
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error(`Error handling public share link:`, error);
    return new NextResponse("Internal Server Error generating share link", { status: 500 });
  }
}
