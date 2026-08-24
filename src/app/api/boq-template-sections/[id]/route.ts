import prisma from "@/lib/prisma";
import { z } from "zod";
import { makePatchHandler, makeDeleteHandler } from "@/app/api/_lib/crud";

const updateSectionSchema = z.object({
  name: z.string().min(1).transform((val) => val.trim()).optional(),
  groupId: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

export const PATCH = makePatchHandler({
  schema: updateSectionSchema,
  fallbackMessage: "Failed to update template section",
  authOptions: { allowTestBypass: true },
  update: (id, data) => prisma.bOQTemplateSection.update({ where: { id }, data }),
});

export const DELETE = makeDeleteHandler({
  fallbackMessage: "Failed to delete template section",
  authOptions: { allowTestBypass: true },
  remove: (id) => prisma.bOQTemplateSection.delete({ where: { id } }),
});
