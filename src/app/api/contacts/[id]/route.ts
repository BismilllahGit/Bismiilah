import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const updateContactSchema = z.object({
  name: z.string().optional(),
  type: z.enum(["VENDOR", "SHOP", "ELECTRICIAN", "LABOUR_CONTRACTOR"]).optional(),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  address: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contact = await prisma.contact.findUnique({
      where: { id: (await params).id }
    });

    if (!contact) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({ error: "Failed to fetch contact" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = updateContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const contact = await prisma.contact.update({
      where: { id: (await params).id },
      data: parsed.data
    });

    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contact = await prisma.contact.update({
      where: { id: (await params).id },
      data: { isActive: false }
    });

    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({ error: "Failed to deactivate contact" }, { status: 500 });
  }
}
