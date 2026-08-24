import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ApiError } from "./errors";

/**
 * Replaces the repeated:
 *   const session = await getServerSession(authOptions);
 *   if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 * (optionally guarded by `if (process.env.SKIP_AUTH_FOR_TESTS !== "true")`).
 *
 * `allowTestBypass` must be passed explicitly per call site to match that
 * route's PRE-REFACTOR behavior exactly — some routes had the bypass, some
 * didn't; this is not the place to silently standardize that.
 */
export async function requireSession(options: { allowTestBypass?: boolean } = {}) {
  const { allowTestBypass = false } = options;
  if (allowTestBypass && process.env.SKIP_AUTH_FOR_TESTS === "true") {
    return null;
  }
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new ApiError("Unauthorized", 401);
  }
  return session;
}
