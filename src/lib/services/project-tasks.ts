import prisma from "@/lib/prisma";
import { ApiError } from "@/app/api/_lib/errors";

const VALID_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;
type TaskStatus = (typeof VALID_STATUSES)[number];

export interface UpdateProjectTaskInput {
  status?: string;
  title?: string;
  description?: string;
  targetDate?: string;
}

export async function updateProjectTask(
  taskId: string,
  input: UpdateProjectTaskInput,
) {
  const updateData: Record<string, unknown> = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined)
    updateData.description = input.description;
  if (input.targetDate !== undefined)
    updateData.targetDate = new Date(input.targetDate);

  if (input.status) {
    if (!VALID_STATUSES.includes(input.status as TaskStatus)) {
      throw new ApiError("Invalid status", 400);
    }
    updateData.status = input.status;
    updateData.completedAt = input.status === "COMPLETED" ? new Date() : null;
  }

  return prisma.projectTask.update({ where: { id: taskId }, data: updateData });
}

export async function deleteProjectTask(taskId: string) {
  await prisma.projectTask.delete({ where: { id: taskId } });
}
