import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { recalculateBOQMilestones } from "@/lib/boq-utils";

const updateSectionSchema = z.object({
  name: z.string().optional().transform(val => val ? val.trim() : undefined),
  groupId: z.string().optional(),
  sortOrder: z.coerce.number().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: sectionId } = await params;
    const body = await request.json();
    const parsed = updateSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const section = await prisma.bOQSection.findUnique({
      where: { id: sectionId },
      include: { boq: true },
    });

    if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });
    if (section.boq.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot edit sections on an ACTIVE or SUPERSEDED BOQ. Only DRAFT BOQs can be modified." },
        { status: 403 }
      );
    }

    const { name, groupId, sortOrder } = parsed.data;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (groupId !== undefined) updateData.groupId = groupId;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const updated = await prisma.bOQSection.update({
      where: { id: sectionId },
      data: updateData,
      include: {
        group: true,
        lineItems: {
          orderBy: { sortOrder: "asc" },
          include: { item: true, workerType: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update BOQ section:", error);
    return NextResponse.json({ error: "Failed to update BOQ section" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: sectionId } = await params;
    const section = await prisma.bOQSection.findUnique({
      where: { id: sectionId },
      include: { boq: true },
    });

    if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });
    if (section.boq.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot delete sections from an ACTIVE or SUPERSEDED BOQ. Only DRAFT BOQs can be modified." },
        { status: 403 }
      );
    }

    // Cascade delete line items
    await prisma.$transaction(async (tx) => {
      await tx.bOQLineItem.deleteMany({ where: { sectionId } });
      await tx.bOQSection.delete({ where: { id: sectionId } });
    });

    await recalculateBOQMilestones(section.boqId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete BOQ section:", error);
    return NextResponse.json({ error: "Failed to delete BOQ section" }, { status: 500 });
  }
}
