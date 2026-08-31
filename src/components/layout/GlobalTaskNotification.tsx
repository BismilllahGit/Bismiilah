"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface UpcomingTask {
  id: string;
  projectId: string;
  title: string;
  daysRemaining: number;
  isOverdue: boolean;
  project: {
    id: string;
    name: string;
  };
}

export function GlobalTaskNotification() {
  const [tasks, setTasks] = useState<UpcomingTask[]>([]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/upcoming?days=3");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Failed to fetch upcoming tasks", err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: triggers this component's standard fetch-on-mount pattern
    fetchTasks();

    const handleUpdate = () => {
      fetchTasks();
    };

    window.addEventListener("tasks-updated", handleUpdate);
    return () => window.removeEventListener("tasks-updated", handleUpdate);
  }, [fetchTasks]);

  const overdueCount = tasks.filter((t) => t.isOverdue).length;

  if (tasks.length === 0) {
    return null; // Don't show if nothing to show
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-slate-100 h-10 w-10">
        <Bell className="h-5 w-5 text-slate-700" />
        <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${overdueCount > 0 ? "bg-red-400" : "bg-amber-400"}`}
          ></span>
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${overdueCount > 0 ? "bg-red-500" : "bg-amber-500"}`}
          ></span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-medium text-sm">Task Notifications</h3>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
        <div className="max-h-75 overflow-y-auto py-1 flex flex-col">
          {tasks.map((task) => (
            <DropdownMenuItem key={task.id} className="p-0 w-full rounded-none">
              <Link
                href={`/projects/${task.project.id}/tasks`}
                className="flex flex-col items-start px-4 py-3 hover:bg-slate-50 cursor-pointer border-b last:border-0 w-full focus:bg-slate-50"
              >
                <div className="flex w-full justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm line-clamp-1">
                    {task.project.name}
                  </span>
                  {task.isOverdue ? (
                    <Badge
                      variant="destructive"
                      className="bg-red-100 text-red-800 border-red-200 text-[10px] h-4 px-1 shrink-0"
                    >
                      Overdue
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] h-4 px-1 shrink-0"
                    >
                      {task.daysRemaining === 0
                        ? "Today"
                        : `In ${task.daysRemaining}d`}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {task.title}
                </span>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
