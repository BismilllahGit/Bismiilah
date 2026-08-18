import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface DailyLabourQueryParams {
  projectId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  workerType?: string | null;
  groupBy?: string | null;
  sortBy?: string | null;
  sortOrder?: string | null;
  page?: number;
  limit?: number;
}

export async function getDailyLabourReportData(params: DailyLabourQueryParams) {
  const { 
    projectId, 
    startDate, 
    endDate, 
    workerType, 
    groupBy: rawGroupBy,
    sortBy = "date",
    sortOrder = "desc",
    page = 1,
    limit = 1000 
  } = params;

  const groupBy = rawGroupBy?.toLowerCase();
  const offset = (page - 1) * limit;

  const conditions = [];
  if (projectId && projectId !== "ALL") {
    conditions.push(Prisma.sql`dle.project_id = ${projectId}`);
  }
  if (workerType && workerType !== "ALL") {
    conditions.push(Prisma.sql`(wt.name = ${workerType.toUpperCase()} OR wt.id = ${workerType})`);
  }
  if (startDate) {
    conditions.push(Prisma.sql`dle.date >= CAST(${startDate} as date)`);
  }
  if (endDate) {
    conditions.push(Prisma.sql`dle.date <= CAST(${endDate} as date)`);
  }

  const whereClause = conditions.length > 0 
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` 
    : Prisma.empty;

  // Overall Summary Query
  const summaryQuery = await prisma.$queryRaw<any[]>`
    SELECT 
      COUNT(*)::int as "entryCount",
      COALESCE(SUM(dle.headcount), 0)::int as "totalHeadcount",
      COALESCE(SUM(dle.headcount * dle.wage_rate), 0)::float as "totalSpend"
    FROM daily_labour_entries dle
    LEFT JOIN worker_types wt ON dle.worker_type_id = wt.id
    ${whereClause}
  `;
  const summary = summaryQuery[0] || { entryCount: 0, totalHeadcount: 0, totalSpend: 0 };

  if (groupBy && groupBy !== "none") {
    let groupedResult: any[] = [];
    if (groupBy === "date") {
      groupedResult = await prisma.$queryRaw<any[]>`
        SELECT 
          dle.date,
          COALESCE(SUM(dle.headcount), 0)::int as "totalHeadcount",
          COALESCE(SUM(dle.headcount * dle.wage_rate), 0)::float as "totalSpend"
        FROM daily_labour_entries dle
        LEFT JOIN worker_types wt ON dle.worker_type_id = wt.id
        ${whereClause}
        GROUP BY dle.date
        ORDER BY dle.date DESC
      `;
    } else if (groupBy === "workertype") {
      groupedResult = await prisma.$queryRaw<any[]>`
        SELECT 
          wt.name as "workerType",
          COALESCE(SUM(dle.headcount), 0)::int as "totalHeadcount",
          COALESCE(SUM(dle.headcount * dle.wage_rate), 0)::float as "totalSpend"
        FROM daily_labour_entries dle
        LEFT JOIN worker_types wt ON dle.worker_type_id = wt.id
        ${whereClause}
        GROUP BY wt.name
        ORDER BY "totalSpend" DESC
      `;
    } else if (groupBy === "project") {
      groupedResult = await prisma.$queryRaw<any[]>`
        SELECT 
          p.id as "projectId",
          p.name as "projectName",
          COALESCE(SUM(dle.headcount), 0)::int as "totalHeadcount",
          COALESCE(SUM(dle.headcount * dle.wage_rate), 0)::float as "totalSpend"
        FROM daily_labour_entries dle
        JOIN projects p ON p.id = dle.project_id
        LEFT JOIN worker_types wt ON dle.worker_type_id = wt.id
        ${whereClause}
        GROUP BY p.id, p.name
        ORDER BY "totalSpend" DESC
      `;
    }

    return { summary, data: groupedResult, isGrouped: true, groupBy };
  }

  // Flat List Query
  const sortMap: Record<string, string> = {
    date: "dle.date",
    workerType: "wt.name",
    project: "p.name",
    totalSpend: "(dle.headcount * dle.wage_rate)",
  };
  const orderByCol = (sortBy && sortMap[sortBy]) || "dle.date";
  const orderDir = sortOrder === "asc" ? "ASC" : "DESC";
  const orderBySql = Prisma.raw(`ORDER BY ${orderByCol} ${orderDir}, dle.created_at DESC, dle.id DESC`);

  const flatResult = await prisma.$queryRaw<any[]>`
    SELECT 
      dle.id,
      dle.voucher_number as "voucherNumber",
      dle.project_id as "projectId",
      p.name as "projectName",
      wt.name as "workerType",
      dle.date,
      dle.headcount,
      dle.wage_rate::float as "wageRate",
      dle.contractor_id as "contractorId",
      c.name as "contractorName",
      dle.paid_immediately as "paidImmediately",
      dle.title,
      dle.note,
      (dle.headcount * dle.wage_rate)::float as "totalSpend"
    FROM daily_labour_entries dle
    JOIN projects p ON p.id = dle.project_id
    LEFT JOIN worker_types wt ON dle.worker_type_id = wt.id
    LEFT JOIN contacts c ON c.id = dle.contractor_id
    ${whereClause}
    ${orderBySql}
    LIMIT ${limit} OFFSET ${offset}
  `;

  return {
    summary,
    data: flatResult,
    isGrouped: false,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(summary.entryCount / limit) || 1
    }
  };
}

export async function getSaturdayViewReportData() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
  const daysUntilSaturday = dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
  const comingSaturday = new Date(today);
  comingSaturday.setDate(today.getDate() + daysUntilSaturday);
  comingSaturday.setHours(23, 59, 59, 999);

  // 1. Fetch pending invoices due on or before Saturday
  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      status: { notIn: ["PAID", "VOID"] },
      dueDate: { lte: comingSaturday }
    },
    select: {
      id: true,
      clientId: true,
      invoiceNumber: true,
      dueDate: true,
      amount: true,
      status: true,
      client: { select: { name: true, phone: true } },
      project: { select: { name: true } },
      clientPayments: { select: { amount: true } },
      paymentAllocations: { select: { allocatedAmount: true } }
    },
    orderBy: { dueDate: "asc" }
  });

  const dueClients = pendingInvoices.map(inv => {
    const totalPaid = inv.clientPayments.reduce((acc, p) => acc + Number(p.amount), 0) + 
                      inv.paymentAllocations.reduce((acc, p) => acc + Number(p.allocatedAmount), 0);
    const balance = Number(inv.amount) - totalPaid;
    return {
      id: inv.id,
      clientId: inv.clientId,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client.name,
      clientPhone: inv.client.phone || null,
      projectName: inv.project.name,
      dueDate: inv.dueDate.toISOString(),
      balance: balance,
      status: inv.status
    };
  }).filter(c => c.balance > 0);

  // 2. Fetch labour contractors with positive payable balance using aggregate query
  const rawLabourDues = await prisma.$queryRaw<any[]>`
    SELECT 
      c.id as "contractorId",
      c.name as "contractorName",
      c.phone as "contractorPhone",
      COALESCE(labour.total_supplied, 0) - COALESCE(payments.total_paid, 0) as "payableBalance"
    FROM contacts c
    LEFT JOIN (
      SELECT contractor_id, COALESCE(SUM(headcount * wage_rate), 0) as total_supplied
      FROM daily_labour_entries
      WHERE paid_immediately = false AND contractor_id IS NOT NULL
      GROUP BY contractor_id
    ) labour ON c.id = labour.contractor_id
    LEFT JOIN (
      SELECT contact_id, COALESCE(SUM(amount), 0) as total_paid
      FROM labour_payments
      GROUP BY contact_id
    ) payments ON c.id = payments.contact_id
    WHERE c.type = 'LABOUR_CONTRACTOR' 
      AND c.is_active = true 
      AND (COALESCE(labour.total_supplied, 0) - COALESCE(payments.total_paid, 0)) > 0
    ORDER BY "payableBalance" DESC
  `;

  const totalClientDues = dueClients.reduce((acc, c) => acc + c.balance, 0);
  const totalLabourDues = rawLabourDues.reduce((acc, c) => acc + Number(c.payableBalance), 0);

  return {
    dueClients,
    labourDues: rawLabourDues.map(d => ({ ...d, payableBalance: Number(d.payableBalance) })),
    totalClientDues,
    totalLabourDues,
    comingSaturday: comingSaturday.toISOString()
  };
}

export async function getClosureReportData(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) throw new Error("Project not found");

  const client = await prisma.client.findFirst({
    where: { invoices: { some: { projectId } } }
  });
  const enrichedProject = { ...project, client };

  const existingReport = await prisma.closureReport.findUnique({
    where: { projectId }
  });

  if (existingReport && existingReport.summaryJson) {
    return {
      project: enrichedProject,
      summary: existingReport.summaryJson as any,
      isClosed: project.status === "CLOSED"
    };
  }

  // Calculate closure summary live
  const invoices = await prisma.invoice.findMany({
    where: { projectId, status: { not: "VOID" } },
    select: {
      amount: true,
      clientPayments: { select: { amount: true } },
      paymentAllocations: { select: { allocatedAmount: true } },
    }
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const totalCollected = invoices.reduce((sum, inv) => 
    sum + inv.clientPayments.reduce((pSum, p) => pSum + Number(p.amount), 0) + inv.paymentAllocations.reduce((pSum, p) => pSum + Number(p.allocatedAmount), 0)
  , 0);

  const extraWork = await prisma.extraWork.findMany({
    where: { projectId },
    select: { amount: true, status: true }
  });
  const totalExtraWork = extraWork.reduce((sum, ew) => sum + Number(ew.amount), 0);
  const unbilledExtraWork = extraWork.filter(ew => ew.status === "UNBILLED").reduce((sum, ew) => sum + Number(ew.amount), 0);

  const siteExpenses = await prisma.siteExpense.aggregate({
    where: { projectId },
    _sum: { amount: true }
  });
  const totalSiteExpenses = Number(siteExpenses._sum.amount || 0);

  const inventory = await prisma.projectInventory.findMany({
    where: { projectId },
    select: { qtyIssued: true, item: { select: { unitCost: true } } }
  });
  const totalMaterialCost = inventory.reduce((sum, inv) => sum + (Number(inv.qtyIssued) * Number(inv.item.unitCost)), 0);

  const summary = {
    totalBilled,
    totalCollected,
    outstandingReceivables: totalBilled - totalCollected,
    totalExtraWork,
    unbilledExtraWork,
    totalSiteExpenses,
    estimatedMaterialCost: totalMaterialCost,
    closureDate: new Date().toISOString()
  };

  return {
    project: enrichedProject,
    summary,
    isClosed: project.status === "CLOSED"
  };
}

export async function getTopUsageReportData({ projectId, startDate, endDate, limit = 20 }: { projectId?: string | null, startDate?: string | null, endDate?: string | null, limit?: number }) {
  let dateFilter = Prisma.empty;
  if (startDate && endDate) {
    dateFilter = Prisma.sql`AND date >= CAST(${startDate} as date) AND date <= CAST(${endDate} as date)`;
  } else if (startDate) {
    dateFilter = Prisma.sql`AND date >= CAST(${startDate} as date)`;
  } else if (endDate) {
    dateFilter = Prisma.sql`AND date <= CAST(${endDate} as date)`;
  }

  let projectFilter = Prisma.empty;
  if (projectId && projectId !== "ALL") {
    projectFilter = Prisma.sql`AND project_id = ${projectId}`;
  }

  // Only consider authentic ISSUE transactions, explicitly excluding historical transfers
  const rows = await prisma.$queryRaw<any[]>`
    SELECT 
      i.id as "itemId",
      i.name as "itemName",
      i.unit as unit,
      i.unit_cost as "unitCost",
      COALESCE(SUM(it.quantity), 0)::float as "totalQtyIssued",
      COALESCE(SUM(it.quantity * it.unit_cost), 0)::float as "totalValueIssued"
    FROM inventory_transactions it
    JOIN items i ON i.id = it.item_id
    WHERE it.type = 'ISSUE'
    ${projectFilter}
    ${dateFilter}
    GROUP BY i.id, i.name, i.unit, i.unit_cost
    ORDER BY "totalValueIssued" DESC
    LIMIT ${limit}
  `;

  let totalValue = 0;
  let totalItems = 0;
  const formattedRows = rows.map(r => {
    const value = Number(r.totalValueIssued) || 0;
    const qty = Number(r.totalQtyIssued) || 0;
    totalValue += value;
    totalItems += 1;
    return {
      itemId: r.itemId,
      itemName: r.itemName,
      unit: r.unit,
      unitCost: Number(r.unitCost) || 0,
      totalQtyIssued: qty,
      totalValueIssued: value
    };
  });

  return {
    rows: formattedRows,
    totalValue,
    totalItems,
    startDate,
    endDate
  };
}
