import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProjectCostBreakdown } from "./ProjectCostBreakdown";
import { ProjectPaymentsTable } from "./ProjectPaymentsTable";

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

  const [payments, invoices] = await Promise.all([
    prisma.clientPayment.findMany({
      where: {
        OR: [
          { projectId: project.id },
          // Advance payments recorded against the client without a project
          ...(project.clientId
            ? [{ projectId: null, clientId: project.clientId }]
            : []),
        ],
      },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        voucherNumber: true,
        amount: true,
        paymentDate: true,
        method: true,
        note: true,
        invoiceId: true,
      },
    }),
    prisma.invoice.findMany({
      where: { projectId: project.id, status: { not: "VOID" } },
      select: { amount: true },
    }),
  ]);
  const totalReceived = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const inr = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

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

      {/* Client billing & payments */}
      <Card className="col-span-1 md:col-span-3">
        <CardHeader>
          <CardTitle>Client Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Invoiced
              </h3>
              <p className="text-sm font-medium">{inr(totalInvoiced)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Received
              </h3>
              <p className="text-sm font-medium text-green-600">
                {inr(totalReceived)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Budget Balance
              </h3>
              <p className="text-sm font-medium">
                {project.agreedValue
                  ? inr(Number(project.agreedValue) - totalReceived)
                  : "Not set"}
              </p>
            </div>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground pt-4 border-t">
              No client payments recorded for this project yet.
            </p>
          ) : (
            <ProjectPaymentsTable
              payments={payments.map((p) => ({
                ...p,
                amount: Number(p.amount),
                paymentDate: p.paymentDate.toISOString(),
              }))}
            />
          )}
        </CardContent>
      </Card>

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
