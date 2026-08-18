import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { ReportLayout, PdfTable, PdfColumn } from "@/lib/pdf/ReportLayout";
import { BOQPdfTable } from "@/lib/pdf/BOQPdfTable";
import { uploadPdfAndGetSignedUrl } from "@/lib/storage";
import { getEnrichedProjectBOQ } from "@/lib/queries/boq-queries";
import { getClosureReportData } from "@/lib/queries/report-queries";
import { 
  getVendorLedgerData, 
  getLabourContractorLedgerData, 
  getClientLedgerData 
} from "@/lib/queries/ledger-queries";

export const dynamic = "force-dynamic";

// SECURITY MODEL:
// This route is intentionally public and unauthenticated, since the recipient (client or vendor)
// has no login to the app. Access is protected only by the UUID being effectively unguessable
// (standard v4 UUIDs), the same trust model used by common link-sharing tools.
// If stronger protection is ever needed (e.g., an expiring share-specific token instead of the raw
// entity ID), that would be a deliberate future upgrade, not assumed here.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;
    
    const searchParams = new URL(request.url).searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const businessProfile = await prisma.businessProfile.findFirst();

    let pdfDocument: React.ReactNode | null = null;
    let filePath = "";

    const formatRs = (val: any) =>
      val !== null && val !== undefined
        ? `Rs. ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "Rs. 0.00";

    const formatDate = (val: any) => {
      if (!val) return "-";
      try {
        return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
      } catch {
        return String(val);
      }
    };

    if (type === "boq") {
      // id represents the boqId
      const target = await prisma.bOQ.findUnique({ where: { id } });
      if (!target) {
        return new NextResponse("BOQ not found", { status: 404 });
      }

      const boqData = await getEnrichedProjectBOQ(target.projectId, target.versionNumber);
      if (!boqData.current) {
        return new NextResponse("BOQ estimate data missing", { status: 404 });
      }

      const boq = boqData.current;
      const project = await prisma.project.findUnique({ where: { id: target.projectId } });
      if (!project) {
        return new NextResponse("Project not found", { status: 404 });
      }

      const title = "Project Bill of Quantities / Quotation";
      const subtitle = `Project: ${project.name} | Location: ${project.location} | Revision: Version ${boq.versionNumber} (${boq.status})`;
      const summaryItems = [
        { label: "Quotation Version", value: `v${boq.versionNumber} (${boq.status})` },
        { label: "Total Sections", value: (boq.sections || []).length },
        { label: "Grand Total (G-TOTAL)", value: formatRs(boq.grandTotal) },
      ];

      pdfDocument = (
        <ReportLayout title={title} subtitle={subtitle} summaryItems={summaryItems} businessProfile={businessProfile}>
          <BOQPdfTable boq={boq} />
        </ReportLayout>
      );

      filePath = `shares/boq/quotation_${target.projectId}_v${boq.versionNumber}_${Date.now()}.pdf`;

    } else if (type === "closure-report") {
      // id represents the projectId
      const data = await getClosureReportData(id);
      
      const title = "Project Closure & Financial Audit Report";
      const subtitle = `Project: ${data.project.name} | Status: ${data.isClosed ? "CLOSED" : "PRE-CLOSURE AUDIT"}`;
      const summaryItems = [
        { label: "Total Billed", value: formatRs(data.summary.totalBilled) },
        { label: "Total Collected", value: formatRs(data.summary.totalCollected) },
        { label: "Outstanding Receivables", value: formatRs(data.summary.outstandingReceivables) },
        { label: "Total Site Expenses", value: formatRs(data.summary.totalSiteExpenses) },
      ];

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
        ["Official Closure Date", formatDate(data.summary.closureDate || new Date())]
      ];

      pdfDocument = (
        <ReportLayout title={title} subtitle={subtitle} summaryItems={summaryItems} businessProfile={businessProfile}>
          <PdfTable columns={columns} rows={rows} />
        </ReportLayout>
      );

      filePath = `shares/closure_report/closure_${id}_${Date.now()}.pdf`;
    } 
    else if (type === "vendor_ledger") {
      const data = await getVendorLedgerData(id, { startDate: startDate || undefined, endDate: endDate || undefined, search: search || undefined, limit: 2000, page: 1 });
      const title = "Vendor Ledger Statement";
      const subtitle = `Vendor: ${data.contact.name} ${data.contact.phone ? `(Phone: ${data.contact.phone})` : ""}`;
      const summaryItems = [
        { label: "Opening Balance", value: formatRs(data.openingBalance) },
        { label: "Total Debits (Payments)", value: formatRs(data.totalDebit) },
        { label: "Total Credits (Purchases)", value: formatRs(data.totalCredit) },
        { label: "Closing Balance", value: `${formatRs(data.closingBalance)}${data.closingBalance >= 0 ? " Cr" : " Dr"}` },
      ];
      const columns: PdfColumn[] = [
        { header: "Date", width: "15%" },
        { header: "Voucher #", width: "18%" },
        { header: "Particulars", flex: 1 },
        { header: "Debit", width: "14%", align: "right" },
        { header: "Credit", width: "14%", align: "right" },
        { header: "Balance", width: "16%", align: "right" },
      ];
      const rows = data.rows.map(row => [
        formatDate(row.date),
        row.voucherNumber,
        row.description,
        row.debit ? formatRs(row.debit) : "-",
        row.credit ? formatRs(row.credit) : "-",
        `${formatRs(row.runningBalance)}${row.runningBalance >= 0 ? " Cr" : " Dr"}`
      ]);
      const footerRow = ["", "TOTALS", "", formatRs(data.totalDebit), formatRs(data.totalCredit), `${formatRs(data.closingBalance)}`];
      pdfDocument = <ReportLayout title={title} subtitle={subtitle} summaryItems={summaryItems} businessProfile={businessProfile}><PdfTable columns={columns} rows={rows} footerRow={footerRow} /></ReportLayout>;
      filePath = `shares/ledger/vendor_${id}_${Date.now()}.pdf`;
    }
    else if (type === "client_ledger") {
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
      const rows = data.rows.map(row => [
        formatDate(row.date),
        row.voucherNumber,
        row.description,
        row.debit ? formatRs(row.debit) : "-",
        row.credit ? formatRs(row.credit) : "-",
        `${formatRs(row.runningBalance)}${row.runningBalance >= 0 ? " Dr" : " Cr"}`
      ]);
      const footerRow = ["", "TOTALS", "", formatRs(data.totalDebit), formatRs(data.totalCredit), `${formatRs(data.closingBalance)}`];
      pdfDocument = <ReportLayout title={title} subtitle={subtitle} summaryItems={summaryItems} businessProfile={businessProfile}><PdfTable columns={columns} rows={rows} footerRow={footerRow} /></ReportLayout>;
      filePath = `shares/ledger/client_${id}_${Date.now()}.pdf`;
    }
    else if (type === "labour_ledger") {
      const data = await getLabourContractorLedgerData(id, { startDate: startDate || undefined, endDate: endDate || undefined, search: search || undefined, limit: 2000, page: 1 });
      const title = "Labour Contractor Ledger Statement";
      const subtitle = `Contractor: ${data.contact.name} ${data.contact.phone ? `(Phone: ${data.contact.phone})` : ""}`;
      const summaryItems = [
        { label: "Opening Balance", value: formatRs(data.openingBalance) },
        { label: "Total Labour Supplied (Dr)", value: formatRs(data.totalDebit) },
        { label: "Total Payments Out (Cr)", value: formatRs(data.totalCredit) },
        { label: "Net Payable Balance", value: `${formatRs(data.closingBalance)}${data.closingBalance >= 0 ? " Dr" : " Cr"}` },
      ];
      const columns: PdfColumn[] = [
        { header: "Date", width: "15%" },
        { header: "Voucher #", width: "18%" },
        { header: "Particulars", flex: 1 },
        { header: "Supplied", width: "14%", align: "right" },
        { header: "Paid", width: "14%", align: "right" },
        { header: "Balance", width: "16%", align: "right" },
      ];
      const rows = data.rows.map(row => [
        formatDate(row.date),
        row.voucherNumber,
        row.description,
        row.debit ? formatRs(row.debit) : "-",
        row.credit ? formatRs(row.credit) : "-",
        `${formatRs(row.runningBalance)}${row.runningBalance >= 0 ? " Dr" : " Cr"}`
      ]);
      const footerRow = ["", "TOTALS", "", formatRs(data.totalDebit), formatRs(data.totalCredit), `${formatRs(data.closingBalance)}`];
      pdfDocument = <ReportLayout title={title} subtitle={subtitle} summaryItems={summaryItems} businessProfile={businessProfile}><PdfTable columns={columns} rows={rows} footerRow={footerRow} /></ReportLayout>;
      filePath = `shares/ledger/labour_${id}_${Date.now()}.pdf`;
    }
    else if (type === "invoice") {
      // Invoice PDF generation is currently a placeholder until invoice templating is fully built out
      // Usually would lookup Invoice, render InvoicePdfTable etc.
      return new NextResponse("Invoice PDF sharing is not yet implemented.", { status: 501 });
    }
    else {
      return new NextResponse("Unsupported share type", { status: 400 });
    }

    // Render the PDF on-the-fly to ensure it's fresh
    const buffer = await renderToBuffer(pdfDocument as any);
    
    // Upload it to Cloudflare R2 and get a fresh signed URL (1 hr expiry)
    const signedUrl = await uploadPdfAndGetSignedUrl(buffer, filePath);

    // 302 Redirect the user to the freshly generated signed URL
    const redirectUrl = signedUrl.startsWith("http") ? signedUrl : new URL(signedUrl, request.url).toString();
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error(`Error handling public share link:`, error);
    return new NextResponse("Internal Server Error generating share link", { status: 500 });
  }
}
