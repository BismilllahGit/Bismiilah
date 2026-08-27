import prisma from "@/lib/prisma";
import { ApiError } from "./errors";

const NOT_DRAFT_MESSAGE =
  "Cannot modify this BOQ. Only DRAFT BOQs can be edited.";

/** Fetches a BOQSection with its parent BOQ and throws unless the BOQ is DRAFT. */
export async function assertBoqSectionEditable(sectionId: string) {
  const section = await prisma.bOQSection.findUnique({
    where: { id: sectionId },
    include: { boq: true },
  });
  if (!section) throw new ApiError("Section not found", 404);
  if (section.boq.status !== "DRAFT") throw new ApiError(NOT_DRAFT_MESSAGE, 403);
  return section;
}

/** Fetches a BOQLineItem with its section+BOQ. Does NOT throw on non-DRAFT —
 *  line items allow limited edits (executedQuantity/executedAmount) while
 *  ACTIVE; the route itself decides what's allowed at which status. */
export async function getLineItemWithBoqStatus(lineItemId: string) {
  const lineItem = await prisma.bOQLineItem.findUnique({
    where: { id: lineItemId },
    include: { section: { include: { boq: true } } },
  });
  if (!lineItem) throw new ApiError("Line item not found", 404);
  return lineItem;
}

/** Fetches a BOQPaymentMilestone with its parent BOQ and throws unless DRAFT. */
export async function assertMilestoneEditable(milestoneId: string) {
  const milestone = await prisma.bOQPaymentMilestone.findUnique({
    where: { id: milestoneId },
    include: { boq: true },
  });
  if (!milestone) throw new ApiError("Milestone not found", 404);
  if (milestone.boq.status !== "DRAFT") throw new ApiError(NOT_DRAFT_MESSAGE, 403);
  return milestone;
}

/** Used by the two reorder routes: looks up the BOQ status via whichever
 *  entity the first item in the batch refers to. Assumes a non-empty batch —
 *  callers pass `items[0]` after Zod's `.min(1)` already guarantees at least
 *  one item. */
export async function getBoqStatusForFirstReorderItem(
  first: { id: string },
  kind: "milestone" | "section-or-line-item",
  type?: "section" | "line-item",
): Promise<string> {
  if (kind === "milestone") {
    const ms = await prisma.bOQPaymentMilestone.findUnique({
      where: { id: first.id },
      include: { boq: true },
    });
    return ms?.boq.status ?? "DRAFT";
  }
  if (type === "section") {
    const sec = await prisma.bOQSection.findUnique({ where: { id: first.id }, include: { boq: true } });
    return sec?.boq.status ?? "DRAFT";
  }
  const li = await prisma.bOQLineItem.findUnique({
    where: { id: first.id },
    include: { section: { include: { boq: true } } },
  });
  return li?.section.boq.status ?? "DRAFT";
}

/** Throws unless the given BOQ status is DRAFT. Used by the two reorder
 *  routes after they look up the parent BOQ's status via
 *  getBoqStatusForFirstReorderItem — kept reorder-specific in name and
 *  message since its 403 text is about reordering, not general edits. */
export function assertBoqDraftForReorder(status: string) {
  if (status !== "DRAFT") {
    throw new ApiError(
      "Cannot reorder items in an ACTIVE or SUPERSEDED BOQ. Only DRAFT BOQs can be modified.",
      403,
    );
  }
}
