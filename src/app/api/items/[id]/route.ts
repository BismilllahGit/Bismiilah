import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const updateItemSchema = z.object({
  name: z.string().optional(),
  type: z.enum(["MATERIAL", "TOOL", "PAINT", "CEMENT"]).optional(),
  grade: z.enum(["GRADE_A", "GRADE_B", "GRADE_C"]).optional().nullable(),
  unit: z.string().optional(),
  unitCost: z.coerce.number().min(0).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const item = await prisma.item.findUnique({
      where: { id: (await params).id }
    });

    if (!item) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = updateItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const item = await prisma.item.update({
      where: { id: (await params).id },
      data: parsed.data
    });

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const item = await prisma.item.update({
      where: { id: (await params).id },
      data: { isActive: false }
    });

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to deactivate item" }, { status: 500 });
  }
}
