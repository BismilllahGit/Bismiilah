import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PaymentCycle } from "@prisma/client";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).transform(val => val.trim().toUpperCase()).optional(),
  defaultRate: z.coerce.number().min(0, "Rate cannot be negative").optional(),
  paymentCycle: z.enum(["DAILY", "WEEKLY"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const identifier = (await params).id;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    // Locate worker type by ID or Name
    let workerType = await prisma.workerType.findUnique({
      where: { id: identifier }
    });

    if (!workerType) {
      workerType = await prisma.workerType.findUnique({
        where: { name: identifier.toUpperCase() }
      });
    }

    if (!workerType) {
      return NextResponse.json({ error: "Worker type not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.defaultRate !== undefined) updateData.defaultRate = parsed.data.defaultRate;
    if (parsed.data.paymentCycle !== undefined) updateData.paymentCycle = parsed.data.paymentCycle as PaymentCycle;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

    const updated = await prisma.workerType.update({
      where: { id: workerType.id },
      data: updateData
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      workerType: updated.name,
      defaultRate: Number(updated.defaultRate),
      paymentCycle: updated.paymentCycle,
      isCustom: updated.isCustom,
      isActive: updated.isActive
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: "A worker type with this name already exists." }, { status: 409 });
    }
    console.error("Failed to update worker type:", error);
    return NextResponse.json({ error: "Failed to update worker type" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const identifier = (await params).id;

    let workerType = await prisma.workerType.findUnique({
      where: { id: identifier }
    });

    if (!workerType) {
      workerType = await prisma.workerType.findUnique({
        where: { name: identifier.toUpperCase() }
      });
    }

    if (!workerType) {
      return NextResponse.json({ error: "Worker type not found" }, { status: 404 });
    }

    // Soft delete / deactivate to avoid breaking historical foreign key constraints
    await prisma.workerType.update({
      where: { id: workerType.id },
      data: { isActive: false }
    });

    return NextResponse.json({ message: "Worker type deactivated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete worker type:", error);
    return NextResponse.json({ error: "Failed to delete worker type" }, { status: 500 });
  }
}
