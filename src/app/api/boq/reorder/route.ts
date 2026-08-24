import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { requireSession } from "@/app/api/_lib/auth-guard";
import { parseJsonBody } from "@/app/api/_lib/body";
import { withApiHandler } from "@/app/api/_lib/handler";
import { getBoqStatusForFirstReorderItem, assertBoqDraftForReorder } from "@/app/api/_lib/boq-guards";

const reorderSchema = z.object({
  items: z
    .array(z.object({ id: z.string().min(1), sortOrder: z.number().int(), type: z.enum(["section", "line-item"]) }))
    .min(1),
});

export const POST = withApiHandler("Failed to reorder items", async (request) => {
  await requireSession({ allowTestBypass: true });
  const { items } = await parseJsonBody(request, reorderSchema);

  const status = await getBoqStatusForFirstReorderItem(items[0], "section-or-line-item", items[0].type);
  assertBoqDraftForReorder(status);

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (item.type === "section") {
        await tx.bOQSection.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } });
      } else {
        await tx.bOQLineItem.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } });
      }
    }
  });

  return NextResponse.json({ success: true });
});
