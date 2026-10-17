import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPurchasesReportData } from "@/lib/queries/report-queries";

export async function GET(request: Request) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);

    const data = await getPurchasesReportData({
      projectId,
      startDate,
      endDate,
      search,
      page,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch material purchases report:", error);
    return NextResponse.json(
      { error: "Failed to fetch material purchases report" },
      { status: 500 },
    );
  }
}
