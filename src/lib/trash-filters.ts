import { Prisma } from "@prisma/client";

/**
 * Filters that keep data belonging to projects in the Trash Bin out of
 * cross-project totals and listings. Restoring a project brings its data
 * back everywhere because nothing is actually deleted.
 */

/** For models with a required `project` relation. */
export const IN_ACTIVE_PROJECT = { project: { deletedAt: null } } as const;

/**
 * For models whose `projectId` is optional (VendorTransaction,
 * ClientPayment): rows not tied to any project are kept.
 */
export const IN_ACTIVE_PROJECT_OR_NONE = {
  OR: [{ projectId: null }, { project: { deletedAt: null } }],
};

/** Raw SQL condition: `column` does not point at a trashed project. */
export function notInTrashedProjectSql(column: string) {
  return Prisma.sql`${Prisma.raw(column)} NOT IN (SELECT id FROM projects WHERE deleted_at IS NOT NULL)`;
}
