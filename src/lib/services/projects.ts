import prisma from "@/lib/prisma";
import { ApiError } from "@/app/api/_lib/errors";

/**
 * Moves a project to the Trash Bin (soft delete). Nothing scoped to the
 * project is touched, so it can be fully recovered with `restoreProject`.
 */
export async function trashProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true },
  });
  if (!project) {
    throw new ApiError("Project not found", 404);
  }
  if (project.deletedAt) return;

  await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: new Date() },
  });
}

/** Restores a project from the Trash Bin. */
export async function restoreProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true },
  });
  if (!project) {
    throw new ApiError("Project not found", 404);
  }
  if (!project.deletedAt) {
    throw new ApiError("Project is not in the Trash Bin", 400);
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { deletedAt: null },
  });
}

/**
 * Permanently deletes a project and every record scoped to it.
 *
 * Only projects already in the Trash Bin can be permanently deleted —
 * callers must `trashProject` first.
 *
 * Project has no DB-level cascade for most of its relations, so this
 * removes children in dependency order inside one transaction. Two
 * relations are intentionally *unlinked* rather than deleted:
 *   - ClientPayment.invoiceId  — a client payment is a real record of
 *     money received; it shouldn't vanish just because the invoice's
 *     project was deleted, so it's set to null instead.
 *   - VendorTransaction.projectId — same reasoning for vendor ledger
 *     entries, which is exactly why that field is optional.
 * Everything else listed here belongs solely to the project and is
 * hard-deleted with it.
 */
export async function permanentlyDeleteProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, deletedAt: true },
  });
  if (!project) {
    throw new ApiError("Project not found", 404);
  }
  if (!project.deletedAt) {
    throw new ApiError(
      "Move the project to the Trash Bin before deleting it permanently",
      400,
    );
  }

  const [boqs, invoices] = await Promise.all([
    prisma.bOQ.findMany({ where: { projectId }, select: { id: true } }),
    prisma.invoice.findMany({ where: { projectId }, select: { id: true } }),
  ]);
  const boqIds = boqs.map((b) => b.id);
  const invoiceIds = invoices.map((i) => i.id);

  const sections = boqIds.length
    ? await prisma.bOQSection.findMany({
        where: { boqId: { in: boqIds } },
        select: { id: true },
      })
    : [];
  const sectionIds = sections.map((s) => s.id);

  await prisma.$transaction([
    // BOQ tree (payment milestones cascade at the DB level from BOQ).
    ...(sectionIds.length
      ? [
          prisma.bOQLineItem.deleteMany({
            where: { sectionId: { in: sectionIds } },
          }),
        ]
      : []),
    ...(boqIds.length
      ? [prisma.bOQSection.deleteMany({ where: { boqId: { in: boqIds } } })]
      : []),
    prisma.bOQ.deleteMany({ where: { projectId } }),

    // Invoices (line items cascade at the DB level from Invoice).
    ...(invoiceIds.length
      ? [
          prisma.paymentAllocation.deleteMany({
            where: { invoiceId: { in: invoiceIds } },
          }),
          prisma.clientPayment.updateMany({
            where: { invoiceId: { in: invoiceIds } },
            data: { invoiceId: null },
          }),
        ]
      : []),
    prisma.invoice.deleteMany({ where: { projectId } }),

    // Vendor ledger entries outlive the project; just unlink them.
    prisma.vendorTransaction.updateMany({
      where: { projectId },
      data: { projectId: null },
    }),

    // Everything else is owned exclusively by the project.
    prisma.siteActivity.deleteMany({ where: { projectId } }),
    prisma.extraWork.deleteMany({ where: { projectId } }),
    prisma.siteExpense.deleteMany({ where: { projectId } }),
    prisma.inventoryTransaction.deleteMany({ where: { projectId } }),
    prisma.projectInventory.deleteMany({ where: { projectId } }),
    prisma.dailyLabourEntry.deleteMany({ where: { projectId } }),
    prisma.projectTask.deleteMany({ where: { projectId } }),
    prisma.closureReport.deleteMany({ where: { projectId } }),

    prisma.project.delete({ where: { id: projectId } }),
  ]);
}
