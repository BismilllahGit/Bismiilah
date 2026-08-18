import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { ReportLayout, PdfTable, PdfColumn } from "@/lib/pdf/ReportLayout";
import { uploadPdfAndGetSignedUrl } from "@/lib/storage";
import { 
  getVendorLedgerData, 
  getLabourContractorLedgerData, 
  getClientLedgerData, 
  getInventoryLedgerData 
} from "@/lib/queries/ledger-queries";
import { 
  getDailyLabourReportData, 
  getSaturdayViewReportData, 
  getClosureReportData, 
  getTopUsageReportData 
} from "@/lib/queries/report-queries";
import { getEnrichedProjectBOQ } from "@/lib/queries/boq-queries";
import { BOQPdfTable } from "@/lib/pdf/BOQPdfTable";
import prisma from "@/lib/prisma";
import { View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 6,
  },
  divider: {
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  }
});

const formatRs = (val: number | null | undefined) => {
  if (val === null || val === undefined) return "Rs. 0.00";
  return `Rs. ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNum = (val: number | null | undefined) => {
  if (val === null || val === undefined) return "0";
  return Number(val).toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

const formatDate = (val: any) => {
  if (!val) return "-";
  try {
    return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return String(val);
  }
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session && process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessProfile = await prisma.businessProfile.findFirst();

    const body = await request.json();
    const { reportType, params = {} } = body;

    let title = "ERP Report";
    let subtitle = "";
    let dateRange = "";
    let summaryItems: Array<{ label: string; value: string | number }> = [];
    let children: React.ReactNode = null;

    if (params.startDate && params.endDate) {
      dateRange = `${formatDate(params.startDate)} to ${formatDate(params.endDate)}`;
    } else if (params.startDate) {
      dateRange = `From ${formatDate(params.startDate)}`;
    } else if (params.endDate) {
      dateRange = `Until ${formatDate(params.endDate)}`;
    }

    // 1. Vendor Ledger
    if (reportType === "vendor_ledger") {
      const data = await getVendorLedgerData(params.contactId, { ...params, limit: 2000, page: 1 });
      title = "Vendor Ledger Statement";
      subtitle = `Vendor: ${data.contact.name} ${data.contact.phone ? `(Phone: ${data.contact.phone})` : ""}`;
      summaryItems = [
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

      const footerRow = [
        "",
        "TOTALS",
        "",
        formatRs(data.totalDebit),
        formatRs(data.totalCredit),
        `${formatRs(data.closingBalance)}`
      ];

      children = <PdfTable columns={columns} rows={rows} footerRow={footerRow} />;
    } 
    // 2. Labour Contractor Ledger
    else if (reportType === "labour_ledger") {
      const data = await getLabourContractorLedgerData(params.contactId, { ...params, limit: 2000, page: 1 });
      title = "Labour Contractor Ledger Statement";
      subtitle = `Contractor: ${data.contact.name} ${data.contact.phone ? `(Phone: ${data.contact.phone})` : ""}`;
      summaryItems = [
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
        `${formatRs(row.runningBalance)}`
      ]);

      const footerRow = [
        "",
        "TOTALS",
        "",
        formatRs(data.totalDebit),
        formatRs(data.totalCredit),
        `${formatRs(data.closingBalance)}`
      ];

      children = <PdfTable columns={columns} rows={rows} footerRow={footerRow} />;
    } 
    // 3. Client Ledger
    else if (reportType === "client_ledger") {
      const data = await getClientLedgerData(params.clientId, { ...params, limit: 2000, page: 1 });
      title = "Client Statement of Accounts";
      subtitle = `Client: ${data.client.name} ${data.client.phone ? `(Phone: ${data.client.phone})` : ""}`;
      summaryItems = [
        { label: "Opening Balance", value: formatRs(data.openingBalance) },
        { label: "Invoices Billed (Dr)", value: formatRs(data.totalDebit) },
        { label: "Payments Received (Cr)", value: formatRs(data.totalCredit) },
        { label: "Net Due Balance", value: `${formatRs(data.closingBalance)}` },
      ];

      const columns: PdfColumn[] = [
        { header: "Date", width: "15%" },
        { header: "Voucher / Inv #", width: "18%" },
        { header: "Description", flex: 1 },
        { header: "Billed", width: "14%", align: "right" },
        { header: "Received", width: "14%", align: "right" },
        { header: "Balance", width: "16%", align: "right" },
      ];

      const rows = data.rows.map(row => [
        formatDate(row.date),
        row.voucherNumber,
        row.description,
        row.debit ? formatRs(row.debit) : "-",
        row.credit ? formatRs(row.credit) : "-",
        `${formatRs(row.runningBalance)}`
      ]);

      const footerRow = [
        "",
        "TOTALS",
        "",
        formatRs(data.totalDebit),
        formatRs(data.totalCredit),
        `${formatRs(data.closingBalance)}`
      ];

      children = <PdfTable columns={columns} rows={rows} footerRow={footerRow} />;
    } 
    // 4. Inventory Ledger
    else if (reportType === "inventory_ledger") {
      const data = await getInventoryLedgerData(params.projectId, params.itemId, { ...params, limit: 2000, page: 1 });
      title = "Material & Inventory Ledger";
      subtitle = `Item: ${data.item.name} (${data.item.unit}) | Project: ${data.project.name}`;
      summaryItems = [
        { label: "Opening Stock", value: `${formatNum(data.openingQtyBalance)} ${data.item.unit}` },
        { label: "Total In", value: `${formatNum(data.totalQtyIn)} ${data.item.unit}` },
        { label: "Total Out / Used", value: `${formatNum(data.totalQtyOut)} ${data.item.unit}` },
        { label: "Closing Stock", value: `${formatNum(data.closingQtyBalance)} ${data.item.unit} (${formatRs(data.closingValueBalance)})` },
      ];

      const columns: PdfColumn[] = [
        { header: "Date", width: "14%" },
        { header: "Voucher", width: "15%" },
        { header: "Type", width: "14%" },
        { header: "Description", flex: 1 },
        { header: "In", width: "11%", align: "right" },
        { header: "Out", width: "11%", align: "right" },
        { header: "Balance", width: "14%", align: "right" },
      ];

      const rows = data.rows.map(row => [
        formatDate(row.date),
        row.voucherNumber,
        row.type,
        row.description || (row.linkedProjectName ? `Linked: ${row.linkedProjectName}` : "-"),
        row.qtyIn ? formatNum(row.qtyIn) : "-",
        row.qtyOut ? formatNum(row.qtyOut) : "-",
        `${formatNum(row.runningQtyBalance)} ${data.item.unit}`
      ]);

      const footerRow = [
        "",
        "TOTALS",
        "",
        "",
        formatNum(data.totalQtyIn),
        formatNum(data.totalQtyOut),
        formatNum(data.closingQtyBalance)
      ];

      children = <PdfTable columns={columns} rows={rows} footerRow={footerRow} />;
    } 
    // 5. Labour Report / Page
    else if (reportType === "labour_report") {
      const data = await getDailyLabourReportData({ ...params, limit: 2000, page: 1 });
      title = "Daily Labour Operations Report";
      subtitle = params.groupBy && params.groupBy !== "none" ? `Grouped By: ${params.groupBy.toUpperCase()}` : `Comprehensive Labour Transactions Log`;
      summaryItems = [
        { label: "Total Entries", value: formatNum(data.summary.entryCount) },
        { label: "Total Mandays / Headcount", value: formatNum(data.summary.totalHeadcount) },
        { label: "Total Labour Spend", value: formatRs(data.summary.totalSpend) },
      ];

      if (data.isGrouped) {
        let firstHeader = "Group";
        if (data.groupBy === "date") firstHeader = "Date";
        if (data.groupBy === "workertype") firstHeader = "Worker Type";
        if (data.groupBy === "project") firstHeader = "Project Name";

        const columns: PdfColumn[] = [
          { header: firstHeader, flex: 2 },
          { header: "Total Headcount", width: "30%", align: "right" },
          { header: "Total Spend", width: "30%", align: "right" },
        ];

        const rows = data.data.map((r: any) => [
          data.groupBy === "date" ? formatDate(r.date) : (r.workerType || r.projectName || "N/A"),
          formatNum(r.totalHeadcount),
          formatRs(r.totalSpend)
        ]);

        const footerRow = [
          "TOTALS",
          formatNum(data.summary.totalHeadcount),
          formatRs(data.summary.totalSpend)
        ];

        children = <PdfTable columns={columns} rows={rows} footerRow={footerRow} />;
      } else {
        const columns: PdfColumn[] = [
          { header: "Date", width: "13%" },
          { header: "Voucher", width: "14%" },
          { header: "Project", flex: 1 },
          { header: "Worker Type", width: "16%" },
          { header: "Brought By", width: "16%" },
          { header: "Count", width: "10%", align: "right" },
          { header: "Rate", width: "11%", align: "right" },
          { header: "Total", width: "13%", align: "right" },
        ];

        const rows = data.data.map((r: any) => [
          formatDate(r.date),
          r.voucherNumber,
          r.projectName,
          r.workerType || "-",
          r.contractorName || "-",
          formatNum(r.headcount),
          formatRs(r.wageRate),
          formatRs(r.totalSpend)
        ]);

        const footerRow = [
          "",
          "TOTALS",
          "",
          "",
          "",
          formatNum(data.summary.totalHeadcount),
          "",
          formatRs(data.summary.totalSpend)
        ];

        children = <PdfTable columns={columns} rows={rows} footerRow={footerRow} />;
      }
    }
    // 6. Saturday View
    else if (reportType === "saturday_view") {
      const data = await getSaturdayViewReportData();
      title = "Saturday Financial Due Snapshot";
      subtitle = `Upcoming Saturday Reference: ${formatDate(data.comingSaturday)}`;
      summaryItems = [
        { label: "Client Dues Coming In", value: formatRs(data.totalClientDues) },
        { label: "Labour Payments Due Out", value: formatRs(data.totalLabourDues) },
        { label: "Net Cash Position", value: formatRs(data.totalClientDues - data.totalLabourDues) },
      ];

      const clientCols: PdfColumn[] = [
        { header: "Due Date", width: "15%" },
        { header: "Client Name", flex: 1 },
        { header: "Project", width: "25%" },
        { header: "Invoice #", width: "15%" },
        { header: "Pending Due", width: "18%", align: "right" },
      ];

      const clientRows = data.dueClients.map(c => [
        formatDate(c.dueDate),
        c.clientName + (c.clientPhone ? ` (${c.clientPhone})` : ""),
        c.projectName,
        c.invoiceNumber,
        formatRs(c.balance)
      ]);

      const labourCols: PdfColumn[] = [
        { header: "Labour Contractor Name", flex: 1 },
        { header: "Phone Contact", width: "35%" },
        { header: "Payable Balance Due", width: "25%", align: "right" },
      ];

      const labourRows = data.labourDues.map(d => [
        d.contractorName,
        d.contractorPhone || "N/A",
        formatRs(d.payableBalance)
      ]);

      children = (
        <View>
          <Text style={styles.sectionTitle}>1. Client Dues This Week (Inflow)</Text>
          <PdfTable 
            columns={clientCols} 
            rows={clientRows} 
            footerRow={["", "TOTAL CLIENT DUES", "", "", formatRs(data.totalClientDues)]} 
            emptyText="No client dues pending for this Saturday."
          />

          <View style={{ marginTop: 12 }}>
            <Text style={styles.sectionTitle}>2. Labour Contractor Payments Due (Outflow)</Text>
            <PdfTable 
              columns={labourCols} 
              rows={labourRows} 
              footerRow={["", "TOTAL PAYABLE", formatRs(data.totalLabourDues)]} 
              emptyText="No outstanding weekly labour payments due."
            />
          </View>
        </View>
      );
    } 
    // 7. Top Usage Report
    else if (reportType === "top_usage") {
      const data = await getTopUsageReportData({ ...params });
      title = "Top Material Usage Report";
      subtitle = "Consumption Summary (Excluding Historical Inter-Project Transfers)";
      summaryItems = [
        { label: "Items Reported", value: formatNum(data.totalItems) },
        { label: "Total Consumed Value", value: formatRs(data.totalValue) },
      ];

      const columns: PdfColumn[] = [
        { header: "Item Name", flex: 1 },
        { header: "Unit", width: "15%" },
        { header: "Avg Unit Cost", width: "20%", align: "right" },
        { header: "Total Qty Issued", width: "22%", align: "right" },
        { header: "Total Value Issued", width: "22%", align: "right" },
      ];

      const rows = data.rows.map(r => [
        r.itemName,
        r.unit,
        formatRs(r.unitCost),
        `${formatNum(r.totalQtyIssued)} ${r.unit}`,
        formatRs(r.totalValueIssued)
      ]);

      const footerRow = [
        "TOTAL VALUE ISSUED",
        "",
        "",
        "",
        formatRs(data.totalValue)
      ];

      children = <PdfTable columns={columns} rows={rows} footerRow={footerRow} />;
    } 
    // 8. Project Closure Report
    else if (reportType === "closure_report") {
      const data = await getClosureReportData(params.projectId);
      title = "Project Closure & Financial Audit Report";
      subtitle = `Project: ${data.project.name} | Status: ${data.isClosed ? "CLOSED" : "PRE-CLOSURE AUDIT"}`;
      summaryItems = [
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

      children = <PdfTable columns={columns} rows={rows} />;
    } 
    // 9. BOQ / Client Quotation Report
    else if (reportType === "boq") {
      let boqVersionNumber: number | undefined = undefined;
      if (params.boqId) {
        const target = await prisma.bOQ.findUnique({ where: { id: params.boqId } });
        if (target) {
          boqVersionNumber = target.versionNumber;
        }
      }

      const [project, boqData] = await Promise.all([
        prisma.project.findUnique({ where: { id: params.projectId } }),
        getEnrichedProjectBOQ(params.projectId, boqVersionNumber),
      ]);

      if (!project || !boqData.current) {
        return NextResponse.json({ error: "BOQ or Project not found for quotation export." }, { status: 404 });
      }

      const boq = boqData.current;
      title = "Project Bill of Quantities / Quotation";
      subtitle = `Project: ${project.name} | Location: ${project.location} | Revision: Version ${boq.versionNumber} (${boq.status})`;
      summaryItems = [
        { label: "Quotation Version", value: `v${boq.versionNumber} (${boq.status})` },
        { label: "Total Sections", value: (boq.sections || []).length },
        { label: "Target Budget Ceiling", value: boq.targetBudget ? formatRs(boq.targetBudget) : "N/A" },
        { label: "Grand Total (G-TOTAL)", value: formatRs(boq.grandTotal) },
      ];

      children = <BOQPdfTable boq={boq} />;
    } else {
      return NextResponse.json({ error: `Unsupported reportType: ${reportType}` }, { status: 400 });
    }

    // Render through @react-pdf/renderer to buffer
    const pdfDocument = (
      <ReportLayout title={title} subtitle={subtitle} dateRange={dateRange} summaryItems={summaryItems} businessProfile={businessProfile}>
        {children}
      </ReportLayout>
    );

    const buffer = await renderToBuffer(pdfDocument as any);

    // Upload to Cloudflare R2 (or local fallback) under reports/{reportType}/{timestamp}.pdf
    const timestamp = Date.now();
    const filePath = `reports/${reportType}/${timestamp}.pdf`;
    const signedUrl = await uploadPdfAndGetSignedUrl(buffer, filePath);

    return NextResponse.json({ url: signedUrl, expirySeconds: 3600 });
  } catch (error: any) {
    console.error("PDF Generation failed:", error);
    return NextResponse.json({ error: error.message || "Failed to generate PDF report" }, { status: 500 });
  }
}
