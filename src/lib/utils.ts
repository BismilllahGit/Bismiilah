import { TaskStatusCounts, TaskWithTarget } from "@/types/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTaskStatusCounts(tasks: TaskWithTarget[]): TaskStatusCounts {
  let overdueCount = 0;
  let todayCount = 0;

  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );

  tasks.forEach((task) => {
    const diffTime = new Date(task.targetDate).getTime() - todayUTC.getTime();
    const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      overdueCount++;
    } else if (daysRemaining === 0) {
      todayCount++;
    }
  });

  return { overdueCount, todayCount };
}
