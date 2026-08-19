import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Global Extra Work Log
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and manage all out-of-scope deviations across all projects.
        </p>
      </div>

      <ExtraWorkClient extraWork={serializedList} projects={allProjects} />
    </div>
  );
}
