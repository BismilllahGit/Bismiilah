import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { computeBOQRollups, computeActualsForBOQ } from "@/lib/queries/boq-queries";

const updateBOQSchema = z.object({
  targetBudget: z.coerce.number().optional().nullable(),
  cgstRate: z.coerce.number().optional(),
  sgstRate: z.coerce.number().optional(),
  termsOverride: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "SUPERSEDED"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: boqId } = await params;
    const body = await request.json();
    const parsed = updateBOQSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const existing = await prisma.bOQ.findUnique({ where: { id: boqId } });
    if (!existing) return NextResponse.json({ error: "BOQ not found" }, { status: 404 });

    const { targetBudget, cgstRate, sgstRate, termsOverride, note, status } = parsed.data;
    const updateData: Prisma.BOQUpdateInput = {};
    if (targetBudget !== undefined) updateData.targetBudget = targetBudget;
    if (cgstRate !== undefined) updateData.cgstRate = cgstRate;
    if (sgstRate !== undefined) updateData.sgstRate = sgstRate;
    if (termsOverride !== undefined) updateData.termsOverride = termsOverride;
    if (note !== undefined) updateData.note = note;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "ACTIVE" && existing.status === "DRAFT") {
        updateData.approvedAt = new Date();

        await prisma.bOQ.updateMany({
          where: {
            projectId: existing.projectId,
            id: { not: boqId },
            status: "ACTIVE",
          },
          data: { status: "SUPERSEDED" },
        });
      }
    }

    const updated = await prisma.bOQ.update({
      where: { id: boqId },
      data: updateData,
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: {
            group: true,
            lineItems: {
              orderBy: { sortOrder: "asc" },
              include: { item: true, workerType: true },
            },
          },
        },
      },
    });

    const enriched = await computeActualsForBOQ(computeBOQRollups(updated), existing.projectId);
    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Failed to update BOQ:", error);
    return NextResponse.json({ error: "Failed to update BOQ" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: boqId } = await params;
    const existing = await prisma.bOQ.findUnique({ where: { id: boqId } });
    if (!existing) return NextResponse.json({ error: "BOQ not found" }, { status: 404 });

    if (existing.status !== "DRAFT") {
      return NextResponse.json({ error: "Cannot delete an ACTIVE or SUPERSEDED BOQ." }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.bOQLineItem.deleteMany({ where: { section: { boqId } } });
      await tx.bOQSection.deleteMany({ where: { boqId } });
      await tx.bOQ.delete({ where: { id: boqId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete BOQ:", error);
    return NextResponse.json({ error: "Failed to delete BOQ" }, { status: 500 });
  }
}
