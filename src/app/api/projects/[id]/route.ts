import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const updateProjectSchema = z.object({
  name: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  agreedValue: z.coerce
    .number()
    .min(0, "Budget cannot be negative")
    .max(9999999999.99, "Budget cannot exceed ₹9,999,999,999.99")
    .optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "CLOSED"]).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const project = await prisma.project.findUnique({
      where: { id: (await params).id }
    });

    if (!project) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const dataToUpdate: z.infer<typeof updateProjectSchema> = { ...parsed.data };
    
    if (dataToUpdate.startDate) {
      dataToUpdate.startDate = new Date(dataToUpdate.startDate).toISOString();
    }
    if (dataToUpdate.endDate) {
      dataToUpdate.endDate = new Date(dataToUpdate.endDate).toISOString();
    }
    // agreedValue is already a number here — z.coerce.number() in the schema
    // handles the string-to-number conversion.

    const project = await prisma.project.update({
      where: { id: (await params).id },
      data: dataToUpdate
    });

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}
