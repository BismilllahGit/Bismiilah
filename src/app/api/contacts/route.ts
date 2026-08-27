import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { requireSession } from "@/app/api/_lib/auth-guard";
import { parseJsonBody } from "@/app/api/_lib/body";
import { withApiHandler } from "@/app/api/_lib/handler";

const createContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["VENDOR", "SHOP", "ELECTRICIAN", "LABOUR_CONTRACTOR"]),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  address: z.string().optional(),
});

export const GET = withApiHandler("Failed to fetch contacts", async (request) => {
  await requireSession();
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("includeInactive") === "true";

  const contacts = await prisma.contact.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(contacts);
});

export const POST = withApiHandler("Failed to create contact", async (request) => {
  await requireSession();
  const { name, type, phone, specialty, address } = await parseJsonBody(request, createContactSchema);
  const contact = await prisma.contact.create({ data: { name, type, phone, specialty, address } });
  return NextResponse.json(contact, { status: 201 });
});
