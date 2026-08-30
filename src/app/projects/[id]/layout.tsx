import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskUrgencyBadge } from "@/components/ui/task-urgency-badge";
import { EditProjectDrawer, DeleteProjectButton } from "./ProjectClientActions";
import ProjectTabNavigation from "./ProjectTabNavigation";
import { getProjectBOQActuals } from "@/lib/queries/boq-queries";

export default async function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const resolvedParams = await params;

  const project = await prisma.project.findUnique({
    where: { id: resolvedParams.id },
    include: {
      projectTasks: {
        where: { status: { not: "COMPLETED" } },
      },
    },
  });

  if (!project) notFound();

  const unbilledExtraWorkCount = await prisma.extraWork.count({
    where: {
      projectId: project.id,
      status: "UNBILLED",
    },
  });

  const boqActuals = await getProjectBOQActuals(project.id);

  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );
  let overdueCount = 0;
  let todayCount = 0;
  project.projectTasks.forEach((task) => {
    const diffTime = new Date(task.targetDate).getTime() - todayUTC.getTime();
    const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) overdueCount++;
    else if (daysRemaining === 0) todayCount++;
  });

  const serializedProject = {
    ...project,
    agreedValue: project.agreedValue.toString(),
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Project Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <Link
            href="/projects"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Projects
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {project.name}
            </h1>
            <Badge
              variant={
                project.status === "ACTIVE"
                  ? "default"
                  : project.status === "COMPLETED"
                    ? "secondary"
                    : "outline"
              }
            >
              {project.status}
            </Badge>
            {unbilledExtraWorkCount > 0 && (
              <Badge
                variant="destructive"
                className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200"
              >
                ⚠️ {unbilledExtraWorkCount} Unbilled Deviation
                {unbilledExtraWorkCount > 1 ? "s" : ""}
              </Badge>
            )}
            <TaskUrgencyBadge kind="overdue" count={overdueCount} />
            <TaskUrgencyBadge kind="dueToday" count={todayCount} />
            {(boqActuals.totalItemsOverBudget > 0 ||
              boqActuals.isTargetBudgetExceeded) && (
              <Badge
                variant="destructive"
                className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200"
              >
                ⚠️{" "}
                {boqActuals.totalItemsOverBudget > 0 && (
                  <span>
                    {boqActuals.totalItemsOverBudget} BOQ item
                    {boqActuals.totalItemsOverBudget > 1 ? "s" : ""} over budget
                  </span>
                )}
                {boqActuals.totalItemsOverBudget > 0 &&
                  boqActuals.isTargetBudgetExceeded && <span> • </span>}
                {boqActuals.isTargetBudgetExceeded && (
                  <span>Target budget ceiling exceeded</span>
                )}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground flex items-center gap-1 text-sm">
            {project.location}
          </p>
        </div>
        <div className="flex gap-2">
          <EditProjectDrawer project={serializedProject} />
          <DeleteProjectButton projectId={project.id} />
        </div>
      </div>

      {/* Tab Navigation */}
      <ProjectTabNavigation projectId={project.id} />

      {/* Tab Content */}
      <div className="pt-2">{children}</div>
    </div>
  );
}
