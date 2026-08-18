import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const url = new URL(request.url);
    const daysParam = url.searchParams.get("days");
    const nDays = daysParam ? parseInt(daysParam, 10) : 3;

    if (isNaN(nDays) || nDays < 0) {
      return NextResponse.json({ error: "Invalid days parameter" }, { status: 400 });
    }

    const now = new Date();
    // Normalize today to UTC midnight to match how Prisma returns @db.Date fields
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    
    // N days from today in UTC
    const thresholdDateUTC = new Date(todayUTC.getTime() + nDays * 24 * 60 * 60 * 1000);

    const tasks = await prisma.projectTask.findMany({
      where: {
        status: {
          not: "COMPLETED"
        },
        targetDate: {
          lte: thresholdDateUTC
        }
      },
      orderBy: { targetDate: 'asc' },
      include: {
        project: {
          select: { name: true, id: true }
        }
      }
    });

    const tasksWithComputedState = tasks.map((task) => {
      const diffTime = new Date(task.targetDate).getTime() - todayUTC.getTime();
      const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...task,
        daysRemaining,
        isOverdue: daysRemaining < 0
      };
    });

    return NextResponse.json(tasksWithComputedState);
  } catch (error: any) {
    console.error("Error fetching upcoming tasks:", error);
    return NextResponse.json({ error: "Failed to fetch upcoming tasks" }, { status: 500 });
  }
}
