import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { BOQLineType, ItemGrade } from "@prisma/client";
import { recalculateBOQMilestones } from "@/lib/boq-utils";
import { requireSession } from "@/app/api/_lib/auth-guard";
import { parseJsonBody } from "@/app/api/_lib/body";
import { withApiHandler } from "@/app/api/_lib/handler";
import { ApiError } from "@/app/api/_lib/errors";
import { getLineItemWithBoqStatus } from "@/app/api/_lib/boq-guards";

type Params = { params: Promise<{ id: string }> };

const updateLineItemSchema = z.object({
  itemNo: z.string().optional().nullable(),
  title: z.string().optional(),
  make: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  lineType: z.enum(["CALCULATED", "LUMP_SUM"]).optional(),
  quantity: z.coerce.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  rate: z.coerce.number().optional().nullable(),
  amount: z.coerce.number().optional().nullable(),
  executedQuantity: z.coerce.number().optional().nullable(),
  executedAmount: z.coerce.number().optional().nullable(),
  grade: z.enum(["GRADE_A", "GRADE_B", "GRADE_C"]).optional().nullable(),
  itemId: z.string().optional().nullable(),
  workerTypeId: z.string().optional().nullable(),
  sortOrder: z.coerce.number().optional(),
});

export const PATCH = withApiHandler<Params>("Failed to update BOQ line item", async (request, { params }) => {
  await requireSession({ allowTestBypass: true });
  const { id: lineItemId } = await params;
  const data = await parseJsonBody(request, updateLineItemSchema);
  const existing = await getLineItemWithBoqStatus(lineItemId);

  const isDraft = existing.section.boq.status === "DRAFT";
  const isActive = existing.section.boq.status === "ACTIVE";
  const touchesBaseMath = data.quantity !== undefined || data.rate !== undefined || data.amount !== undefined;
  if (!isDraft && touchesBaseMath && !isActive) {
    throw new ApiError("Cannot edit line items in a SUPERSEDED BOQ.", 403);
  }

  const updateData: any = {};
  if (data.itemNo !== undefined) updateData.itemNo = data.itemNo;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.make !== undefined) updateData.make = data.make;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.unit !== undefined) updateData.unit = data.unit || null;
  if (data.grade !== undefined) updateData.grade = (data.grade as ItemGrade) || null;
  if (data.itemId !== undefined) updateData.itemId = data.itemId || null;
  if (data.workerTypeId !== undefined) updateData.workerTypeId = data.workerTypeId || null;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.executedQuantity !== undefined) updateData.executedQuantity = data.executedQuantity;
  if (data.executedAmount !== undefined) updateData.executedAmount = data.executedAmount;

  if (isDraft) {
    const targetLineType = data.lineType || existing.lineType;
    updateData.lineType = targetLineType as BOQLineType;

    if (targetLineType === "CALCULATED") {
      const targetQty = data.quantity !== undefined ? Number(data.quantity || 0) : Number(existing.quantity || 0);
      const targetRate = data.rate !== undefined ? Number(data.rate || 0) : Number(existing.rate || 0);
      updateData.quantity = targetQty;
      updateData.rate = targetRate;
      updateData.amount = targetQty * targetRate;
    } else {
      updateData.quantity = null;
      updateData.rate = null;
      if (data.amount !== undefined) {
        updateData.amount = Number(data.amount || 0);
      } else if (existing.lineType === "CALCULATED") {
        updateData.amount = Number(existing.amount || 0);
      }
    }
  }

  const updated = await prisma.bOQLineItem.update({
    where: { id: lineItemId },
    data: updateData,
    include: { item: true, workerType: true },
  });

  if (isDraft) {
    await recalculateBOQMilestones(existing.section.boqId);
  }

  return NextResponse.json(updated);
});

export const DELETE = withApiHandler<Params>("Failed to delete BOQ line item", async (request, { params }) => {
  await requireSession({ allowTestBypass: true });
  const { id: lineItemId } = await params;
  const existing = await getLineItemWithBoqStatus(lineItemId);

  if (existing.section.boq.status !== "DRAFT") {
    throw new ApiError(
      "Cannot delete line items from an ACTIVE or SUPERSEDED BOQ. Only DRAFT BOQs can be modified.",
      403,
    );
  }

  await prisma.bOQLineItem.delete({ where: { id: lineItemId } });
  await recalculateBOQMilestones(existing.section.boqId);
  return NextResponse.json({ success: true });
});
