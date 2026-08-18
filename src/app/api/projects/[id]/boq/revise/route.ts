import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEnrichedProjectBOQ } from "@/lib/queries/boq-queries";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { id: projectId } = await params;

    // 1. Check if there's already an editable DRAFT BOQ for this project
    const existingDraft = await prisma.bOQ.findFirst({
      where: { projectId, status: "DRAFT" },
      orderBy: { versionNumber: "desc" },
    });

    if (existingDraft) {
      // If a DRAFT already exists, return its id instead of multiplying duplicates
      return NextResponse.json(
        {
          message: `An editable DRAFT revision (Version ${existingDraft.versionNumber}) already exists.`,
          id: existingDraft.id,
          versionNumber: existingDraft.versionNumber,
          status: existingDraft.status,
          alreadyExisted: true,
        },
        { status: 200 }
      );
    }

    // 2. Fetch the ACTIVE version as the baseline
    let sourceBOQ = await prisma.bOQ.findFirst({
      where: { projectId, status: "ACTIVE" },
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: {
            lineItems: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    // Fallback: if no ACTIVE version exists yet, branch off the highest version
    if (!sourceBOQ) {
      sourceBOQ = await prisma.bOQ.findFirst({
        where: { projectId },
        orderBy: { versionNumber: "desc" },
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
            include: {
              lineItems: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      });
    }

    if (!sourceBOQ) {
      return NextResponse.json(
        { error: "No existing BOQ found to revise. Please initialize an initial estimate first." },
        { status: 404 }
      );
    }

    // 3. Find highest versionNumber to increment by 1
    const highestVer = await prisma.bOQ.findFirst({
      where: { projectId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (highestVer?.versionNumber || sourceBOQ.versionNumber) + 1;

    // 4. Perform atomic deep-clone snapshot inside a Prisma transaction
    const newBOQId = await prisma.$transaction(async (tx) => {
      const createdBOQ = await tx.bOQ.create({
        data: {
          projectId,
          versionNumber: nextVersionNumber,
          status: "DRAFT",
          targetBudget: sourceBOQ!.targetBudget,
          cgstRate: sourceBOQ!.cgstRate,
          sgstRate: sourceBOQ!.sgstRate,
          termsOverride: sourceBOQ!.termsOverride,
          note: `Snapshot revised from Version ${sourceBOQ!.versionNumber}`,
        },
      });

      for (const section of sourceBOQ!.sections) {
        const newSection = await tx.bOQSection.create({
          data: {
            boqId: createdBOQ.id,
            name: section.name,
            groupId: section.groupId,
            sortOrder: section.sortOrder,
          },
        });

        if (section.lineItems && section.lineItems.length > 0) {
          await tx.bOQLineItem.createMany({
            data: section.lineItems.map((li) => ({
              sectionId: newSection.id,
              itemNo: li.itemNo,
              title: li.title,
              make: li.make,
              description: li.description,
              lineType: li.lineType,
              quantity: li.quantity,
              unit: li.unit,
              rate: li.rate,
              amount: li.amount,
              executedQuantity: li.executedQuantity,
              executedAmount: li.executedAmount,
              grade: li.grade,
              itemId: li.itemId,
              workerTypeId: li.workerTypeId,
              sortOrder: li.sortOrder,
            })),
          });
        }
      }

      return createdBOQ.id;
    });

    // 5. Fetch fully enriched data for the new revision
    const enriched = await getEnrichedProjectBOQ(projectId, nextVersionNumber);

    return NextResponse.json(
      {
        message: `Created deep-clone revision snapshot Version ${nextVersionNumber}`,
        id: newBOQId,
        versionNumber: nextVersionNumber,
        status: "DRAFT",
        boq: enriched.current,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error revising BOQ snapshot:", error);
    return NextResponse.json(
      { error: "Failed to generate revised BOQ snapshot" },
      { status: 500 }
    );
  }
}
