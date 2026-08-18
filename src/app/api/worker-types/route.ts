import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PaymentCycle } from "@prisma/client";
import { z } from "zod";

const createWorkerTypeSchema = z.object({
  name: z.string().min(1, "Name is required").transform(val => val.trim()),
  defaultRate: z.coerce.number().min(0, "Rate cannot be negative").default(0),
  paymentCycle: z.enum(["DAILY", "WEEKLY"]).default("WEEKLY"),
  isActive: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const workerTypes = await prisma.workerType.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' }
    });

    const result = workerTypes.map(t => ({
      id: t.id,
      name: t.name,
      workerType: t.name, // compatibility alias
      defaultRate: Number(t.defaultRate),
      paymentCycle: t.paymentCycle,
      isCustom: t.isCustom,
      isActive: t.isActive,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch worker types:", error);
    return NextResponse.json({ error: "Failed to fetch worker types" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createWorkerTypeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { name, defaultRate, paymentCycle, isActive } = parsed.data;

    const allExisting = await prisma.workerType.findMany();
    const existing = allExisting.find(t => t.name.trim().toLowerCase() === name.trim().toLowerCase());

    if (existing) {
      if (!existing.isActive) {
        // Re-activate previously deactivated type with updated rate/cycle
        const updated = await prisma.workerType.update({
          where: { id: existing.id },
          data: { defaultRate, paymentCycle: paymentCycle as PaymentCycle, isActive: true }
        });
        return NextResponse.json({
          id: updated.id,
          name: updated.name,
          workerType: updated.name,
          defaultRate: Number(updated.defaultRate),
          paymentCycle: updated.paymentCycle,
          isCustom: updated.isCustom,
          isActive: updated.isActive
        }, { status: 200 });
      }
      return NextResponse.json({ error: `A worker type with the name '${name}' already exists.` }, { status: 409 });
    }

    const created = await prisma.workerType.create({
      data: {
        name,
        defaultRate,
        paymentCycle: paymentCycle as PaymentCycle,
        isCustom: true, // Set isCustom = true for anything created through this route
        isActive,
      }
    });

    return NextResponse.json({
      id: created.id,
      name: created.name,
      workerType: created.name,
      defaultRate: Number(created.defaultRate),
      paymentCycle: created.paymentCycle,
      isCustom: created.isCustom,
      isActive: created.isActive
    }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: "A worker type with this name already exists." }, { status: 409 });
    }
    console.error("Failed to create worker type:", error);
    return NextResponse.json({ error: "Failed to create worker type" }, { status: 500 });
  }
}
