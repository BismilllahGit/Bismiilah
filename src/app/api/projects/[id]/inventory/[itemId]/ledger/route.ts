import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInventoryLedgerData } from "@/lib/queries/ledger-queries";

export async function GET(request: Request, { params }: { params: Promise<{ id: string, itemId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const projectId = (await params).id;
    const itemId = (await params).itemId;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "50", 10));

    const data = await getInventoryLedgerData(projectId, itemId, { startDate, endDate, search, page, limit });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { rawOpeningQtyBalance, ...responsePayload } = data;
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Inventory ledger error:", error);
    if (error instanceof Error && error.message === "Project or Item not found") {
      return NextResponse.json({ error: "Project or Item not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to fetch inventory ledger" }, { status: 500 });
  }
}
