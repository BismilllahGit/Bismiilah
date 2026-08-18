import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; templateId: string }> }) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, templateId } = await params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const template = await prisma.bOQTemplate.findUnique({
      where: { id: templateId },
      include: {
        sections: {
          include: {
            lineItems: true,
          },
        },
      },
    });

    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    // Ensure no DRAFT exists
    const existingDraft = await prisma.bOQ.findFirst({
      where: { projectId, status: "DRAFT" },
    });
    if (existingDraft) {
      return NextResponse.json(
        { error: "A DRAFT BOQ already exists for this project. Please delete or finalize it first." },
        { status: 400 }
      );
    }

    const latestBoq = await prisma.bOQ.findFirst({
      where: { projectId },
      orderBy: { versionNumber: "desc" },
    });

    const newVersion = latestBoq ? latestBoq.versionNumber + 1 : 1;

    // Fetch the business profile to get default terms
    const businessProfile = await prisma.businessProfile.findFirst();

    // Perform creation in a transaction
    const newBoq = await prisma.$transaction(async (tx) => {
      const boq = await tx.bOQ.create({
        data: {
          projectId,
          versionNumber: newVersion,
          status: "DRAFT",
          termsOverride: businessProfile?.defaultTerms || null,
        },
      });

      for (const tSection of template.sections) {
        const section = await tx.bOQSection.create({
          data: {
            boqId: boq.id,
            name: tSection.name,
            groupId: tSection.groupId,
            sortOrder: tSection.sortOrder,
          },
        });

        if (tSection.lineItems.length > 0) {
          await tx.bOQLineItem.createMany({
            data: tSection.lineItems.map((tItem) => ({
              sectionId: section.id,
              title: tItem.title,
              sortOrder: tItem.sortOrder,
              lineType: "CALCULATED",
              quantity: null,
              rate: null,
              amount: 0,
              executedQuantity: 0,
              executedAmount: 0,
            })),
          });
        }
      }

      return boq;
    });

    return NextResponse.json(newBoq, { status: 201 });
  } catch (error) {
    console.error("Failed to create BOQ from template:", error);
    return NextResponse.json({ error: "Failed to create BOQ from template" }, { status: 500 });
  }
}
