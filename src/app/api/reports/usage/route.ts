import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTopUsageReportData } from "@/lib/queries/report-queries";

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
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "200"));

    const data = await getTopUsageReportData({
      projectId,
      startDate,
      endDate,
      search,
      limit,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch material usage report:", error);
    return NextResponse.json(
      { error: "Failed to fetch material usage report" },
      { status: 500 },
    );
  }
}
