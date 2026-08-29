import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    const versions = await prisma.bOQ.findMany({
      where: { projectId },
      orderBy: { versionNumber: "desc" },
      include: {
        sections: {
          include: {
            lineItems: {
              select: { amount: true },
            },
          },
        },
      },
    });

    const history = versions.map((v) => {
      let estimatedTotal = 0;
      let lineItemsCount = 0;

      v.sections.forEach((s) => {
        s.lineItems.forEach((li) => {
          estimatedTotal += Number(li.amount || 0);
          lineItemsCount++;
        });
      });

      return {
        id: v.id,
        versionNumber: v.versionNumber,
        status: v.status,
        targetBudget: v.targetBudget !== null ? Number(v.targetBudget) : null,
        estimatedTotal: Number(estimatedTotal.toFixed(2)),
        createdAt: v.createdAt,
        approvedAt: v.approvedAt,
        note: v.note || `Version ${v.versionNumber} estimate snapshot`,
        sectionCount: v.sections.length,
        lineItemsCount,
      };
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching BOQ version history:", error);
    return NextResponse.json(
      { error: "Failed to load BOQ version history" },
      { status: 500 }
    );
  }
}
