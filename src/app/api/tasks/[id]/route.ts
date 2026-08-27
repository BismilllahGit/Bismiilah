import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_lib/auth-guard";
import { withApiHandler } from "@/app/api/_lib/handler";
import { updateProjectTask, deleteProjectTask } from "@/lib/services/project-tasks";

type Params = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler<Params>("Failed to update task", async (request, { params }) => {
  await requireSession({ allowTestBypass: true });
  const { id: taskId } = await params;
  const body = await request.json();
  const task = await updateProjectTask(taskId, body);
  return NextResponse.json(task);
});

export const DELETE = withApiHandler<Params>("Failed to delete task", async (request, { params }) => {
  await requireSession({ allowTestBypass: true });
  const { id: taskId } = await params;
  await deleteProjectTask(taskId);
  return new NextResponse(null, { status: 204 });
});
