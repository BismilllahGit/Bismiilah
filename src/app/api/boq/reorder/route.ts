import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      sortOrder: z.number().int(),
      type: z.enum(["section", "line-item"]),
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
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { items } = parsed.data;

    // Check DRAFT status on the first item's BOQ
    const first = items[0];
    let boqStatus = "DRAFT";
    if (first.type === "section") {
      const sec = await prisma.bOQSection.findUnique({ where: { id: first.id }, include: { boq: true } });
      if (sec) boqStatus = sec.boq.status;
    } else if (first.type === "line-item") {
      const li = await prisma.bOQLineItem.findUnique({ where: { id: first.id }, include: { section: { include: { boq: true } } } });
      if (li) boqStatus = li.section.boq.status;
    }

    if (boqStatus !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot reorder items in an ACTIVE or SUPERSEDED BOQ. Only DRAFT BOQs can be modified." },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.type === "section") {
          await tx.bOQSection.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } });
        } else if (item.type === "line-item") {
          await tx.bOQLineItem.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder BOQ items:", error);
    return NextResponse.json({ error: "Failed to reorder items" }, { status: 500 });
  }
}
