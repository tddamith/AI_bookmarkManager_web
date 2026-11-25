import { NextResponse, type NextRequest } from "next/server";

/**
 * CSRF guard for the API routes.
 *
 * The session lives in a cookie, so a state-changing request (POST/PUT/PATCH/DELETE) must come from this site's own
 * pages. Browsers attach Origin (and Sec-Fetch-Site) to such requests and pages can't forge them, so a cross-site form
 * or fetch is rejected here. SameSite=Lax on the cookie is the first line of defence; this is the second (it also covers
 * sibling subdomains, which SameSite treats as "same site", and login-CSRF on the sign-in routes).
 *
 * Requests carrying an Authorization header (the browser extension's Bearer token) are allowed: a cross-site page can only
 * send that header after a CORS preflight, which never permits credentials, so it can't ride the user's cookie.
 */
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export function proxy(request: NextRequest) {
  if (SAFE.has(request.method) || request.headers.has("authorization")) return NextResponse.next();

  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (originHost && originHost === host) return NextResponse.next();
    return forbidden();
  }
  // No Origin header (old browsers, server-to-server): fall back to Fetch Metadata when present.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return forbidden();
  return NextResponse.next();
}

const forbidden = () =>
  NextResponse.json({ message: "This request was blocked for your security. Reload the page and try again." }, { status: 403 });

export const config = { matcher: "/api/:path*" };
