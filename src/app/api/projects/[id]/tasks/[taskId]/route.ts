import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_lib/auth-guard";
import { withApiHandler } from "@/app/api/_lib/handler";
import { ApiError } from "@/app/api/_lib/errors";
import { updateProjectTask, deleteProjectTask } from "@/lib/services/project-tasks";

type Params = { params: Promise<{ id: string; taskId: string }> };

export const PATCH = withApiHandler<Params>("Failed to update task", async (request, { params }) => {
  await requireSession({ allowTestBypass: true });
  const { taskId } = await params;
  const { status } = await request.json();
  if (!status) throw new ApiError("Status is required", 400);

  const task = await updateProjectTask(taskId, { status });
  return NextResponse.json(task);
});

export const DELETE = withApiHandler<Params>("Failed to delete task", async (request, { params }) => {
  await requireSession({ allowTestBypass: true });
  const { taskId } = await params;
  await deleteProjectTask(taskId);
  return new NextResponse(null, { status: 204 });
});
