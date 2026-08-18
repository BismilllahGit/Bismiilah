import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createSectionSchema = z.object({
  boqId: z.string().min(1, "boqId is required"),
  name: z.string().min(1, "Section name is required").transform(val => val.trim()),
  groupId: z.string().min(1, "Group is required"),
  sortOrder: z.coerce.number().optional().default(1),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { boqId, name, groupId, sortOrder } = parsed.data;

    // Strict DRAFT enforcement
    const boq = await prisma.bOQ.findUnique({ where: { id: boqId } });
    if (!boq) return NextResponse.json({ error: "BOQ not found" }, { status: 404 });
    if (boq.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot add sections to an ACTIVE or SUPERSEDED BOQ. Only DRAFT BOQs can be modified." },
        { status: 403 }
      );
    }

    // Determine sortOrder if not provided or to append at the bottom
    let finalSortOrder = sortOrder;
    const lastSection = await prisma.bOQSection.findFirst({
      where: { boqId },
      orderBy: { sortOrder: "desc" },
    });
    if (lastSection && !body.sortOrder) {
      finalSortOrder = lastSection.sortOrder + 1;
    }

    const section = await prisma.bOQSection.create({
      data: {
        boqId,
        name,
        groupId,
        sortOrder: finalSortOrder,
      },
      include: {
        group: true,
        lineItems: true,
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error("Failed to create BOQ section:", error);
    return NextResponse.json({ error: "Failed to create BOQ section" }, { status: 500 });
  }
}
