import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authApiUrl, authErrorMessage, GSI_NONCE_COOKIE, isSecureRequest, safeNext } from "@/lib/auth";
import { backendFetch, jsonError, readJson, setSessionCookie } from "@/lib/backend";
import { links } from "@/lib/site";

/**
 * POST /api/auth/google/token { credential, next } — the ID token from Google's "Sign in with Google" popup / One Tap.
 * The backend verifies Google's signature, the audience and our nonce, then finds or creates the user in MongoDB.
 * The session token goes into the httpOnly cookie; the browser only learns where to go next.
 */
export async function POST(request: Request) {
  const body = await readJson<{ credential: unknown; next: unknown }>(request);
  const nonce = (await cookies()).get(GSI_NONCE_COOKIE)?.value;

  const reply = (res: NextResponse) => {
    // One-shot nonce: each attempt needs a fresh one.
    res.cookies.set(GSI_NONCE_COOKIE, "", { httpOnly: true, secure: isSecureRequest(request), sameSite: "strict", path: "/api/auth/google", maxAge: 0 });
    return res;
  };
  const fail = (code: string, status: number) => reply(jsonError(authErrorMessage(code) ?? "We couldn't sign you in with Google.", status, { code }));

  if (!body || typeof body.credential !== "string" || body.credential.length > 8192) return fail("google_failed", 400);
  if (!nonce) return fail("google_expired", 400);
  if (!authApiUrl()) return fail("google_unavailable", 503);

  let upstream;
  try {
    upstream = await backendFetch<{ token?: string; created?: boolean }>("/auth/google", {
      request,
      body: { credential: body.credential, nonce, remember: true },
    });
  } catch {
    return reply(jsonError("We couldn't reach the server. Check your connection and try again.", 502));
  }

  if (!upstream.ok || !upstream.data.token) {
    const err = upstream.data.error;
    if (err === "account_conflict") return fail("google_conflict", 409);
    if (err === "email_unverified") return fail("google_unverified", 403);
    if (err === "rate_limited") return fail("rate_limited", 429);
    if (err === "google_not_configured") return fail("google_unavailable", 503);
    return fail("google_failed", 401);
  }

  // New account → choose a plan (Google already verified the email). Returning user → where they were headed.
  const redirect = upstream.data.created ? links.plans : safeNext(typeof body.next === "string" ? body.next : null, links.app);
  const res = reply(NextResponse.json({ ok: true, redirect }, { headers: { "cache-control": "no-store" } }));
  setSessionCookie(res, request, upstream.data.token, true);
  return res;
}
