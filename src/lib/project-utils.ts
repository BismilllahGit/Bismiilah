import prisma from "@/lib/prisma";

export async function ensureProjectActive(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { status: true }
  });

  if (!project) {
    throw new Error("Project not found");
  }

  if (project.status === "CLOSED") {
    throw new Error("Cannot modify a CLOSED project. It is read-only.");
  }

  return project;
}
