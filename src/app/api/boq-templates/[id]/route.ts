import prisma from "@/lib/prisma";
import { z } from "zod";
import { makePatchHandler, makeDeleteHandler } from "@/app/api/_lib/crud";

const updateTemplateSchema = z.object({
  name: z.string().min(1).transform((val) => val.trim()).optional(),
  category: z.string().min(1).transform((val) => val.trim()).optional(),
});

export const PATCH = makePatchHandler({
  schema: updateTemplateSchema,
  fallbackMessage: "Failed to update template",
  authOptions: { allowTestBypass: true },
  update: (id, data) => prisma.bOQTemplate.update({ where: { id }, data }),
});

export const DELETE = makeDeleteHandler({
  fallbackMessage: "Failed to delete template",
  authOptions: { allowTestBypass: true },
  remove: (id) => prisma.bOQTemplate.delete({ where: { id } }),
});
