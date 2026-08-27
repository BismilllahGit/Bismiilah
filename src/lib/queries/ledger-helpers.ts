import { Prisma } from "@prisma/client";

/**
 * Builds the "AND <column> >= start AND <column> <= end" (or one-sided, or
 * empty) SQL fragment that every ledger query in this file constructs by
 * hand today. `columnSql` is a trusted, hard-coded column reference from the
 * call site (e.g. "dle.date", "date", "it.date") — never user input — so
 * `Prisma.raw` is safe here the same way the original inline template
 * literals were.
 */
export function buildDateRangeFilter(
  columnSql: string,
  startDate?: string | null,
  endDate?: string | null,
): Prisma.Sql {
  if (startDate && endDate) {
    return Prisma.sql`AND ${Prisma.raw(columnSql)} >= ${new Date(startDate)} AND ${Prisma.raw(columnSql)} <= ${new Date(endDate)}`;
  }
  if (startDate) {
    return Prisma.sql`AND ${Prisma.raw(columnSql)} >= ${new Date(startDate)}`;
  }
  if (endDate) {
    return Prisma.sql`AND ${Prisma.raw(columnSql)} <= ${new Date(endDate)}`;
  }
  return Prisma.empty;
}

/**
 * Builds the "WHERE description ILIKE ... OR voucherNumber ILIKE ..." outer
 * filter applied after the running-balance window function, or an empty
 * fragment when there's no search term.
 */
export function buildSearchFilter(search?: string | null): Prisma.Sql {
  const trimmed = search?.trim();
  if (!trimmed) return Prisma.empty;
  const pattern = `%${trimmed}%`;
  return Prisma.sql`WHERE description ILIKE ${pattern} OR "voucherNumber" ILIKE ${pattern}`;
}

/**
 * The "how much of the page-1..N-1 balance carries forward onto this page"
 * arithmetic that's identical across all four ledger functions: if the
 * requested page starts partway through the row list, the opening balance
 * for that page is the running balance of the row just before it; if the
 * page starts past the end of the list, it's the final running balance;
 * otherwise it's the un-paginated opening balance.
 */
export function paginateWithCarriedBalance<Row extends { runningBalance: number }>(
  rows: Row[],
  openingBalance: number,
  page: number,
  limit: number,
) {
  const total = rows.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;

  const pageOpeningBalance =
    offset > 0 && offset <= rows.length
      ? rows[offset - 1].runningBalance
      : offset > rows.length && rows.length > 0
        ? rows[rows.length - 1].runningBalance
        : openingBalance;

  return {
    total,
    totalPages,
    offset,
    pageOpeningBalance,
    pageRows: rows.slice(offset, offset + limit),
  };
}

export interface RawLedgerRow {
  id: string;
  voucherNumber: string;
  date: unknown;
  description: string;
  debit: unknown;
  credit: unknown;
  runningBalance: unknown;
}

export interface FormattedLedgerRow {
  id: string;
  voucherNumber: string;
  date: unknown;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

/**
 * Shared tail for getVendorLedgerData / getLabourContractorLedgerData /
 * getClientLedgerData: format raw rows, accumulate totals, compute the
 * closing balance (direction depends on the entity — see
 * `creditIncreasesBalance`), then paginate with carried-forward balance.
 */
export function finalizeDebitCreditLedger(
  rawRows: RawLedgerRow[],
  opts: { openingBalance: number; page: number; limit: number; creditIncreasesBalance: boolean },
) {
  let totalDebit = 0;
  let totalCredit = 0;

  const formattedRows: FormattedLedgerRow[] = rawRows.map((row) => {
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

  const closingBalance = opts.creditIncreasesBalance
    ? opts.openingBalance + totalCredit - totalDebit
    : opts.openingBalance + totalDebit - totalCredit;

  const { total, totalPages, pageOpeningBalance, pageRows } = paginateWithCarriedBalance(
    formattedRows,
    opts.openingBalance,
    opts.page,
    opts.limit,
  );

  return {
    rows: pageRows,
    totalDebit,
    totalCredit,
    closingBalance,
    total,
    totalPages,
    page: opts.page,
    limit: opts.limit,
    openingBalance: pageOpeningBalance,
    rawOpeningBalance: opts.openingBalance,
  };
}
