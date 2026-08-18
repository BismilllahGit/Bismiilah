import ProjectTasksClient from "./ProjectTasksClient";

export default async function ProjectTasksPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  return <ProjectTasksClient projectId={id} />;
}
