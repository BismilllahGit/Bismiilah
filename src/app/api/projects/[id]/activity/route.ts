import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureProjectActive } from "@/lib/project-utils";
import { z } from "zod";

const activitySchema = z.object({
  date: z.string(),
  description: z.string().min(1, "Description is required"),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const activities = await prisma.siteActivity.findMany({
      where: { projectId: (await params).id },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(activities);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch site activity" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = activitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const id = (await params).id;
    await ensureProjectActive(id);

    const { date, description } = parsed.data;

    const activity = await prisma.siteActivity.create({
      data: {
        projectId: id,
        date: new Date(date),
        description,
      }
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to log site activity" }, { status: 500 });
  }
}
