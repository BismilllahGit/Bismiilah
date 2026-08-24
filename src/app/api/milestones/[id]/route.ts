import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { recalculateBOQMilestones } from "@/lib/boq-utils";
import { requireSession } from "@/app/api/_lib/auth-guard";
import { parseJsonBody } from "@/app/api/_lib/body";
import { withApiHandler } from "@/app/api/_lib/handler";
import { buildUpdateData } from "@/app/api/_lib/crud";
import { ApiError } from "@/app/api/_lib/errors";

type Params = { params: Promise<{ id: string }> };

const updateMilestoneSchema = z.object({
  stageName: z.string().optional(),
  targetDate: z.string().optional().nullable(),
  percentage: z.coerce.number().min(0).max(100).optional(),
  sortOrder: z.coerce.number().optional(),
});

export const PATCH = withApiHandler<Params>("Failed to update BOQ milestone", async (request, { params }) => {
  await requireSession({ allowTestBypass: true });
  const { id: milestoneId } = await params;
  const parsed = await parseJsonBody(request, updateMilestoneSchema);

  // Deliberately no DRAFT-lock check here (assertMilestoneEditable exists but
  // is intentionally unused) — the original route never checked BOQ status
  // before editing milestones; only the separate reorder route did. Preserved
  // as-is, not a gap to "fix" by wiring in the guard.
  const existing = await prisma.bOQPaymentMilestone.findUnique({ where: { id: milestoneId } });
  if (!existing) throw new ApiError("Milestone not found", 404);

  const data = buildUpdateData(parsed);
  if (typeof data.targetDate !== "undefined") {
    data.targetDate = data.targetDate ? new Date(data.targetDate as string) : null;
  }

  await prisma.bOQPaymentMilestone.update({ where: { id: milestoneId }, data });
  await recalculateBOQMilestones(existing.boqId);

  const updated = await prisma.bOQPaymentMilestone.findUnique({ where: { id: milestoneId } });
  return NextResponse.json(updated);
});

export const DELETE = withApiHandler<Params>("Failed to delete BOQ milestone", async (request, { params }) => {
  await requireSession({ allowTestBypass: true });
  const { id: milestoneId } = await params;

  const existing = await prisma.bOQPaymentMilestone.findUnique({ where: { id: milestoneId } });
  if (!existing) throw new ApiError("Milestone not found", 404);

  await prisma.bOQPaymentMilestone.delete({ where: { id: milestoneId } });
  await recalculateBOQMilestones(existing.boqId);

  return NextResponse.json({ success: true });
});
