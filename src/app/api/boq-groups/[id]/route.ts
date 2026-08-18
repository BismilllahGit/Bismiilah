import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const updateGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").transform(val => val.trim()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    const parsed = updateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const data: any = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

    if (data.name) {
      // Ensure no collision if renaming
      const existing = await prisma.bOQGroup.findFirst({
        where: { name: { equals: data.name, mode: "insensitive" }, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json({ error: "Another group with this name already exists" }, { status: 400 });
      }
    }

    const updated = await prisma.bOQGroup.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update BOQ group:", error);
    return NextResponse.json({ error: "Failed to update BOQ group" }, { status: 500 });
  }
}
