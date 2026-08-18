import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, referenceId, referenceType, recipientPhone } = body;

    if (!type || !referenceId || !referenceType || !recipientPhone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const shareLog = await prisma.shareLog.create({
      data: {
        type,
        referenceId,
        referenceType,
        recipientPhone,
      }
    });

    return NextResponse.json(shareLog, { status: 201 });
  } catch (error: any) {
    console.error("Error creating ShareLog:", error);
    return NextResponse.json({ error: error.message || "Failed to create share log" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const shareLogs = await prisma.shareLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(shareLogs);
  } catch (error: any) {
    console.error("Error fetching ShareLogs:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch share logs" }, { status: 500 });
  }
}
