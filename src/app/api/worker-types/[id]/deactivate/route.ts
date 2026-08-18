import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const identifier = (await params).id;

    let workerType = await prisma.workerType.findUnique({
      where: { id: identifier }
    });

    if (!workerType) {
      workerType = await prisma.workerType.findUnique({
        where: { name: identifier.toUpperCase() }
      });
    }

    if (!workerType) {
      return NextResponse.json({ error: "Worker type not found" }, { status: 404 });
    }

    // Soft-delete: sets isActive = false rather than deleting to preserve historical references
    const updated = await prisma.workerType.update({
      where: { id: workerType.id },
      data: { isActive: false }
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      workerType: updated.name,
      defaultRate: Number(updated.defaultRate),
      paymentCycle: updated.paymentCycle,
      isCustom: updated.isCustom,
      isActive: updated.isActive,
      message: "Worker type deactivated successfully"
    }, { status: 200 });
  } catch (error) {
    console.error("Failed to deactivate worker type:", error);
    return NextResponse.json({ error: "Failed to deactivate worker type" }, { status: 500 });
  }
}
