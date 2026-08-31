import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Paths that must stay reachable without a session (the login page itself).
const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

// Runs on every page navigation (including client-side ones, since those
// still hit the server for the RSC payload) — this is what actually enforces
// auth on route changes. The root layout's session check alone is not
// enough: layouts don't re-render on client-side navigation, so a session
// that was valid when the layout last rendered stays reflected in the UI
// (sidebar included) until a full reload, even after logging out elsewhere.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on every page route except:
     * - /api/*        (routes guard themselves via requireSession/getServerSession)
     * - /share/*       (intentionally public, unauthenticated link-sharing — see its own route comment)
     * - /_next/static, /_next/image (Next.js internals)
     * - any request for a file with an extension (favicon.ico, logo.png, /uploads/*.pdf, etc.)
     */
    "/((?!api|share|_next/static|_next/image|.*\\..*).*)",
  ],
};
