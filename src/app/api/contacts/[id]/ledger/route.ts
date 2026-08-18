import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorLedgerData } from "@/lib/queries/ledger-queries";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contactId = (await params).id;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "50", 10));

    const data = await getVendorLedgerData(contactId, { startDate, endDate, search, page, limit });

    // Retain contact object at top-level of response to eliminate duplicate API requests in frontend
    const { rawOpeningBalance, ...responsePayload } = data;
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("Ledger error:", error);
    if (error.message === "Contact not found") {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to fetch ledger" }, { status: 500 });
  }
}
