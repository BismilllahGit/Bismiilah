import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureProjectActive } from "@/lib/project-utils";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, itemId } = await params;
    await ensureProjectActive(projectId);

    const existing = await prisma.projectInventory.findUnique({
      where: { projectId_itemId: { projectId, itemId } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Inventory record not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction([
      prisma.inventoryTransaction.deleteMany({ where: { projectId, itemId } }),
      prisma.projectInventory.delete({ where: { id: existing.id } }),
    ]);

    return NextResponse.json({ id: itemId });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("CLOSED")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to remove item from inventory" },
      { status: 500 },
    );
  }
}
