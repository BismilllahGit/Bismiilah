import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { recalculateBOQMilestones } from "@/lib/boq-utils";

const createMilestoneSchema = z.object({
  stageName: z.string().min(1, "Stage name is required"),
  targetDate: z.string().optional().nullable(),
  percentage: z.coerce.number().min(0).max(100),
  sortOrder: z.coerce.number().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string; boqId: string }> }) {
  try {
    const { boqId } = await params;
    const milestones = await prisma.bOQPaymentMilestone.findMany({
      where: { boqId },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(milestones);
  } catch (error) {
    console.error("Failed to fetch BOQ milestones:", error);
    return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; boqId: string }> }) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boqId } = await params;
    const boq = await prisma.bOQ.findUnique({ where: { id: boqId } });
    if (!boq) return NextResponse.json({ error: "BOQ not found" }, { status: 404 });

    const body = await request.json();
    const parsed = createMilestoneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { stageName, targetDate, percentage, sortOrder } = parsed.data;

    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const last = await prisma.bOQPaymentMilestone.findFirst({
        where: { boqId },
        orderBy: { sortOrder: "desc" },
      });
      finalSortOrder = last ? last.sortOrder + 1 : 1;
    }

    // 1. Create the milestone with an initial amount of 0
    const created = await prisma.bOQPaymentMilestone.create({
      data: {
        boqId,
        stageName,
        targetDate: targetDate ? new Date(targetDate) : null,
        percentage,
        amount: 0,
        sortOrder: finalSortOrder,
      },
    });

    // 2. Trigger recalculation for all milestones to correctly compute the amount based on current BOQ Grand Total
    await recalculateBOQMilestones(boqId);

    // 3. Fetch the updated milestone to return
    const updated = await prisma.bOQPaymentMilestone.findUnique({ where: { id: created.id } });

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    console.error("Failed to create BOQ milestone:", error);
    return NextResponse.json({ error: "Failed to create BOQ milestone" }, { status: 500 });
  }
}
