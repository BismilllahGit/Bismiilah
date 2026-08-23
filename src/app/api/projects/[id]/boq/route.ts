import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import {
  getEnrichedProjectBOQ,
  computeBOQRollups,
  computeActualsForBOQ,
} from "@/lib/queries/boq-queries";

const createBOQSchema = z.object({
  targetBudget: z.coerce.number().optional().nullable(),
  note: z.string().optional().nullable(),
  template: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const versionParam = searchParams.get("version");

    const targetVersion = versionParam ? parseInt(versionParam, 10) : undefined;

    // THE REAL FETCH HAPPENS HERE:
    const boqData = await getEnrichedProjectBOQ(projectId, targetVersion);

    return NextResponse.json(boqData);
  } catch (error) {
    console.error("Failed to fetch project BOQ:", error);
    return NextResponse.json(
      { error: "Failed to fetch project BOQ" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = createBOQSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 },
      );
    }

    const { targetBudget, note, template } = parsed.data;

    const existing = await prisma.bOQ.findMany({
      where: { projectId },
      orderBy: { versionNumber: "desc" },
      take: 1,
    });

    const nextVersion = existing.length > 0 ? existing[0].versionNumber + 1 : 1;

    const created = await prisma.bOQ.create({
      data: {
        projectId,
        versionNumber: nextVersion,
        status: "DRAFT",
        targetBudget: targetBudget ? Number(targetBudget) : null,
        note:
          note ||
          (template && template.toLowerCase() === "residential"
            ? "Seeded Default Residential Template"
            : null),
      },
    });

    if (template && template.toLowerCase() === "residential") {
      let civilGroup = await prisma.bOQGroup.findFirst({
        where: { name: "Civil" },
      });
      if (!civilGroup)
        civilGroup = await prisma.bOQGroup.create({
          data: { name: "Civil", sortOrder: 10 },
        });

      let othersGroup = await prisma.bOQGroup.findFirst({
        where: { name: "Others" },
      });
      if (!othersGroup)
        othersGroup = await prisma.bOQGroup.create({
          data: { name: "Others", sortOrder: 20 },
        });

      const skeleton = [
        {
          name: "Basement & Foundation Work",
          groupId: civilGroup.id,
          sortOrder: 1,
          items: ["Excavation & Earthwork", "PCC Bedding", "RCC Footings"],
        },
        {
          name: "Ground & Superstructure RCC",
          groupId: civilGroup.id,
          sortOrder: 2,
          items: ["Columns & Plinth", "Slabs & Beams", "Brick Masonry"],
        },
        {
          name: "Finishing & Electrical Work",
          groupId: othersGroup.id,
          sortOrder: 3,
          items: [
            "Internal Electrical Piping",
            "Plastering & Tiling",
            "Painting & Waterproofing",
          ],
        },
      ];

      for (const sec of skeleton) {
        const createdSec = await prisma.bOQSection.create({
          data: {
            boqId: created.id,
            name: sec.name,
            groupId: sec.groupId,
            sortOrder: sec.sortOrder,
          },
        });
        for (let idx = 0; idx < sec.items.length; idx++) {
          await prisma.bOQLineItem.create({
            data: {
              sectionId: createdSec.id,
              title: sec.items[idx],
              sortOrder: idx + 1,
              amount: 0,
              quantity: 1,
              rate: 0,
            },
          });
        }
      }
    }

    const fullyPopulated = await prisma.bOQ.findUnique({
      where: { id: created.id },
      include: {
        sections: {
          // --- FIXED: ADDED TWO-LEVEL SORT ---
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          include: {
            group: {
              select: { name: true, isCustom: true, isActive: true },
            },
            lineItems: {
              // --- FIXED: ADDED TWO-LEVEL SORT ---
              orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
              include: {
                item: true,
                workerType: true,
              },
            },
          },
        },
      },
    });

    const enriched = await computeActualsForBOQ(
      computeBOQRollups(fullyPopulated),
      projectId,
    );
    return NextResponse.json(enriched, { status: 201 });
  } catch (error) {
    console.error("Failed to create BOQ:", error);
    return NextResponse.json(
      { error: "Failed to create BOQ" },
      { status: 500 },
    );
  }
}
