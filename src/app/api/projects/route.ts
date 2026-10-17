import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  budget: z.coerce
    .number()
    .min(0, "Budget cannot be negative")
    .max(9999999999.99, "Budget cannot exceed ₹9,999,999,999.99")
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  clientId: z.string().min(1).optional(),
  newClient: z
    .object({
      name: z.string().trim().min(1, "Client name is required"),
      phone: z.string().trim().optional(),
      address: z.string().trim().optional(),
    })
    .optional(),
}).refine((d) => !!d.clientId !== !!d.newClient, {
  message: "Provide either an existing client or new client details",
  path: ["clientId"],
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: { select: { id: true, name: true } } },
    });

    return NextResponse.json(projects);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.format() },
        { status: 400 },
      );
    }

    const {
      name,
      location,
      description,
      budget,
      startDate,
      endDate,
      clientId,
      newClient,
    } = parsed.data;

    if (clientId) {
      const exists = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true },
      });
      if (!exists)
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const project = await prisma.$transaction(async (tx) => {
      const resolvedClientId =
        clientId ??
        (
          await tx.client.create({
            data: {
              name: newClient!.name,
              phone: newClient!.phone || null,
              address: newClient!.address || null,
            },
          })
        ).id;

      return tx.project.create({
        data: {
          clientId: resolvedClientId,
          name,
          location,
          notes: description,

          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : undefined,
          status: "ACTIVE",
          agreedValue: budget ? parseFloat(budget.toString()) : 0,
        },
      });
    });

    // Staff assignment logic has been removed as part of Daily Labour migration

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}
