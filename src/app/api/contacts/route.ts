import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["VENDOR", "SHOP", "ELECTRICIAN", "LABOUR_CONTRACTOR"]),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  address: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const contacts = await prisma.contact.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(contacts);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { name, type, phone, specialty, address } = parsed.data;

    const contact = await prisma.contact.create({
      data: {
        name,
        type,
        phone,
        specialty,
        address,
      }
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
