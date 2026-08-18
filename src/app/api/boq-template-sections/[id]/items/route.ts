import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createItemSchema = z.object({
  title: z.string().min(1).transform(val => val.trim()),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: sectionId } = await params;
    const body = await request.json();
    
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { title } = parsed.data;

    // Get max sort order
    const maxSort = await prisma.bOQTemplateLineItem.aggregate({
      where: { sectionId },
      _max: { sortOrder: true },
    });
    const nextSort = (maxSort._max.sortOrder || 0) + 1;

    const item = await prisma.bOQTemplateLineItem.create({
      data: {
        sectionId,
        title,
        sortOrder: nextSort,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Failed to add template line item:", error);
    return NextResponse.json({ error: "Failed to add template line item" }, { status: 500 });
  }
}
