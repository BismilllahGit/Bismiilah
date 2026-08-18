import BOQEditor from "./BOQEditor";

import prisma from "@/lib/prisma";

export default async function ProjectBOQPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });
  
  const client = await prisma.client.findFirst({
    where: { invoices: { some: { projectId } } }
  });
  
  const enrichedProject = project ? { 
    ...project, 
    agreedValue: project.agreedValue ? Number(project.agreedValue) : null,
    client 
  } : null;

  return <BOQEditor projectId={projectId} projectData={enrichedProject} />;
}
