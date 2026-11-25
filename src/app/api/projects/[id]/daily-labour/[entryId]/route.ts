import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const entryPatchSchema = z.object({
  date: z.string().min(1, "Date is required"),
  workerType: z.string().min(1, "Worker type is required"),
  headcount: z
    .number()
    .int("Headcount must be an integer")
    .positive("Headcount must be positive"),
  wageRate: z
    .number()
    .positive("Wage rate must be positive")
    .refine(
      (val) => {
        const s = val.toString();
        return !s.includes(".") || s.split(".")[1].length <= 2;
      },
      { message: "Wage rate can have at most 2 decimal places" },
    ),
  contractorId: z.string().optional().nullable(),
  paidImmediately: z.boolean().optional().default(false),
  title: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, entryId } = await params;
    const body = await request.json();
    const parsed = entryPatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 },
      );
    }

    const entry = parsed.data;

    const existing = await prisma.dailyLabourEntry.findUnique({
      where: { id: entryId },
      select: { projectId: true },
    });
    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });
    if (project?.status === "CLOSED") {
      return NextResponse.json(
        { error: "Project is CLOSED. Cannot edit daily labour." },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Resolve worker type the same way POST does (by name, then id,
      // otherwise create a custom type on the fly).
      let workerTypeRecord = await tx.workerType.findUnique({
        where: { name: entry.workerType.trim().toUpperCase() },
      });
      if (!workerTypeRecord) {
        workerTypeRecord = await tx.workerType.findUnique({
          where: { id: entry.workerType },
        });
      }
      if (!workerTypeRecord) {
        workerTypeRecord = await tx.workerType.create({
          data: {
            name: entry.workerType.trim().toUpperCase(),
            defaultRate: entry.wageRate,
            paymentCycle: "WEEKLY",
            isCustom: true,
            isActive: true,
          },
        });
      }

      const row = await tx.dailyLabourEntry.update({
        where: { id: entryId },
        data: {
          date: new Date(entry.date),
          workerTypeId: workerTypeRecord.id,
          headcount: entry.headcount,
          wageRate: entry.wageRate,
          contractorId: entry.contractorId ? entry.contractorId : null,
          paidImmediately: entry.paidImmediately ?? false,
          title: entry.title || null,
          ...(entry.note !== undefined ? { note: entry.note || null } : {}),
        },
      });

      return { ...row, workerType: workerTypeRecord.name };
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update daily labour entry:", error);
    return NextResponse.json(
      { error: "Failed to update daily labour entry" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, entryId } = await params;

    const existing = await prisma.dailyLabourEntry.findUnique({
      where: { id: entryId },
      select: { projectId: true, project: { select: { status: true } } },
    });
    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    if (existing.project.status === "CLOSED") {
      return NextResponse.json(
        { error: "Project is CLOSED. Cannot delete daily labour." },
        { status: 400 },
      );
    }

    await prisma.dailyLabourEntry.delete({ where: { id: entryId } });

    return NextResponse.json({ id: entryId });
  } catch (error) {
    console.error("Failed to delete daily labour entry:", error);
    return NextResponse.json(
      { error: "Failed to delete daily labour entry" },
      { status: 500 },
    );
  }
}
