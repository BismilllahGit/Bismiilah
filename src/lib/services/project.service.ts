import { prisma } from "@/lib/prisma";

export async function getProjectsPageData() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      projectTasks: {
        where: { status: { not: "COMPLETED" } },
      },
    },
  });

  const activeCount = projects.filter((p) => p.status === "ACTIVE").length;
  const completedCount = projects.filter(
    (p) => p.status === "COMPLETED",
  ).length;
  const closedCount = projects.filter((p) => p.status === "CLOSED").length;

  return {
    projects,
    stats: {
      activeCount,
      completedCount,
      closedCount,
    },
  };
}
