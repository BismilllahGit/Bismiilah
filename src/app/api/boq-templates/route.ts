import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").transform(val => val.trim()),
  category: z.string().min(1, "Category is required").transform(val => val.trim()),
});

export async function GET(request: Request) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: Prisma.BOQTemplateWhereInput = category
      ? { category: { equals: category, mode: Prisma.QueryMode.insensitive } }
      : {};

    const templates = await prisma.bOQTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: {
            group: true,
            lineItems: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const created = await prisma.bOQTemplate.create({
      data: parsed.data,
      include: {
        sections: { include: { group: true, lineItems: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to create template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
