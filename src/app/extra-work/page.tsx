import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageShell } from "@/components/ui/page-shell";
import { PageHeader } from "@/components/ui/page-header";
import ExtraWorkClient from "./ExtraWorkClient";

export default async function GlobalExtraWorkPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const extraWorkList = await prisma.extraWork.findMany({
    include: { project: true },
    orderBy: { date: "desc" },
  });

  const serializedList = extraWorkList.map((w) => ({
    ...w,
    amount: w.amount.toString(),
    project: {
      ...w.project,
      agreedValue: w.project.agreedValue.toString(),
    },
  }));

  const allProjects = await prisma.project.findMany({
    select: { id: true, name: true },
  });

  return (
    <PageShell>
      <PageHeader
        layout="plain"
        title="Global Extra Work Log"
        subtitle="Review and manage all out-of-scope deviations across all projects."
        subtitleClassName="text-muted-foreground mt-1"
      />

      <ExtraWorkClient extraWork={serializedList} projects={allProjects} />
    </PageShell>
  );
}
