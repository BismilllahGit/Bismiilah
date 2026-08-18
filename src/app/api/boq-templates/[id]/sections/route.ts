import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createSectionSchema = z.object({
  name: z.string().min(1).transform(val => val.trim()),
  groupId: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: templateId } = await params;
    const body = await request.json();
    
    const parsed = createSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { name, groupId } = parsed.data;

    // Get max sort order
    const maxSort = await prisma.bOQTemplateSection.aggregate({
      where: { templateId },
      _max: { sortOrder: true },
    });
    const nextSort = (maxSort._max.sortOrder || 0) + 1;

    const section = await prisma.bOQTemplateSection.create({
      data: {
        templateId,
        name,
        groupId,
        sortOrder: nextSort,
      },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error("Failed to add template section:", error);
    return NextResponse.json({ error: "Failed to add template section" }, { status: 500 });
  }
}
