"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, CheckCircle2, Circle, Clock, Trash2, Loader2, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";

interface Task {
  id: string;
  title: string;
  description: string | null;
  targetDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  daysRemaining: number;
  isOverdue: boolean;
}

export default function ProjectTasksClient({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const router = useRouter();

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const notifyUpdate = () => {
    window.dispatchEvent(new Event('tasks-updated'));
    router.refresh();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, targetDate }),
      });
      if (res.ok) {
        setIsAddOpen(false);
        setTitle("");
        setDescription("");
        setTargetDate("");
        fetchTasks();
        notifyUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    setTasks(current => current.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        fetchTasks();
      } else {
        notifyUpdate();
      }
    } catch (err) {
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    setTasks(current => current.filter(t => t.id !== taskId));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) notifyUpdate();
    } catch (err) {
      fetchTasks();
    }
  };

  const activeTasks = tasks.filter(t => t.status !== "COMPLETED");
  const completedTasks = tasks.filter(t => t.status === "COMPLETED");

  const getDaysRemainingBadge = (task: Task) => {
    if (task.daysRemaining < 0) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">
          Overdue by {Math.abs(task.daysRemaining)} day{Math.abs(task.daysRemaining) > 1 ? 's' : ''}
        </Badge>
      );
    }
    if (task.daysRemaining === 0) {
      return (
        <Badge variant="destructive" className="bg-amber-100 text-amber-800 border-amber-300">
          Due today
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
        Due in {task.daysRemaining} day{task.daysRemaining > 1 ? 's' : ''}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Project Checklist</h2>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </div>

      <div className="space-y-4">
        {activeTasks.length === 0 && completedTasks.length === 0 && (
          <div className="text-center py-12 border border-dashed rounded-lg bg-slate-50/50">
            <h3 className="text-lg font-medium text-slate-700">No tasks yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Create a task to keep track of project deliverables.</p>
            <Button onClick={() => setIsAddOpen(true)} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Add your first task
            </Button>
          </div>
        )}

        {activeTasks.length > 0 && (
          <div className="space-y-3">
            {activeTasks.map(task => (
              <Card key={task.id} className={`transition-colors ${task.status === "IN_PROGRESS" ? "border-blue-200 bg-blue-50/30" : ""}`}>
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                  <div className="flex items-start gap-3">
                    <button 
                      onClick={() => handleUpdateStatus(task.id, "COMPLETED")}
                      className="mt-0.5 text-muted-foreground hover:text-emerald-600 transition-colors shrink-0"
                      title="Mark complete"
                    >
                      <Circle className="h-5 w-5" />
                    </button>
                    <div>
                      <h4 className="font-medium text-slate-900">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {getDaysRemainingBadge(task)}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.targetDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 self-end sm:self-auto ml-8 sm:ml-0">
                    {task.status === "PENDING" ? (
                      <Button variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}>
                        Start
                      </Button>
                    ) : (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 uppercase text-[10px] tracking-wider px-2 py-0.5">
                        In Progress
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteTask(task.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {completedTasks.length > 0 && (
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed ({completedTasks.length})
            </h3>
            <div className="space-y-2 opacity-60">
              {completedTasks.map(task => (
                <Card key={task.id} className="bg-slate-50 border-slate-200 shadow-none">
                  <CardContent className="p-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleUpdateStatus(task.id, "PENDING")}
                        className="text-emerald-600 hover:text-emerald-700 transition-colors shrink-0"
                        title="Mark incomplete"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <span className="font-medium text-sm text-slate-700 line-through">{task.title}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => handleDeleteTask(task.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Project Task</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreateTask} className="space-y-4 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Title *</label>
              <input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required 
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" 
                placeholder="E.g. Finalize plumbing layout" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Date *</label>
              <input 
                type="date" 
                value={targetDate} 
                onChange={(e) => setTargetDate(e.target.value)} 
                required 
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" 
                placeholder="Additional details..." 
              />
            </div>
            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Add Task"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
