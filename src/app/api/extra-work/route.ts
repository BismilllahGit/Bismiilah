import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const extraWork = await prisma.extraWork.findMany({
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
