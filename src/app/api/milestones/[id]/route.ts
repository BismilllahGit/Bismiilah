import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { recalculateBOQMilestones } from "@/lib/boq-utils";

const updateMilestoneSchema = z.object({
  stageName: z.string().optional(),
  targetDate: z.string().optional().nullable(),
  percentage: z.coerce.number().min(0).max(100).optional(),
  sortOrder: z.coerce.number().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: milestoneId } = await params;
    const body = await request.json();
    const parsed = updateMilestoneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const existing = await prisma.bOQPaymentMilestone.findUnique({ where: { id: milestoneId } });
    if (!existing) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

    const { stageName, targetDate, percentage, sortOrder } = parsed.data;

    const updateData: any = {};
    if (stageName !== undefined) updateData.stageName = stageName;
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;
    if (percentage !== undefined) updateData.percentage = percentage;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    await prisma.bOQPaymentMilestone.update({
      where: { id: milestoneId },
      data: updateData,
    });

    // Recalculate to ensure amounts are synced if percentage changed
    await recalculateBOQMilestones(existing.boqId);

    const updated = await prisma.bOQPaymentMilestone.findUnique({ where: { id: milestoneId } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update BOQ milestone:", error);
    return NextResponse.json({ error: "Failed to update BOQ milestone" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: milestoneId } = await params;
    const existing = await prisma.bOQPaymentMilestone.findUnique({ where: { id: milestoneId } });
    if (!existing) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

    await prisma.bOQPaymentMilestone.delete({ where: { id: milestoneId } });
    
    // Recalculate remaining milestones
    await recalculateBOQMilestones(existing.boqId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete BOQ milestone:", error);
    return NextResponse.json({ error: "Failed to delete BOQ milestone" }, { status: 500 });
  }
}
