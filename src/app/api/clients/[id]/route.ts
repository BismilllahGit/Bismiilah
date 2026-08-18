import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const updateClientSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await prisma.client.findUnique({
      where: { id: (await params).id },
      include: {
        invoices: {
          orderBy: { issuedDate: 'desc' }
        }
      }
    });

    if (!client) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = updateClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const client = await prisma.client.update({
      where: { id: (await params).id },
      data: parsed.data
    });

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await prisma.client.update({
      where: { id: (await params).id },
      data: { isActive: false }
    });

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: "Failed to deactivate client" }, { status: 500 });
  }
}
