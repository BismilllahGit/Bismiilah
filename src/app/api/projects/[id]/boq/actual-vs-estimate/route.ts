import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProjectBOQActuals } from "@/lib/queries/boq-queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const versionParam = searchParams.get("version");

    const targetVersion = versionParam ? parseInt(versionParam, 10) : undefined;
    const actualsData = await getProjectBOQActuals(projectId, targetVersion);

    return NextResponse.json(actualsData);
  } catch (error) {
    console.error("Error computing BOQ actual-vs-estimate:", error);
    return NextResponse.json(
      { error: "Failed to fetch actual vs estimate comparison" },
      { status: 500 }
    );
  }
}
