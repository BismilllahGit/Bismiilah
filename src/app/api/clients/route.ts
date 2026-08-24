import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { requireSession } from "@/app/api/_lib/auth-guard";
import { parseJsonBody } from "@/app/api/_lib/body";
import { withApiHandler } from "@/app/api/_lib/handler";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const GET = withApiHandler("Failed to fetch clients", async (request) => {
  await requireSession();
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("includeInactive") === "true";

  const clients = await prisma.client.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
    include: { invoices: { select: { projectId: true } } },
  });

  return NextResponse.json(clients);
});

export const POST = withApiHandler("Failed to create client", async (request) => {
  await requireSession();
  const { name, phone, address } = await parseJsonBody(request, clientSchema);
  const client = await prisma.client.create({ data: { name, phone, address } });
  return NextResponse.json(client, { status: 201 });
});
