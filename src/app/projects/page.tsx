import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Building2, MapPin, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      projectTasks: {
        where: { status: { not: "COMPLETED" } },
      },
    },
  });

  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );

  const activeCount = projects.filter((p) => p.status === "ACTIVE").length;
  const completedCount = projects.filter(
    (p) => p.status === "COMPLETED",
  ).length;
  const closedCount = projects.filter((p) => p.status === "CLOSED").length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage all construction sites.
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {activeCount}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Completed Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedCount}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-100 border-slate-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-800">
              Closed Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">
              {closedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-lg bg-slate-50">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">No Projects Found</h2>
          <p className="text-muted-foreground mt-2 mb-6">
            You haven't created any projects yet.
          </p>
          <Link href="/projects/new">
            <Button>Create your first project</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-bold">
                    {project.name}
                  </CardTitle>
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
                </div>

                {(() => {
                  let overdueCount = 0;
                  let todayCount = 0;
                  project.projectTasks.forEach((task) => {
                    const diffTime =
                      new Date(task.targetDate).getTime() - todayUTC.getTime();
                    const daysRemaining = Math.round(
                      diffTime / (1000 * 60 * 60 * 24),
                    );
                    if (daysRemaining < 0) overdueCount++;
                    else if (daysRemaining === 0) todayCount++;
                  });

                  if (overdueCount === 0 && todayCount === 0) return null;

                  return (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {overdueCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
                        >
                          ⚠️ {overdueCount} task{overdueCount > 1 ? "s" : ""}{" "}
                          overdue
                        </Badge>
                      )}
                      {todayCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                        >
                          📅 {todayCount} task{todayCount > 1 ? "s" : ""} due
                          today
                        </Badge>
                      )}
                    </div>
                  );
                })()}

                <CardDescription className="flex items-center gap-1 mt-3">
                  <MapPin className="h-3 w-3" /> {project.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.notes || "No description provided."}
                </p>

                <div className="mt-4 flex items-center text-xs text-muted-foreground gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Started:{" "}
                    {project.startDate
                      ? new Date(project.startDate).toLocaleDateString()
                      : "Not set"}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Link href={`/projects/${project.id}`} className="w-full">
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
