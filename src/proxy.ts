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

  // getToken()'s own auto-detection of the `__Secure-` cookie prefix falls
  // back to reading `NEXTAUTH_URL` — which is "http://localhost:3000" in
  // this project's env even in production. That makes it look for the
  // unprefixed cookie name while NextAuth's core (used by getServerSession
  // in the root layout) derives secure-vs-not from the actual incoming
  // request and correctly uses the `__Secure-` prefix on HTTPS. The two
  // disagreeing meant an authenticated production user was treated as
  // logged out here while the root layout still saw them as logged in —
  // sidebar and login form rendering at once. Derive it from the request
  // instead, so both checks agree.
  const secureCookie =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie,
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
