import { NextResponse } from "next/server";
import { issueToken, registerUser } from "@/lib/auth-store";
import { authApiUrl, isSecureRequest, SESSION_COOKIE, THIRTY_DAYS, validateSignUp } from "@/lib/auth";

/**
 * POST /api/auth/signup  { name, email, password, terms }
 * Proxies to `${AUTH_API_URL}/auth/signup` and signs the new user in with an httpOnly cookie.
 *
 * Expected backend contract (adjust below if yours differs):
 *   POST /auth/signup  { name, email, password }  →  200 { token, user: {id,name,email,verified}, pro, ... }
 *                                                |  409 { error: "exists" } | 400 { error: "bad_email" | "bad_password" }
 */
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ message: "Unsupported request." }, { status: 415 });
  }

  let body: { name?: unknown; email?: unknown; password?: unknown; terms?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const invalid = validateSignUp(body);
  if (invalid) return NextResponse.json(invalid, { status: 422 });

  const base = authApiUrl();
  if (!base) {
    // Built-in backend (no AUTH_API_URL configured)
    const result = await registerUser({ name: String(body.name), email: String(body.email), password: String(body.password) });
    if (!result.ok) {
      return NextResponse.json({ field: "email", message: "An account with this email already exists. Try signing in." }, { status: 409 });
    }
    const res = NextResponse.json({ ok: true, signedIn: true });
    res.cookies.set(SESSION_COOKIE, issueToken(result.id, THIRTY_DAYS), {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      maxAge: THIRTY_DAYS,
    });
    return res;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/auth/signup`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ name: String(body.name).trim(), email: String(body.email).trim(), password: body.password }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({ message: "We couldn't reach the server. Check your connection and try again." }, { status: 502 });
  }

  const err = upstream.ok ? null : ((await upstream.clone().json().catch(() => null)) as { error?: string } | null)?.error;
  if (err === "bad_email") return NextResponse.json({ field: "email", message: "Enter a valid email address." }, { status: 422 });
  if (err === "bad_password") return NextResponse.json({ field: "password", message: "Choose a stronger password (at least 8 characters)." }, { status: 422 });
  if (upstream.status === 409) {
    return NextResponse.json({ field: "email", message: "An account with this email already exists. Try signing in." }, { status: 409 });
  }
  if (upstream.status === 400 || upstream.status === 422) {
    return NextResponse.json({ message: "We couldn't create your account with those details. Check them and try again." }, { status: 422 });
  }
  if (upstream.status === 429) {
    return NextResponse.json({ message: "Too many attempts. Wait a minute and try again." }, { status: 429 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ message: "Something went wrong on our side. Please try again." }, { status: 502 });
  }

  const data = (await upstream.json().catch(() => null)) as { token?: string; expiresIn?: number } | null;
  if (!data?.token) {
    // Account created but no session returned: send them to sign in.
    return NextResponse.json({ ok: true, signedIn: false });
  }

  const res = NextResponse.json({ ok: true, signedIn: true });
  res.cookies.set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    path: "/",
    maxAge: Math.min(data.expiresIn ?? THIRTY_DAYS, THIRTY_DAYS),
  });
  return res;
}
