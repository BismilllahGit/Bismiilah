import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureProjectActive } from "@/lib/project-utils";
import { z } from "zod";

const activitySchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().trim().min(1, "Description is required"),
});

type Ctx = { params: Promise<{ id: string; activityId: string }> };

function errorResponse(error: unknown, fallback: string) {
  console.error(error);
  if (error instanceof Error && error.message.includes("CLOSED")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = activitySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { id: projectId, activityId } = await params;
    await ensureProjectActive(projectId);

    const existing = await prisma.siteActivity.findFirst({
      where: { id: activityId, projectId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const activity = await prisma.siteActivity.update({
      where: { id: activityId },
      data: {
        date: new Date(parsed.data.date),
        description: parsed.data.description,
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    return errorResponse(error, "Failed to update site activity");
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, activityId } = await params;
    await ensureProjectActive(projectId);

    const existing = await prisma.siteActivity.findFirst({
      where: { id: activityId, projectId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    await prisma.siteActivity.delete({ where: { id: activityId } });
    return NextResponse.json({ id: activityId });
  } catch (error) {
    return errorResponse(error, "Failed to delete site activity");
  }
}
