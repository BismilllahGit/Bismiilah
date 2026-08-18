import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { taskId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const validStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updateData: any = { status };
    
    // Automatically manage completedAt when status changes
    if (status === "COMPLETED") {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null; // Clear if moved back to pending/in-progress
    }

    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data: updateData
    });

    return NextResponse.json(task);
  } catch (error: any) {
    console.error("Error updating ProjectTask:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { taskId } = await params;

    await prisma.projectTask.delete({
      where: { id: taskId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Error deleting ProjectTask:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
