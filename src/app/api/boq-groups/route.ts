import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").transform(val => val.trim()),
  sortOrder: z.coerce.number().optional().default(10),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    const groups = await prisma.bOQGroup.findMany({
      where: all ? undefined : { isActive: true },
      orderBy: [
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Failed to fetch BOQ groups:", error);
    return NextResponse.json({ error: "Failed to fetch BOQ groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { name, sortOrder } = parsed.data;

    // Check existing case-insensitive
    const existing = await prisma.bOQGroup.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (existing) {
      if (!existing.isActive) {
        const updated = await prisma.bOQGroup.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        return NextResponse.json(updated, { status: 200 });
      }
      // Return existing group immediately so selection can proceed smoothly without erroring
      return NextResponse.json(existing, { status: 200 });
    }

    const created = await prisma.bOQGroup.create({
      data: {
        name,
        isCustom: true,
        isActive: true,
        sortOrder,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create BOQ group:", error);
    return NextResponse.json({ error: "Failed to create BOQ group" }, { status: 500 });
  }
}
