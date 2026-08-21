import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface LedgerQueryParams {
  startDate?: string | null;
  endDate?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
}

export async function getVendorLedgerData(
  contactId: string,
  params: LedgerQueryParams,
) {
  const { startDate, endDate, page = 1, limit = 50 } = params;
  const search = params.search?.trim();

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, name: true, type: true, phone: true },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  // 1. Calculate opening balance (before startDate)
  let openingBalance = 0;
  if (startDate) {
    const startDt = new Date(startDate);
    if (contact.type === "LABOUR_CONTRACTOR") {
      const creditRes = await prisma.$queryRaw<{ total_credit: number }[]>`
        SELECT COALESCE(SUM(headcount * wage_rate), 0) as total_credit
        FROM daily_labour_entries
        WHERE contractor_id = ${contactId} AND date < ${startDt} AND paid_immediately = false
      `;
      const debitRes = await prisma.$queryRaw<{ total_debit: number }[]>`
        SELECT COALESCE(SUM(amount), 0) as total_debit
        FROM labour_payments
        WHERE contact_id = ${contactId} AND payment_date < ${startDt}
      `;
      const vendorRes = await prisma.$queryRaw<{ opening_balance: number }[]>`
        SELECT COALESCE(SUM(CASE WHEN type = 'PURCHASE' THEN amount ELSE -amount END), 0) as opening_balance
        FROM vendor_transactions
        WHERE contact_id = ${contactId} AND date < ${startDt}
      `;
      openingBalance =
        (Number(creditRes[0]?.total_credit) || 0) -
        (Number(debitRes[0]?.total_debit) || 0) +
        (Number(vendorRes[0]?.opening_balance) || 0);
    } else {
      const result = await prisma.$queryRaw<{ opening_balance: number }[]>`
        SELECT COALESCE(SUM(CASE WHEN type = 'PURCHASE' THEN amount ELSE -amount END), 0) as opening_balance
        FROM vendor_transactions
        WHERE contact_id = ${contactId} AND date < ${startDt}
      `;
      openingBalance = Number(result[0]?.opening_balance) || 0;
    }
  }

  // Define the outer search filter to apply AFTER balances are calculated
  let searchOuterFilter = Prisma.empty;
  if (search) {
    const searchStr = `%${search}%`;
    searchOuterFilter = Prisma.sql`WHERE description ILIKE ${searchStr} OR "voucherNumber" ILIKE ${searchStr}`;
  }

  // 2. Build the main query with Prisma.sql for conditional date filtering
  let rows: any[] = [];
  if (contact.type === "LABOUR_CONTRACTOR") {
    let dateFilterLabour = Prisma.empty;
    let dateFilterPayment = Prisma.empty;
    let dateFilterVendor = Prisma.empty;

    if (startDate && endDate) {
      dateFilterLabour = Prisma.sql`AND dle.date >= ${new Date(startDate)} AND dle.date <= ${new Date(endDate)}`;
      dateFilterPayment = Prisma.sql`AND payment_date >= ${new Date(startDate)} AND payment_date <= ${new Date(endDate)}`;
      dateFilterVendor = Prisma.sql`AND date >= ${new Date(startDate)} AND date <= ${new Date(endDate)}`;
    } else if (startDate) {
      dateFilterLabour = Prisma.sql`AND dle.date >= ${new Date(startDate)}`;
      dateFilterPayment = Prisma.sql`AND payment_date >= ${new Date(startDate)}`;
      dateFilterVendor = Prisma.sql`AND date >= ${new Date(startDate)}`;
    } else if (endDate) {
      dateFilterLabour = Prisma.sql`AND dle.date <= ${new Date(endDate)}`;
      dateFilterPayment = Prisma.sql`AND payment_date <= ${new Date(endDate)}`;
      dateFilterVendor = Prisma.sql`AND date <= ${new Date(endDate)}`;
    }

    rows = await prisma.$queryRaw<any[]>`
      WITH contractor_ledger AS (
        SELECT 
          dle.id,
          dle.voucher_number as "voucherNumber",
          dle.date,
          CONCAT('Daily Labour: ', dle.headcount, ' x ₹', dle.wage_rate, ' (', COALESCE(wt.name, 'WORKER'), ')', CASE WHEN dle.title IS NOT NULL AND dle.title <> '' THEN CONCAT(' - ', dle.title) ELSE '' END) as description,
          0::float as debit,
          (dle.headcount * dle.wage_rate)::float as credit,
          dle.created_at
        FROM daily_labour_entries dle
        LEFT JOIN worker_types wt ON dle.worker_type_id = wt.id
        WHERE dle.contractor_id = ${contactId} AND dle.paid_immediately = false
        ${dateFilterLabour}

        UNION ALL

        SELECT 
          id,
          voucher_number as "voucherNumber",
          payment_date as date,
          CONCAT('Labour Payment (', method, ')', CASE WHEN note IS NOT NULL AND note <> '' THEN CONCAT(': ', note) ELSE '' END) as description,
          amount::float as debit,
          0::float as credit,
          created_at
        FROM labour_payments
        WHERE contact_id = ${contactId}
        ${dateFilterPayment}

        UNION ALL

        SELECT 
          id,
          voucher_number as "voucherNumber",
          date,
          COALESCE(description, 'Vendor Transaction') as description,
          CASE WHEN type = 'PAYMENT' THEN amount::float ELSE 0::float END as debit,
          CASE WHEN type = 'PURCHASE' THEN amount::float ELSE 0::float END as credit,
          created_at
        FROM vendor_transactions
        WHERE contact_id = ${contactId}
        ${dateFilterVendor}
      ),
      calculated AS (
        SELECT 
          id,
          "voucherNumber",
          date,
          description,
          debit,
          credit,
          created_at,
          ${openingBalance} + SUM(credit - debit) OVER (ORDER BY date, created_at, id) AS "runningBalance"
        FROM contractor_ledger
      )
      SELECT * FROM calculated
      ${searchOuterFilter}
      ORDER BY date, created_at, id
    `;
  } else {
    let dateFilter = Prisma.empty;
    if (startDate && endDate) {
      dateFilter = Prisma.sql`AND date >= ${new Date(startDate)} AND date <= ${new Date(endDate)}`;
    } else if (startDate) {
      dateFilter = Prisma.sql`AND date >= ${new Date(startDate)}`;
    } else if (endDate) {
      dateFilter = Prisma.sql`AND date <= ${new Date(endDate)}`;
    }

    rows = await prisma.$queryRaw<any[]>`
      WITH calculated AS (
        SELECT 
          id,
          voucher_number as "voucherNumber", 
          date, 
          description,
          CASE WHEN type = 'PAYMENT' THEN amount ELSE 0 END AS debit,
          CASE WHEN type = 'PURCHASE' THEN amount ELSE 0 END AS credit,
          created_at,
          ${openingBalance} + SUM(CASE WHEN type = 'PURCHASE' THEN amount ELSE -amount END)
            OVER (ORDER BY date, created_at, id) AS "runningBalance"
        FROM vendor_transactions
        WHERE contact_id = ${contactId}
        ${dateFilter}
      )
      SELECT * FROM calculated
      ${searchOuterFilter}
      ORDER BY date, created_at, id
    `;
  }

  let totalDebit = 0;
  let totalCredit = 0;

  const formattedRows = rows.map((row) => {
    const debit = Number(row.debit);
    const credit = Number(row.credit);
    totalDebit += debit;
    totalCredit += credit;

    return {
      id: row.id,
      voucherNumber: row.voucherNumber,
      date: row.date,
      description: row.description,
      debit,
      credit,
      runningBalance: Number(row.runningBalance),
    };
  });

  const closingBalance = openingBalance + totalCredit - totalDebit;

  const total = formattedRows.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;

  const pageOpeningBalance =
    offset > 0 && offset <= formattedRows.length
      ? formattedRows[offset - 1].runningBalance
      : offset > formattedRows.length && formattedRows.length > 0
        ? formattedRows[formattedRows.length - 1].runningBalance
        : openingBalance;

  const paginatedRows = formattedRows.slice(offset, offset + limit);

  return {
    contact,
    openingBalance: pageOpeningBalance,
    rows: paginatedRows,
    totalDebit,
    totalCredit,
    closingBalance,
    total,
    totalPages,
    page,
    limit,
    rawOpeningBalance: openingBalance,
  };
}

export async function getLabourContractorLedgerData(
  contactId: string,
  params: LedgerQueryParams,
) {
  const { startDate, endDate, page = 1, limit = 50 } = params;
  const search = params.search?.trim();

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, name: true, type: true, phone: true },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  // 1. Calculate opening balance before startDate
  let openingBalance = 0;
  if (startDate) {
    const startDt = new Date(startDate);
    const creditRes = await prisma.$queryRaw<{ total_labour: number }[]>`
      SELECT COALESCE(SUM(headcount * wage_rate), 0) as total_labour
      FROM daily_labour_entries
      WHERE contractor_id = ${contactId} AND date < ${startDt} AND paid_immediately = false
    `;
    const debitRes = await prisma.$queryRaw<{ total_paid: number }[]>`
      SELECT COALESCE(SUM(amount), 0) as total_paid
      FROM labour_payments
      WHERE contact_id = ${contactId} AND payment_date < ${startDt}
    `;
    openingBalance =
      (Number(creditRes[0]?.total_labour) || 0) -
      (Number(debitRes[0]?.total_paid) || 0);
  }

  let dateFilterLabour = Prisma.empty;
  let dateFilterPayment = Prisma.empty;

  if (startDate && endDate) {
    dateFilterLabour = Prisma.sql`AND dle.date >= ${new Date(startDate)} AND dle.date <= ${new Date(endDate)}`;
    dateFilterPayment = Prisma.sql`AND payment_date >= ${new Date(startDate)} AND payment_date <= ${new Date(endDate)}`;
  } else if (startDate) {
    dateFilterLabour = Prisma.sql`AND dle.date >= ${new Date(startDate)}`;
    dateFilterPayment = Prisma.sql`AND payment_date >= ${new Date(startDate)}`;
  } else if (endDate) {
    dateFilterLabour = Prisma.sql`AND dle.date <= ${new Date(endDate)}`;
    dateFilterPayment = Prisma.sql`AND payment_date <= ${new Date(endDate)}`;
  }

  let searchOuterFilter = Prisma.empty;
  if (search) {
    const searchStr = `%${search}%`;
    searchOuterFilter = Prisma.sql`WHERE description ILIKE ${searchStr} OR "voucherNumber" ILIKE ${searchStr}`;
  }

  const rawRows = await prisma.$queryRaw<any[]>`
    WITH combined AS (
      SELECT 
        dle.id,
        dle.voucher_number AS "voucherNumber", 
        dle.date, 
        CASE 
          WHEN dle.title IS NULL OR dle.title = '' THEN CONCAT('Labour supplied: ', dle.headcount, ' ', COALESCE(wt.name, 'WORKER'), ' @ ₹', dle.wage_rate)
          ELSE CONCAT(dle.title, ' (', dle.headcount, ' ', COALESCE(wt.name, 'WORKER'), ' @ ₹', dle.wage_rate, ')')
        END AS description,
        (dle.headcount * dle.wage_rate)::float AS debit, 
        0::float AS credit, 
        dle.created_at
      FROM daily_labour_entries dle
      LEFT JOIN worker_types wt ON dle.worker_type_id = wt.id
      WHERE dle.contractor_id = ${contactId} AND dle.paid_immediately = false
      ${dateFilterLabour}

      UNION ALL

      SELECT 
        id,
        voucher_number AS "voucherNumber", 
        payment_date AS date,
        CASE 
          WHEN note IS NULL OR note = '' THEN CONCAT('Payment out (', method, ')')
          ELSE CONCAT(note, ' (', method, ')')
        END AS description,
        0::float AS debit, 
        amount::float AS credit, 
        created_at
      FROM labour_payments
      WHERE contact_id = ${contactId}
      ${dateFilterPayment}
    ),
    calculated AS (
      SELECT 
        id,
        "voucherNumber",
        date,
        description,
        debit,
        credit,
        created_at,
        ${openingBalance} + SUM(debit - credit) OVER (ORDER BY date, created_at, id) AS "runningBalance"
      FROM combined
    )
    SELECT * FROM calculated
    ${searchOuterFilter}
    ORDER BY date, created_at, id
  `;

  let totalDebit = 0;
  let totalCredit = 0;

  const formattedRows = rawRows.map((row) => {
    const debit = Number(row.debit);
    const credit = Number(row.credit);
    totalDebit += debit;
    totalCredit += credit;

    return {
      id: row.id,
      voucherNumber: row.voucherNumber,
      date: row.date,
      description: row.description,
      debit,
      credit,
      runningBalance: Number(row.runningBalance),
    };
  });

  const closingBalance = openingBalance + totalDebit - totalCredit;
  const total = formattedRows.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;

  const pageOpeningBalance =
    offset > 0 && offset <= formattedRows.length
      ? formattedRows[offset - 1].runningBalance
      : offset > formattedRows.length && formattedRows.length > 0
        ? formattedRows[formattedRows.length - 1].runningBalance
        : openingBalance;

  const paginatedRows = formattedRows.slice(offset, offset + limit);

  return {
    contact,
    openingBalance: pageOpeningBalance,
    rows: paginatedRows,
    totalDebit,
    totalCredit,
    closingBalance,
    total,
    totalPages,
    page,
    limit,
    rawOpeningBalance: openingBalance,
  };
}

export async function getClientLedgerData(
  clientId: string,
  params: LedgerQueryParams,
) {
  const { startDate, endDate, page = 1, limit = 50 } = params;
  const search = params.search?.trim();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, phone: true },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  let openingBalance = 0;
  if (startDate) {
    const startDt = new Date(startDate);
    const result = await prisma.$queryRaw<{ opening_balance: number }[]>`
      WITH combined AS (
        SELECT amount AS debit, 0 AS credit, issued_date as date
        FROM invoices 
        WHERE client_id = ${clientId} AND status != 'VOID'
        UNION ALL
        SELECT 0 AS debit, amount AS credit, payment_date as date
        FROM client_payments 
        WHERE client_id = ${clientId}
      )
      SELECT COALESCE(SUM(debit - credit), 0) as opening_balance
      FROM combined
      WHERE date < ${startDt}
    `;
    openingBalance = Number(result[0]?.opening_balance) || 0;
  }

  let dateFilterInvoices = Prisma.empty;
  let dateFilterPayments = Prisma.empty;

  if (startDate && endDate) {
    dateFilterInvoices = Prisma.sql`AND issued_date >= ${new Date(startDate)} AND issued_date <= ${new Date(endDate)}`;
    dateFilterPayments = Prisma.sql`AND payment_date >= ${new Date(startDate)} AND payment_date <= ${new Date(endDate)}`;
  } else if (startDate) {
    dateFilterInvoices = Prisma.sql`AND issued_date >= ${new Date(startDate)}`;
    dateFilterPayments = Prisma.sql`AND payment_date >= ${new Date(startDate)}`;
  } else if (endDate) {
    dateFilterInvoices = Prisma.sql`AND issued_date <= ${new Date(endDate)}`;
    dateFilterPayments = Prisma.sql`AND payment_date <= ${new Date(endDate)}`;
  }

  let searchOuterFilter = Prisma.empty;
  if (search) {
    const searchStr = `%${search}%`;
    searchOuterFilter = Prisma.sql`WHERE description ILIKE ${searchStr} OR "voucherNumber" ILIKE ${searchStr}`;
  }

  const rows = await prisma.$queryRaw<any[]>`
    WITH combined AS (
      SELECT 
        invoice_number AS "voucherNumber", 
        issued_date AS date,
        COALESCE(NULLIF(notes, ''), CONCAT('Invoice raised (', invoice_number, ')')) AS description, 
        amount AS debit, 
        0 AS credit,
        created_at, 
        id
      FROM invoices 
      WHERE client_id = ${clientId} AND status != 'VOID'
      ${dateFilterInvoices}
      
      UNION ALL
      
      SELECT 
        voucher_number AS "voucherNumber", 
        payment_date AS date,
        COALESCE(NULLIF(note, ''), CASE WHEN invoice_id IS NULL THEN 'Advance payment (unallocated)' ELSE 'Payment received' END) AS description,
        0 AS debit, 
        amount AS credit,
        created_at, 
        id
      FROM client_payments 
      WHERE client_id = ${clientId}
      ${dateFilterPayments}
    ),
    calculated AS (
      SELECT 
        id,
        "voucherNumber",
        date,
        description,
        debit,
        credit,
        created_at,
        ${openingBalance} + SUM(debit - credit) OVER (ORDER BY date, created_at, id) AS "runningBalance"
      FROM combined
    )
    SELECT * FROM calculated
    ${searchOuterFilter}
    ORDER BY date, created_at, id
  `;

  let totalDebit = 0;
  let totalCredit = 0;

  const formattedRows = rows.map((row) => {
    const debit = Number(row.debit);
    const credit = Number(row.credit);
    totalDebit += debit;
    totalCredit += credit;

    return {
      id: row.id,
      voucherNumber: row.voucherNumber,
      date: row.date,
      description: row.description,
      debit,
      credit,
      runningBalance: Number(row.runningBalance),
    };
  });

  const closingBalance = openingBalance + totalDebit - totalCredit;
  const total = formattedRows.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;

  const pageOpeningBalance =
    offset > 0 && offset <= formattedRows.length
      ? formattedRows[offset - 1].runningBalance
      : offset > formattedRows.length && formattedRows.length > 0
        ? formattedRows[formattedRows.length - 1].runningBalance
        : openingBalance;

  const paginatedRows = formattedRows.slice(offset, offset + limit);

  return {
    client,
    openingBalance: pageOpeningBalance,
    rows: paginatedRows,
    totalDebit,
    totalCredit,
    closingBalance,
    total,
    totalPages,
    page,
    limit,
    rawOpeningBalance: openingBalance,
  };
}

export async function getInventoryLedgerData(
  projectId: string,
  itemId: string,
  params: LedgerQueryParams,
) {
  const { startDate, endDate, page = 1, limit = 50 } = params;
  const search = params.search?.trim();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, id: true },
  });
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { name: true, unit: true, unitCost: true },
  });

  if (!project || !item) {
    throw new Error("Project or Item not found");
  }

  let openingQtyBalance = 0;
  let openingValueBalance = 0;

  if (startDate) {
    const startDt = new Date(startDate);
    const result = await prisma.$queryRaw<
      { opening_qty_balance: number; opening_value_balance: number }[]
    >`
      SELECT 
        COALESCE(SUM(CASE WHEN type IN ('BUY','RETURN','TRANSFER_IN') THEN quantity ELSE -quantity END), 0) AS opening_qty_balance,
        COALESCE(SUM((CASE WHEN type IN ('BUY','RETURN','TRANSFER_IN') THEN quantity ELSE -quantity END) * unit_cost), 0) AS opening_value_balance
      FROM inventory_transactions
      WHERE project_id = ${projectId} AND item_id = ${itemId} AND date < ${startDt}
    `;
    openingQtyBalance = Number(result[0]?.opening_qty_balance) || 0;
    openingValueBalance = Number(result[0]?.opening_value_balance) || 0;
  }

  let dateFilter = Prisma.empty;
  if (startDate && endDate) {
    dateFilter = Prisma.sql`AND it.date >= ${new Date(startDate)} AND it.date <= ${new Date(endDate)}`;
  } else if (startDate) {
    dateFilter = Prisma.sql`AND it.date >= ${new Date(startDate)}`;
  } else if (endDate) {
    dateFilter = Prisma.sql`AND it.date <= ${new Date(endDate)}`;
  }

  let searchOuterFilter = Prisma.empty;
  if (search) {
    const searchStr = `%${search}%`;
    searchOuterFilter = Prisma.sql`WHERE description ILIKE ${searchStr} OR "voucherNumber" ILIKE ${searchStr}`;
  }

  const rows = await prisma.$queryRaw<any[]>`
    WITH calculated AS (
      SELECT 
        it.id,
        it.voucher_number as "voucherNumber", 
        it.date, 
        it.note as description,
        it.type,
        CASE WHEN it.type IN ('BUY','RETURN','TRANSFER_IN') THEN it.quantity ELSE 0 END AS qty_in,
        CASE WHEN it.type NOT IN ('BUY','RETURN','TRANSFER_IN') THEN it.quantity ELSE 0 END AS qty_out,
        it.unit_cost as "unitCost",
        it.transfer_group_id as "transferGroupId",
        linked_project.name as "linkedProjectName",
        it.created_at,
        ${openingQtyBalance} + SUM(CASE WHEN it.type IN ('BUY','RETURN','TRANSFER_IN') THEN it.quantity ELSE -it.quantity END)
          OVER (ORDER BY it.date, it.created_at, it.id) AS "runningQtyBalance",
        ${openingValueBalance} + SUM((CASE WHEN it.type IN ('BUY','RETURN','TRANSFER_IN') THEN it.quantity ELSE -it.quantity END) * it.unit_cost)
          OVER (ORDER BY it.date, it.created_at, it.id) AS "runningValueBalance"
      FROM inventory_transactions it
      LEFT JOIN inventory_transactions linked_tx 
        ON linked_tx.transfer_group_id = it.transfer_group_id 
        AND linked_tx.id != it.id
      LEFT JOIN projects linked_project
        ON linked_project.id = linked_tx.project_id
      WHERE it.project_id = ${projectId} AND it.item_id = ${itemId}
      ${dateFilter}
    )
    SELECT * FROM calculated
    ${searchOuterFilter}
    ORDER BY date, created_at, id
  `;

  let totalQtyIn = 0;
  let totalQtyOut = 0;
  let totalValueIn = 0;
  let totalValueOut = 0;

  const formattedRows = rows.map((row) => {
    const qtyIn = Number(row.qty_in);
    const qtyOut = Number(row.qty_out);
    const unitCost = Number(row.unitCost);
    const valueIn = qtyIn * unitCost;
    const valueOut = qtyOut * unitCost;

    totalQtyIn += qtyIn;
    totalQtyOut += qtyOut;
    totalValueIn += valueIn;
    totalValueOut += valueOut;

    return {
      id: row.id,
      voucherNumber: row.voucherNumber,
      date: row.date,
      description: row.description,
      type: row.type,
      qtyIn,
      qtyOut,
      unitCost,
      transferGroupId: row.transferGroupId,
      linkedProjectName: row.linkedProjectName,
      runningQtyBalance: Number(row.runningQtyBalance),
      runningValueBalance: Number(row.runningValueBalance),
    };
  });

  const closingQtyBalance = openingQtyBalance + totalQtyIn - totalQtyOut;
  const closingValueBalance =
    openingValueBalance + totalValueIn - totalValueOut;

  const total = formattedRows.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;

  const pageOpeningQtyBalance =
    offset > 0 && offset <= formattedRows.length
      ? formattedRows[offset - 1].runningQtyBalance
      : offset > formattedRows.length && formattedRows.length > 0
        ? formattedRows[formattedRows.length - 1].runningQtyBalance
        : openingQtyBalance;

  const pageOpeningValueBalance =
    offset > 0 && offset <= formattedRows.length
      ? formattedRows[offset - 1].runningValueBalance
      : offset > formattedRows.length && formattedRows.length > 0
        ? formattedRows[formattedRows.length - 1].runningValueBalance
        : openingValueBalance;

  const paginatedRows = formattedRows.slice(offset, offset + limit);

  return {
    project,
    item,
    openingQtyBalance: pageOpeningQtyBalance,
    openingValueBalance: pageOpeningValueBalance,
    rows: paginatedRows,
    totalQtyIn,
    totalQtyOut,
    totalValueIn,
    totalValueOut,
    closingQtyBalance,
    closingValueBalance,
    total,
    totalPages,
    page,
    limit,
    rawOpeningQtyBalance: openingQtyBalance,
  };
}
