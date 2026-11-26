import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const extraWorkPatchSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  date: z.string().min(1),
  status: z.enum(["UNBILLED", "BILLED", "COLLECTED"]),
});

async function loadWork(projectId: string, workId: string) {
  const existing = await prisma.extraWork.findUnique({
    where: { id: workId },
    select: { projectId: true, project: { select: { status: true } } },
  });
  if (!existing || existing.projectId !== projectId) {
    return { error: NextResponse.json({ error: "Extra work not found" }, { status: 404 }) };
  }
  if (existing.project.status === "CLOSED") {
    return {
      error: NextResponse.json(
        { error: "Project is CLOSED. Cannot modify extra work." },
        { status: 400 },
      ),
    };
  }
  return { error: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; workId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, workId } = await params;
    const parsed = extraWorkPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { error } = await loadWork(projectId, workId);
    if (error) return error;

    const { description, amount, date, status } = parsed.data;
    const updated = await prisma.extraWork.update({
      where: { id: workId },
      data: { description, amount, date: new Date(date), status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update extra work:", error);
    return NextResponse.json({ error: "Failed to update extra work" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; workId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, workId } = await params;
    const { error } = await loadWork(projectId, workId);
    if (error) return error;

    // Linked inventory transactions are kept; their extraWorkId is set to
    // NULL by the onDelete: SetNull relation.
    await prisma.extraWork.delete({ where: { id: workId } });

    return NextResponse.json({ id: workId });
  } catch (error) {
    console.error("Failed to delete extra work:", error);
    return NextResponse.json({ error: "Failed to delete extra work" }, { status: 500 });
  }
}
