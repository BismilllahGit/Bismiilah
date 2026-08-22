import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import MainWrapper from "@/components/layout/main-wrapper";
import { StatCard } from "@/components/shared/stat-card";
import { ProjectCard } from "@/components/shared/project-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getProjectsPageData } from "@/lib/services/project.service";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { projects, stats } = await getProjectsPageData();

  return (
    <MainWrapper
      title="Projects"
      subTitle="Manage all construction sites."
      btnTitle="New Project"
      btnLink="/projects/new"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Active Projects"
          value={stats.activeCount}
          variant="blue"
        />
        <StatCard
          title="Completed Projects"
          value={stats.completedCount}
          variant="green"
        />
        <StatCard
          title="Closed Projects"
          value={stats.closedCount}
          variant="slate"
        />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Projects Found"
          description="You haven't created any projects yet."
          actionLabel="Create your first project"
          actionHref="/projects/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </MainWrapper>
  );
}
