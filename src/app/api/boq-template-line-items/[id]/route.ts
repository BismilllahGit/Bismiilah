import prisma from "@/lib/prisma";
import { z } from "zod";
import { makePatchHandler, makeDeleteHandler } from "@/app/api/_lib/crud";

const updateItemSchema = z.object({
  title: z.string().min(1).transform((val) => val.trim()).optional(),
  sortOrder: z.number().int().optional(),
});

export const PATCH = makePatchHandler({
  schema: updateItemSchema,
  fallbackMessage: "Failed to update template line item",
  authOptions: { allowTestBypass: true },
  update: (id, data) => prisma.bOQTemplateLineItem.update({ where: { id }, data }),
});

export const DELETE = makeDeleteHandler({
  fallbackMessage: "Failed to delete template line item",
  authOptions: { allowTestBypass: true },
  remove: (id) => prisma.bOQTemplateLineItem.delete({ where: { id } }),
});
