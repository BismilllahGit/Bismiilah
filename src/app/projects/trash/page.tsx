import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/ui/page-shell";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { TrashedProjectActions } from "./TrashedProjectActions";

export default async function ProjectsTrashPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    include: { client: { select: { name: true } } },
  });

  return (
    <PageShell>
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Projects
      </Link>
      <PageHeader
        layout="stacked"
        title="Trash Bin"
        subtitle="Deleted projects stay here until you restore them or delete them permanently."
        subtitleClassName="text-muted-foreground mt-1"
      />

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-lg bg-slate-50 mt-6">
          <Trash2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Trash is empty</h2>
          <p className="text-muted-foreground mt-2">
            Deleted projects will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-xl font-bold">
                    {project.name}
                  </CardTitle>
                  <Badge variant="outline">{project.status}</Badge>
                </div>
                <CardDescription className="flex items-center gap-1 mt-3">
                  <MapPin className="h-3 w-3" /> {project.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-3 space-y-1 text-sm text-muted-foreground">
                {project.client && <p>Client: {project.client.name}</p>}
                <p>
                  Deleted on:{" "}
                  {project.deletedAt ? formatDate(project.deletedAt) : "—"}
                </p>
              </CardContent>
              <CardFooter className="pt-2 mt-auto">
                <TrashedProjectActions
                  projectId={project.id}
                  projectName={project.name}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
