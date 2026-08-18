import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["MATERIAL", "TOOL", "PAINT", "CEMENT"]),
  grade: z.enum(["GRADE_A", "GRADE_B", "GRADE_C"]).optional().nullable(),
  unit: z.string().min(1, "Unit is required"),
  unitCost: z.coerce.number().min(0),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const items = await prisma.item.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { name, type, grade, unit, unitCost } = parsed.data;

    const item = await prisma.item.create({
      data: {
        name,
        type,
        grade,
        unit,
        unitCost,
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
