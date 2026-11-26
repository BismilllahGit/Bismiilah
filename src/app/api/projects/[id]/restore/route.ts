import { NextResponse } from "next/server";
import { requireSession } from "@/app/api/_lib/auth-guard";
import { withApiHandler } from "@/app/api/_lib/handler";
import { restoreProject } from "@/lib/services/projects";

export const POST = withApiHandler<{ params: Promise<{ id: string }> }>(
  "Failed to restore project",
  async (_request, { params }) => {
    await requireSession();
    const { id } = await params;
    await restoreProject(id);
    return new NextResponse(null, { status: 204 });
  },
);
