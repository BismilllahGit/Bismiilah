import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { ReportLayout, PdfTable, PdfColumn } from "@/lib/pdf/ReportLayout";
import {
  getClientLedgerData,
  getInventoryLedgerData,
} from "@/lib/queries/ledger-queries";
import {
  getDailyLabourReportData,
  getSaturdayViewReportData,
  getTopUsageReportData,
} from "@/lib/queries/report-queries";
import prisma from "@/lib/prisma";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatRs, formatNum, formatDate } from "@/lib/pdf/format";
import {
  renderVendorLedgerReport,
  renderLabourLedgerReport,
  renderClosureReport,
  renderBoqReport,
} from "@/lib/pdf/report-renderers";

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 12,
    marginBottom: 6,
  },
  divider: {
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
});

interface LabourGroupedRow {
  date?: Date;
  workerType?: string;
  projectName?: string;
  totalHeadcount: number;
  totalSpend: number;
}

interface LabourFlatRow {
  date: Date;
  voucherNumber: string;
  projectName: string;
  workerType: string | null;
  contractorName: string | null;
  headcount: number;
  wageRate: number;
  totalSpend: number;
}

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
      const report = await renderVendorLedgerReport({
        id: params.contactId,
        ...params,
      });
      title = report.title;
      subtitle = report.subtitle;
      summaryItems = report.summaryItems;
      children = report.children;
    }
    // 2. Labour Contractor Ledger
    else if (reportType === "labour_ledger") {
      const report = await renderLabourLedgerReport(
        {
          id: params.contactId,
          ...params,
        },
        "full",
      );
      title = report.title;
      subtitle = report.subtitle;
      summaryItems = report.summaryItems;
      children = report.children;
    }
    // 3. Client Ledger — UNCHANGED, not a shared branch: investigation during
    // Task 4 found this report differs meaningfully between reports/pdf and
    // the public share route (title, 3 of 6 column headers, row-level Dr/Cr
    // suffix, 3 of 4 summary labels) — not safe to unify, left as-is.
    else if (reportType === "client_ledger") {
      // The page sends the id as `contactId`, same as every other ledger
      // type on this route (vendor_ledger, labour_ledger) — this branch was
      // the one outlier reading `params.clientId`, which the caller never
      // actually sends, so this always 500'd with a Prisma "needs id" error.
      const data = await getClientLedgerData(params.contactId, {
        ...params,
        limit: 2000,
        page: 1,
      });
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

      const rows = data.rows.map((row) => [
        formatDate(row.date),
        row.voucherNumber,
        row.description,
        row.debit ? formatRs(row.debit) : "-",
        row.credit ? formatRs(row.credit) : "-",
        `${formatRs(row.runningBalance)}`,
      ]);

      const footerRow = [
        "",
        "TOTALS",
        "",
        formatRs(data.totalDebit),
        formatRs(data.totalCredit),
        `${formatRs(data.closingBalance)}`,
      ];

      children = (
        <PdfTable columns={columns} rows={rows} footerRow={footerRow} />
      );
    }
    // 4. Inventory Ledger
    else if (reportType === "inventory_ledger") {
      const data = await getInventoryLedgerData(
        params.projectId,
        params.itemId,
        { ...params, limit: 2000, page: 1 },
      );
      title = "Material & Inventory Ledger";
      subtitle = `Item: ${data.item.name} (${data.item.unit}) | Project: ${data.project.name}`;
      summaryItems = [
        {
          label: "Opening Stock",
          value: `${formatNum(data.openingQtyBalance)} ${data.item.unit}`,
        },
        {
          label: "Total In",
          value: `${formatNum(data.totalQtyIn)} ${data.item.unit}`,
        },
        {
          label: "Total Out / Used",
          value: `${formatNum(data.totalQtyOut)} ${data.item.unit}`,
        },
        {
          label: "Closing Stock",
          value: `${formatNum(data.closingQtyBalance)} ${data.item.unit} (${formatRs(data.closingValueBalance)})`,
        },
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

      const rows = data.rows.map((row) => [
        formatDate(row.date),
        row.voucherNumber,
        row.type,
        row.description ||
          (row.linkedProjectName ? `Linked: ${row.linkedProjectName}` : "-"),
        row.qtyIn ? formatNum(row.qtyIn) : "-",
        row.qtyOut ? formatNum(row.qtyOut) : "-",
        `${formatNum(row.runningQtyBalance)} ${data.item.unit}`,
      ]);

      const footerRow = [
        "",
        "TOTALS",
        "",
        "",
        formatNum(data.totalQtyIn),
        formatNum(data.totalQtyOut),
        formatNum(data.closingQtyBalance),
      ];

      children = (
        <PdfTable columns={columns} rows={rows} footerRow={footerRow} />
      );
    }
    // 5. Labour Report / Page
    else if (reportType === "labour_report") {
      const data = await getDailyLabourReportData({
        ...params,
        limit: 2000,
        page: 1,
      });
      title = "Daily Labour Operations Report";
      subtitle =
        params.groupBy && params.groupBy !== "none"
          ? `Grouped By: ${params.groupBy.toUpperCase()}`
          : `Comprehensive Labour Transactions Log`;
      summaryItems = [
        { label: "Total Entries", value: formatNum(data.summary.entryCount) },
        {
          label: "Total Mandays / Headcount",
          value: formatNum(data.summary.totalHeadcount),
        },
        {
          label: "Total Labour Spend",
          value: formatRs(data.summary.totalSpend),
        },
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

        const rows = data.data.map((r: LabourGroupedRow) => [
          data.groupBy === "date"
            ? formatDate(r.date)
            : r.workerType || r.projectName || "N/A",
          formatNum(r.totalHeadcount),
          formatRs(r.totalSpend),
        ]);

        const footerRow = [
          "TOTALS",
          formatNum(data.summary.totalHeadcount),
          formatRs(data.summary.totalSpend),
        ];

        children = (
          <PdfTable columns={columns} rows={rows} footerRow={footerRow} />
        );
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

        const rows = data.data.map((r: LabourFlatRow) => [
          formatDate(r.date),
          r.voucherNumber,
          r.projectName,
          r.workerType || "-",
          r.contractorName || "-",
          formatNum(r.headcount),
          formatRs(r.wageRate),
          formatRs(r.totalSpend),
        ]);

        const footerRow = [
          "",
          "TOTALS",
          "",
          "",
          "",
          formatNum(data.summary.totalHeadcount),
          "",
          formatRs(data.summary.totalSpend),
        ];

        children = (
          <PdfTable columns={columns} rows={rows} footerRow={footerRow} />
        );
      }
    }
    // 6. Saturday View
    else if (reportType === "saturday_view") {
      const data = await getSaturdayViewReportData();
      title = "Saturday Financial Due Snapshot";
      subtitle = `Upcoming Saturday Reference: ${formatDate(data.comingSaturday)}`;
      summaryItems = [
        {
          label: "Client Dues Coming In",
          value: formatRs(data.totalClientDues),
        },
        {
          label: "Labour Payments Due Out",
          value: formatRs(data.totalLabourDues),
        },
        {
          label: "Net Cash Position",
          value: formatRs(data.totalClientDues - data.totalLabourDues),
        },
      ];

      const clientCols: PdfColumn[] = [
        { header: "Due Date", width: "15%" },
        { header: "Client Name", flex: 1 },
        { header: "Project", width: "25%" },
        { header: "Invoice #", width: "15%" },
        { header: "Pending Due", width: "18%", align: "right" },
      ];

      const clientRows = data.dueClients.map((c) => [
        formatDate(c.dueDate),
        c.clientName + (c.clientPhone ? ` (${c.clientPhone})` : ""),
        c.projectName,
        c.invoiceNumber,
        formatRs(c.balance),
      ]);

      const labourCols: PdfColumn[] = [
        { header: "Labour Contractor Name", flex: 1 },
        { header: "Phone Contact", width: "35%" },
        { header: "Payable Balance Due", width: "25%", align: "right" },
      ];

      const labourRows = data.labourDues.map((d) => [
        d.contractorName,
        d.contractorPhone || "N/A",
        formatRs(d.payableBalance),
      ]);

      children = (
        <View>
          <Text style={styles.sectionTitle}>
            1. Client Dues This Week (Inflow)
          </Text>
          <PdfTable
            columns={clientCols}
            rows={clientRows}
            footerRow={[
              "",
              "TOTAL CLIENT DUES",
              "",
              "",
              formatRs(data.totalClientDues),
            ]}
            emptyText="No client dues pending for this Saturday."
          />

          <View style={{ marginTop: 12 }}>
            <Text style={styles.sectionTitle}>
              2. Labour Contractor Payments Due (Outflow)
            </Text>
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
      subtitle =
        "Consumption Summary (Excluding Historical Inter-Project Transfers)";
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

      const rows = data.rows.map((r) => [
        r.itemName,
        r.unit,
        formatRs(r.unitCost),
        `${formatNum(r.totalQtyIssued)} ${r.unit}`,
        formatRs(r.totalValueIssued),
      ]);

      const footerRow = [
        "TOTAL VALUE ISSUED",
        "",
        "",
        "",
        formatRs(data.totalValue),
      ];

      children = (
        <PdfTable columns={columns} rows={rows} footerRow={footerRow} />
      );
    }
    // 8. Project Closure Report
    else if (reportType === "closure_report") {
      const report = await renderClosureReport(params.projectId);
      title = report.title;
      subtitle = report.subtitle;
      summaryItems = report.summaryItems;
      children = report.children;
    }
    // 9. BOQ / Client Quotation Report
    else if (reportType === "boq") {
      let boqVersionNumber: number | undefined = undefined;
      if (params.boqId) {
        const target = await prisma.bOQ.findUnique({
          where: { id: params.boqId },
        });
        if (target) {
          boqVersionNumber = target.versionNumber;
        }
      }

      const report = await renderBoqReport({
        projectId: params.projectId,
        boqVersionNumber,
        variant: "full",
        businessProfile,
      });
      if (!report) {
        return NextResponse.json(
          { error: "BOQ or Project not found for quotation export." },
          { status: 404 },
        );
      }
      title = report.title;
      subtitle = report.subtitle;
      summaryItems = report.summaryItems;
      children = report.children;
    } else {
      return NextResponse.json(
        { error: `Unsupported reportType: ${reportType}` },
        { status: 400 },
      );
    }

    // Render through @react-pdf/renderer to buffer
    const pdfDocument = (
      <ReportLayout
        title={title}
        subtitle={subtitle}
        dateRange={dateRange}
        summaryItems={summaryItems}
        businessProfile={businessProfile}
      >
        {children}
      </ReportLayout>
    );

    const buffer = await renderToBuffer(pdfDocument);

    // Stream the PDF straight back in the response — no disk/object-storage
    // write involved, so this works the same in serverless production (where
    // the deployment filesystem is read-only) as it does locally.
    const timestamp = Date.now();
    const fileName = `${reportType}_${timestamp}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("PDF Generation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "Failed to generate PDF report",
      },
      { status: 500 },
    );
  }
}
