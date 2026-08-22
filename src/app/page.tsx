import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, HardHat, Hammer, IndianRupee } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Active Projects
  const activeProjectsCount = await prisma.project.count({
    where: { status: "ACTIVE" },
  });

  // Today's Active Labour
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const labourToday = await prisma.dailyLabourEntry.aggregate({
    where: { date: { gte: todayStart, lte: todayEnd } },
    _sum: { headcount: true },
  });
  const workersCount = labourToday._sum.headcount || 0;

  // Pending Payments (Invoices)
  const invoices = await prisma.invoice.findMany({
    where: { status: { notIn: ["PAID", "VOID"] } },
    include: { clientPayments: true, paymentAllocations: true },
  });

  const pendingPayments = invoices.reduce((acc, inv) => {
    const paid =
      inv.clientPayments.reduce((pAcc, p) => pAcc + Number(p.amount), 0) +
      inv.paymentAllocations.reduce(
        (pAcc, p) => pAcc + Number(p.allocatedAmount),
        0,
      );
    return acc + (Number(inv.amount) - paid);
  }, 0);

  // Unbilled Extra Work
  const extraWork = await prisma.extraWork.aggregate({
    where: { status: "UNBILLED" },
    _sum: { amount: true },
  });
  const unbilledExtra = Number(extraWork._sum.amount || 0);

  // Recent Activity
  const recentActivities = await prisma.siteActivity.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { project: { select: { name: true } } },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl space-y-6 mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of Bismillah Construction operations.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Projects
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjectsCount}</div>
            <p className="text-xs text-muted-foreground">
              Currently running sites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labour Today</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workersCount}</div>
            <p className="text-xs text-muted-foreground">
              Headcount deployed today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Payments
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ₹{pendingPayments.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">To be collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unbilled Work</CardTitle>
            <Hammer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{unbilledExtra.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Extra work not yet invoiced
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from active sites.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-md">
                No recent activity to display.
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex flex-col space-y-1 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">
                        {act.project.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(act.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">
                      {act.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Link
                href="/projects/new"
                className="text-left px-4 py-2 border rounded-md hover:bg-muted transition-colors font-medium text-sm"
              >
                Add New Project
              </Link>
              <Link
                href="/invoices"
                className="text-left px-4 py-2 border rounded-md hover:bg-muted transition-colors font-medium text-sm"
              >
                Manage Invoices
              </Link>
              <Link
                href="/vendors"
                className="text-left px-4 py-2 border rounded-md hover:bg-muted transition-colors font-medium text-sm"
              >
                Vendor Ledgers
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
