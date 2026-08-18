import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ReportsClient, OverviewData, CashFlowData, SaturdayData, Transaction } from "./ReportsClient";
import { DueClient, DueContractor } from "./saturday-view/SaturdayViewClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const initialTab = params?.tab || "overview";

  // Calculate upcoming Saturday date for Saturday View
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
  const daysUntilSaturday = dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
  const comingSaturday = new Date(today);
  comingSaturday.setDate(today.getDate() + daysUntilSaturday);
  comingSaturday.setHours(23, 59, 59, 999);

  // Execute all database queries concurrently
  const [
    invoices,
    vendorTxns,
    siteExpenses,
    labourEntries,
    labourAgg,
    rawSpend,
    clientPayments,
    pendingInvoices,
    rawLabourDues
  ] = await Promise.all([
    // 1. Invoices for overview
    prisma.invoice.findMany({
      include: { clientPayments: true, paymentAllocations: true }
    }),
    // 2. Vendor Transactions for overview & cash flow
    prisma.vendorTransaction.findMany({
      include: { contact: { select: { name: true } } },
      orderBy: { date: 'desc' }
    }),
    // 3. Site expenses for overview & cash flow
    prisma.siteExpense.findMany({
      include: { project: { select: { name: true } } },
      orderBy: { date: 'desc' }
    }),
    // 4. Labour entries for cash flow
    prisma.dailyLabourEntry.findMany({
      include: {
        project: { select: { name: true } },
        workerType: { select: { name: true } },
        contractor: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
    }),
    // 5. Labour Headcount aggregate
    prisma.dailyLabourEntry.aggregate({
      _sum: { headcount: true }
    }),
    // 6. Labour Spend sum
    prisma.$queryRaw<[{ sum: number | null }]>`SELECT SUM(headcount * wage_rate) as sum FROM daily_labour_entries`,
    // 7. Client payments for cash flow
    prisma.clientPayment.findMany({
      include: {
        client: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } }
      },
      orderBy: { paymentDate: 'desc' }
    }),
    // 8. Pending invoices due on or before coming Saturday
    prisma.invoice.findMany({
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
      orderBy: { dueDate: 'asc' }
    }),
    // 9. Raw Labour contractor dues query
    prisma.$queryRaw<any[]>`
      SELECT 
        c.id as "contractorId",
        c.name as "contractorName",
        c.phone as "contractorPhone",
        COALESCE(labour.total_supplied, 0) - COALESCE(payments.total_paid, 0) as "payableBalance"
      FROM contacts c
      LEFT JOIN (
        SELECT contractor_id, SUM(headcount * wage_rate)::float as total_supplied
        FROM daily_labour_entries
        WHERE paid_immediately = false AND contractor_id IS NOT NULL
        GROUP BY contractor_id
      ) labour ON labour.contractor_id = c.id
      LEFT JOIN (
        SELECT contact_id, SUM(amount)::float as total_paid
        FROM labour_payments
        GROUP BY contact_id
      ) payments ON payments.contact_id = c.id
      WHERE c.type::text = 'LABOUR_CONTRACTOR'
        AND (COALESCE(labour.total_supplied, 0) - COALESCE(payments.total_paid, 0)) > 0
      ORDER BY (COALESCE(labour.total_supplied, 0) - COALESCE(payments.total_paid, 0)) DESC
    `
  ]);

  // Overview calculations
  const totalCollected = invoices.reduce((sum, inv) => 
    sum + inv.clientPayments.reduce((pSum, p) => pSum + Number(p.amount), 0) + inv.paymentAllocations.reduce((pSum, p) => pSum + Number(p.allocatedAmount), 0)
  , 0);

  const vendorPurchases = vendorTxns.filter(t => t.type === "PURCHASE").reduce((sum, t) => sum + Number(t.amount), 0);
  const vendorPayments = vendorTxns.filter(t => t.type === "PAYMENT").reduce((sum, t) => sum + Number(t.amount), 0);
  const vendorBalanceDue = vendorPurchases - vendorPayments;

  const totalExpenses = siteExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalHeadcount = labourAgg._sum.headcount || 0;
  const totalLabourSpend = rawSpend[0]?.sum ? Number(rawSpend[0].sum) : 0;
  const netCashflow = totalCollected - (vendorPayments + totalExpenses + totalLabourSpend);

  const overviewData: OverviewData = {
    totalCollected,
    invoicesCount: invoices.length,
    vendorPayments,
    vendorPurchases,
    totalExpenses,
    totalLabourSpend,
    netCashflow,
    vendorBalanceDue,
    totalHeadcount,
  };

  // Cash Flow calculations
  const totalIn = clientPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalVendorOut = vendorPayments;
  const totalExpenseOut = totalExpenses;
  const totalLabourOut = labourEntries.reduce((sum, l) => sum + (Number(l.headcount) * Number(l.wageRate)), 0);
  const totalOut = totalVendorOut + totalExpenseOut + totalLabourOut;
  const netPosition = totalIn - totalOut;

  const rawTransactions = [
    ...clientPayments.map(p => ({
      id: p.id,
      dateObj: p.paymentDate,
      type: "IN" as const,
      category: "Client Payment",
      description: `${p.client.name} ${p.invoice ? `(Inv: ${p.invoice.invoiceNumber})` : '(Advance/Allocated)'}`,
      amount: Number(p.amount)
    })),
    ...vendorTxns.filter(p => p.type === "PAYMENT").map(p => ({
      id: p.id,
      dateObj: p.date,
      type: "OUT" as const,
      category: "Vendor Payment",
      description: p.contact.name,
      amount: Number(p.amount)
    })),
    ...siteExpenses.map(e => ({
      id: e.id,
      dateObj: e.date,
      type: "OUT" as const,
      category: "Site Expense",
      description: `${e.category} - ${e.project.name}`,
      amount: Number(e.amount)
    })),
    ...labourEntries.map(l => {
      const spend = Number(l.headcount) * Number(l.wageRate);
      const desc = [
        l.workerType?.name || 'Labour',
        l.project?.name ? `(${l.project.name})` : '',
        l.contractor?.name ? `[Brought by: ${l.contractor.name}]` : '',
        `${l.headcount} @ ₹${l.wageRate}`
      ].filter(Boolean).join(' - ');

      return {
        id: l.id,
        dateObj: l.date,
        type: "OUT" as const,
        category: "Labour Wage",
        description: desc,
        amount: spend
      };
    })
  ].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime()).slice(0, 100);

  const transactions: Transaction[] = rawTransactions.map(t => ({
    id: t.id,
    date: t.dateObj.toISOString(),
    type: t.type,
    category: t.category,
    description: t.description,
    amount: t.amount,
  }));

  const cashFlowData: CashFlowData = {
    totalIn,
    totalOut,
    netPosition,
    transactions,
  };

  // Saturday View computations
  const dueClients: DueClient[] = pendingInvoices.map(inv => {
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

  const labourDues: DueContractor[] = rawLabourDues.map(row => ({
    contractorId: row.contractorId,
    contractorName: row.contractorName,
    contractorPhone: row.contractorPhone || null,
    payableBalance: Number(row.payableBalance || 0)
  }));

  const saturdayData: SaturdayData = {
    dueClients,
    labourDues,
    comingSaturdayStr: comingSaturday.toISOString()
  };

  return (
    <ReportsClient
      initialTab={initialTab}
      overviewData={overviewData}
      cashFlowData={cashFlowData}
      saturdayData={saturdayData}
    />
  );
}
