import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { requireSession } from "@/app/api/_lib/auth-guard";
import { parseJsonBody } from "@/app/api/_lib/body";
import { withApiHandler } from "@/app/api/_lib/handler";
import { buildUpdateData } from "@/app/api/_lib/crud";
import { ApiError } from "@/app/api/_lib/errors";

const updateGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").transform((val) => val.trim()).optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler<Params>(
  "Failed to update BOQ group",
  async (request, { params }) => {
    await requireSession({ allowTestBypass: true });
    const { id } = await params;
    const parsed = await parseJsonBody(request, updateGroupSchema);
    const data = buildUpdateData(parsed);

    if (data.name) {
      const existing = await prisma.bOQGroup.findFirst({
        where: { name: { equals: data.name as string, mode: "insensitive" }, id: { not: id } },
      });
      if (existing) {
        throw new ApiError("Another group with this name already exists", 400);
      }
    }

    const updated = await prisma.bOQGroup.update({ where: { id }, data });
    return NextResponse.json(updated);
  },
);
