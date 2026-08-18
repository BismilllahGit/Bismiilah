import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEnrichedProjectBOQ } from "@/lib/queries/boq-queries";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; boqId: string }> }
) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { id: projectId, boqId } = await params;

    const targetBOQ = await prisma.bOQ.findUnique({ where: { id: boqId } });

    if (!targetBOQ || targetBOQ.projectId !== projectId) {
      return NextResponse.json(
        { error: "Target BOQ version not found for this project." },
        { status: 404 }
      );
    }

    if (targetBOQ.status === "ACTIVE") {
      const enriched = await getEnrichedProjectBOQ(projectId, targetBOQ.versionNumber);
      return NextResponse.json({
        message: "This BOQ revision is already ACTIVE.",
        boq: enriched.current,
      });
    }

    if (targetBOQ.status === "SUPERSEDED") {
      return NextResponse.json(
        { error: "Cannot activate a SUPERSEDED historical BOQ version. Please create a new revision instead." },
        { status: 400 }
      );
    }

    // Simultaneously mark any existing ACTIVE BOQ as SUPERSEDED and activate target inside a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Demote currently active versions to SUPERSEDED
      await tx.bOQ.updateMany({
        where: {
          projectId,
          status: "ACTIVE",
          id: { not: boqId },
        },
        data: { status: "SUPERSEDED" },
      });

      // 2. Activate target BOQ with timestamp
      await tx.bOQ.update({
        where: { id: boqId },
        data: {
          status: "ACTIVE",
          approvedAt: new Date(),
        },
      });
    });

    const enriched = await getEnrichedProjectBOQ(projectId, targetBOQ.versionNumber);

    return NextResponse.json(
      {
        message: `Version ${targetBOQ.versionNumber} activated as the official project estimate. Previous version superseded.`,
        boq: enriched.current,
        id: boqId,
        status: "ACTIVE",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error activating BOQ:", error);
    return NextResponse.json(
      { error: "Failed to activate BOQ version" },
      { status: 500 }
    );
  }
}
