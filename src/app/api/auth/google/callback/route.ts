import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSecureRequest, OAUTH_COOKIE, safeNext } from "@/lib/auth";
import { backendFetch, setSessionCookie } from "@/lib/backend";
import { googleRedirectUri } from "@/lib/google";
import { links } from "@/lib/site";

type Pending = { state: string; verifier: string; nonce: string; next: string; from: "signin" | "signup" };

function readPending(raw: string | undefined): Pending | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(Buffer.from(raw, "base64url").toString()) as Partial<Pending>;
    if (typeof p.state !== "string" || typeof p.verifier !== "string" || typeof p.nonce !== "string") return null;
    return { state: p.state, verifier: p.verifier, nonce: p.nonce, next: safeNext(p.next, ""), from: p.from === "signup" ? "signup" : "signin" };
  } catch {
    return null;
  }
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * GET /api/auth/google/callback?code=…&state=… — Google sends the browser back here.
 * Checks `state` against the cookie set by /api/auth/google, then the backend redeems the code (with the PKCE verifier and
 * nonce), finds or creates the user in MongoDB and returns a session token, which we keep in the httpOnly session cookie.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const pending = readPending((await cookies()).get(OAUTH_COOKIE)?.value);

  const finish = (path: string, token?: string) => {
    const res = NextResponse.redirect(new URL(path, url));
    res.headers.set("cache-control", "no-store");
    // One-shot: the state/verifier can never be replayed.
    res.cookies.set(OAUTH_COOKIE, "", { httpOnly: true, secure: isSecureRequest(request), sameSite: "lax", path: "/api/auth/google", maxAge: 0 });
    if (token) setSessionCookie(res, request, token, true);
    return res;
  };
  const fail = (code: string) => finish(`/${pending?.from ?? "signin"}?error=${code}`);

  const state = url.searchParams.get("state") ?? "";
  if (!pending || !state || !same(state, pending.state)) return fail("google_expired");
  if (url.searchParams.get("error")) return fail(url.searchParams.get("error") === "access_denied" ? "google_cancelled" : "google_failed");
  const code = url.searchParams.get("code");
  if (!code) return fail("google_failed");

  let upstream;
  try {
    upstream = await backendFetch<{ token?: string; created?: boolean }>("/auth/google", {
      request,
      body: { code, code_verifier: pending.verifier, redirect_uri: googleRedirectUri(request), nonce: pending.nonce, remember: true },
    });
  } catch {
    return fail("google_failed");
  }

  const err = upstream.data.error;
  if (!upstream.ok || !upstream.data.token) {
    if (err === "account_conflict") return fail("google_conflict");
    if (err === "email_unverified") return fail("google_unverified");
    if (err === "rate_limited") return fail("rate_limited");
    if (err === "google_not_configured") return fail("google_unavailable");
    return fail("google_failed");
  }

  // New account → choose a plan (Google already verified the email). Returning user → where they were headed.
  return finish(upstream.data.created ? links.plans : pending.next || links.app, upstream.data.token);
}
