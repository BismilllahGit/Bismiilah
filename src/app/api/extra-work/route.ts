import { NextResponse } from "next/server";
import { IN_ACTIVE_PROJECT } from "@/lib/trash-filters";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const extraWork = await prisma.extraWork.findMany({
      where: IN_ACTIVE_PROJECT,
      include: {
        project: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(extraWork);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch extra work" }, { status: 500 });
  }
}
