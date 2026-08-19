import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProjectCostBreakdown } from "./ProjectCostBreakdown";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id: (await params).id },
  });

  if (!project) notFound();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
      <Card className="col-span-1 md:col-span-3">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Description
            </h3>
            <p className="text-sm">
              {project.notes || "No description provided."}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Start Date
              </h3>
              <p className="text-sm font-medium">
                {project.startDate
                  ? new Date(project.startDate).toLocaleDateString()
                  : "Not set"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Expected End Date
              </h3>
              <p className="text-sm font-medium">
                {project.endDate
                  ? new Date(project.endDate).toLocaleDateString()
                  : "Not set"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Budget
              </h3>
              <p className="text-sm font-medium text-green-600">
                {project.agreedValue
                  ? `₹${Number(project.agreedValue).toLocaleString()}`
                  : "Not set"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Per-Project Cost Breakdown (Recharts) */}
      <div className="col-span-1 md:col-span-3">
        <ProjectCostBreakdown projectId={project.id} />
      </div>

      {/* Show Close Project button if not closed */}
      {project.status !== "CLOSED" && (
        <div className="col-span-1 md:col-span-3 flex justify-end mt-4">
          <Link href={`/projects/${project.id}/closure`}>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              Close Project
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
