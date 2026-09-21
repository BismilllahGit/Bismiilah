import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const entryPatchSchema = z.object({
  date: z.string(),
  workerTypeId: z.string().min(1, "Worker type is required"),
  headcount: z.number().int().positive("Headcount must be positive"),
  wageRate: z.number().positive("Wage rate must be positive"),
  title: z.string().optional(),
  note: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: contractorId, entryId } = await params;
    const entry = await prisma.dailyLabourEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry || entry.contractorId !== contractorId) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch entry" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: contractorId, entryId } = await params;
    const body = await request.json();
    const parsed = entryPatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 },
      );
    }

    const { date, workerTypeId, headcount, wageRate, title, note } =
      parsed.data;

    const existing = await prisma.dailyLabourEntry.findUnique({
      where: { id: entryId },
    });
    if (!existing || existing.contractorId !== contractorId) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const workerType = await prisma.workerType.findUnique({
      where: { id: workerTypeId },
    });
    if (!workerType) {
      return NextResponse.json(
        { error: "Worker type not found" },
        { status: 400 },
      );
    }

    const updated = await prisma.dailyLabourEntry.update({
      where: { id: entryId },
      data: {
        date: new Date(date),
        workerTypeId,
        headcount,
        wageRate,
        title: title || null,
        note: note || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: contractorId, entryId } = await params;
    const existing = await prisma.dailyLabourEntry.findUnique({
      where: { id: entryId },
    });
    if (!existing || existing.contractorId !== contractorId) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await prisma.dailyLabourEntry.delete({ where: { id: entryId } });

    return NextResponse.json({ id: entryId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 },
    );
  }
}
