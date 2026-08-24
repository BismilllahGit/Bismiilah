import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { requireSession } from "@/app/api/_lib/auth-guard";
import { parseJsonBody } from "@/app/api/_lib/body";
import { withApiHandler } from "@/app/api/_lib/handler";
import { getBoqStatusForFirstReorderItem, assertBoqDraftForReorder } from "@/app/api/_lib/boq-guards";

const reorderMilestonesSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1), sortOrder: z.number().int() })).min(1),
});

export const POST = withApiHandler("Failed to reorder milestones", async (request) => {
  await requireSession({ allowTestBypass: true });
  const { items } = await parseJsonBody(request, reorderMilestonesSchema);

  const status = await getBoqStatusForFirstReorderItem(items[0], "milestone");
  assertBoqDraftForReorder(status);

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.bOQPaymentMilestone.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } });
    }
  });

  return NextResponse.json({ success: true });
});
