import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const reorderMilestonesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      sortOrder: z.number().int(),
    })
  ).min(1),
});

export async function POST(request: Request) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reorderMilestonesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { items } = parsed.data;

    // Check DRAFT status on the first item's BOQ
    const first = items[0];
    const ms = await prisma.bOQPaymentMilestone.findUnique({
      where: { id: first.id },
      include: { boq: true },
    });

    if (ms && ms.boq.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot reorder milestones in an ACTIVE or SUPERSEDED BOQ. Only DRAFT BOQs can be modified." },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.bOQPaymentMilestone.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder milestones:", error);
    return NextResponse.json({ error: "Failed to reorder milestones" }, { status: 500 });
  }
}
