import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { recalculateBOQMilestones } from "@/lib/boq-utils";
import { requireSession } from "@/app/api/_lib/auth-guard";
import { parseJsonBody } from "@/app/api/_lib/body";
import { withApiHandler } from "@/app/api/_lib/handler";
import { buildUpdateData } from "@/app/api/_lib/crud";
import { assertBoqSectionEditable } from "@/app/api/_lib/boq-guards";

type Params = { params: Promise<{ id: string }> };

const updateSectionSchema = z.object({
  name: z.string().optional().transform((val) => (val ? val.trim() : undefined)),
  groupId: z.string().optional(),
  sortOrder: z.coerce.number().optional(),
});

export const PATCH = withApiHandler<Params>("Failed to update BOQ section", async (request, { params }) => {
  await requireSession();
  const { id: sectionId } = await params;
  const parsed = await parseJsonBody(request, updateSectionSchema);
  await assertBoqSectionEditable(sectionId);
  const data = buildUpdateData(parsed);

  const updated = await prisma.bOQSection.update({
    where: { id: sectionId },
    data,
    include: {
      group: true,
      lineItems: { orderBy: { sortOrder: "asc" }, include: { item: true, workerType: true } },
    },
  });

  return NextResponse.json(updated);
});

export const DELETE = withApiHandler<Params>("Failed to delete BOQ section", async (request, { params }) => {
  await requireSession();
  const { id: sectionId } = await params;
  const section = await assertBoqSectionEditable(sectionId);

  await prisma.$transaction(async (tx) => {
    await tx.bOQLineItem.deleteMany({ where: { sectionId } });
    await tx.bOQSection.delete({ where: { id: sectionId } });
  });

  await recalculateBOQMilestones(section.boqId);
  return NextResponse.json({ success: true });
});
