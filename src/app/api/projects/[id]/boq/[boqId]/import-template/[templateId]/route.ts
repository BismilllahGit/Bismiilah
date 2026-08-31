import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const importBodySchema = z.object({
  // Omitted/absent -> import every section on the template (whole-template
  // "Use All" action). Present -> import only the listed section ids (the
  // per-section picker).
  sectionIds: z.array(z.string().min(1)).optional(),
});

// Appends a template's sections + line items onto an EXISTING DRAFT BOQ,
// unlike /boq/from-template/[templateId] which creates a brand new BOQ
// version. Used by the "Import from Template" action inside the BOQ editor
// while a DRAFT is already open, so section/item titles can be pulled in
// without losing what's already on the draft.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; boqId: string; templateId: string }> },
) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, boqId, templateId } = await params;

    // Body is optional — no body (or an empty one) means "import everything".
    let sectionIds: string[] | undefined;
    const rawBody = await request.text();
    if (rawBody) {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      const parsed = importBodySchema.safeParse(parsedJson);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
      }
      sectionIds = parsed.data.sectionIds;
    }

    const boq = await prisma.bOQ.findUnique({ where: { id: boqId } });
    if (!boq || boq.projectId !== projectId) {
      return NextResponse.json({ error: "BOQ not found" }, { status: 404 });
    }
    if (boq.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot import into an ACTIVE or SUPERSEDED BOQ. Only DRAFT BOQs can be modified." },
        { status: 403 },
      );
    }

    const template = await prisma.bOQTemplate.findUnique({
      where: { id: templateId },
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: { lineItems: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    let sectionsToImport = template.sections;
    if (sectionIds && sectionIds.length > 0) {
      const idSet = new Set(sectionIds);
      sectionsToImport = template.sections.filter((s) => idSet.has(s.id));
      if (sectionsToImport.length === 0) {
        return NextResponse.json(
          { error: "None of the selected sections were found on this template" },
          { status: 400 },
        );
      }
    }
    if (sectionsToImport.length === 0) {
      return NextResponse.json({ error: "This template has no sections to import" }, { status: 400 });
    }

    const lastSection = await prisma.bOQSection.findFirst({
      where: { boqId },
      orderBy: { sortOrder: "desc" },
    });
    let nextSortOrder = lastSection ? lastSection.sortOrder + 1 : 0;

    const result = await prisma.$transaction(async (tx) => {
      let sectionsAdded = 0;
      let itemsAdded = 0;

      for (const tSection of sectionsToImport) {
        const section = await tx.bOQSection.create({
          data: {
            boqId,
            name: tSection.name,
            groupId: tSection.groupId,
            sortOrder: nextSortOrder++,
          },
        });
        sectionsAdded++;

        if (tSection.lineItems.length > 0) {
          await tx.bOQLineItem.createMany({
            data: tSection.lineItems.map((tItem, idx) => ({
              sectionId: section.id,
              title: tItem.title,
              sortOrder: idx,
              lineType: "CALCULATED",
              quantity: null,
              rate: null,
              amount: 0,
              executedQuantity: 0,
              executedAmount: 0,
            })),
          });
          itemsAdded += tSection.lineItems.length;
        }
      }

      return { sectionsAdded, itemsAdded };
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    console.error("Failed to import BOQ template into draft:", error);
    return NextResponse.json({ error: "Failed to import template" }, { status: 500 });
  }
}
