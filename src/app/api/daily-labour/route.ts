import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDailyLabourReportData } from "@/lib/queries/report-queries";

export async function GET(request: Request) {
  try {
    if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const workerType = searchParams.get("workerType");
    const groupBy = searchParams.get("groupBy")?.toLowerCase();

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "50"));
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const result = await getDailyLabourReportData({
      projectId,
      startDate,
      endDate,
      workerType,
      groupBy,
      sortBy,
      sortOrder,
      page,
      limit
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch daily labour entries:", error);
    return NextResponse.json({ error: "Failed to fetch daily labour" }, { status: 500 });
  }
}
