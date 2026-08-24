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
