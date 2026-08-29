import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const projectId = (await params).id;
    const body = await request.json();
    const { title, description, targetDate } = body;

    if (!title || !targetDate) {
      return NextResponse.json({ error: "Title and targetDate are required" }, { status: 400 });
    }

    const task = await prisma.projectTask.create({
      data: {
        projectId,
        title,
        description: description || null,
        targetDate: new Date(targetDate),
        status: "PENDING",
      }
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating ProjectTask:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const projectId = (await params).id;

    const tasks = await prisma.projectTask.findMany({
      where: { projectId },
      orderBy: { targetDate: 'asc' },
    });

    const now = new Date();
    // Normalize today to UTC midnight to match how Prisma returns @db.Date fields
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const tasksWithComputedState = tasks.map((task) => {
      const diffTime = new Date(task.targetDate).getTime() - todayUTC.getTime();
      const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...task,
        daysRemaining,
        isOverdue: (task.status === "PENDING" || task.status === "IN_PROGRESS") && daysRemaining < 0
      };
    });

    return NextResponse.json(tasksWithComputedState);
  } catch (error) {
    console.error("Error fetching ProjectTasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}
