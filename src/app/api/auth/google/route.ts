import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authApiUrl, isSecureRequest, OAUTH_COOKIE, safeNext } from "@/lib/auth";
import { googleRedirectUri } from "@/lib/google";

/**
 * GET /api/auth/google?next=/dashboard&from=signin|signup — starts "Continue with Google".
 *
 * Authorization-code flow with PKCE (RFC 7636), `state` (CSRF) and `nonce` (ID-token replay). Those three secrets go into
 * a short-lived httpOnly cookie scoped to the callback path; Google only ever sees the state, the nonce and the
 * SHA-256 challenge. The client secret never touches this app — the backend redeems the code.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") === "signup" ? "signup" : "signin";
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!authApiUrl() || !clientId) return NextResponse.redirect(new URL(`/${from}?error=google_unavailable`, url));

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url"); // 64 chars, within PKCE's 43–128
  const nonce = randomBytes(24).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const next = safeNext(url.searchParams.get("next"), "");

  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
    access_type: "online",
    include_granted_scopes: "true",
  }).toString();

  const res = NextResponse.redirect(google);
  res.headers.set("cache-control", "no-store");
  res.cookies.set(OAUTH_COOKIE, Buffer.from(JSON.stringify({ state, verifier, nonce, next, from })).toString("base64url"), {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax", // must survive the top-level redirect back from accounts.google.com
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
