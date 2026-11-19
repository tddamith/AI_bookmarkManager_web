import { NextResponse } from "next/server";
import { issueToken, verifyLogin } from "@/lib/auth-store";
import { authApiUrl, isSecureRequest, SESSION_COOKIE, THIRTY_DAYS, validateSignIn } from "@/lib/auth";

/**
 * POST /api/auth/signin  { email, password, remember }
 * Proxies to `${AUTH_API_URL}/auth/login` and stores the returned token in an httpOnly cookie,
 * so the browser JavaScript never sees the token.
 *
 * Expected backend contract (adjust below if yours differs):
 *   POST /auth/login  { email, password }  →  200 { token: string, expiresIn?: seconds }  |  401 | 429
 */
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ message: "Unsupported request." }, { status: 415 });
  }

  let body: { email?: unknown; password?: unknown; remember?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const invalid = validateSignIn(body);
  if (invalid) return NextResponse.json(invalid, { status: 422 });

  const base = authApiUrl();
  if (!base) {
    // Built-in backend (no AUTH_API_URL configured)
    const userId = await verifyLogin(String(body.email), String(body.password));
    if (!userId) return NextResponse.json({ message: "Incorrect email or password." }, { status: 401 });
    const ttl = body.remember ? THIRTY_DAYS : 60 * 60 * 12;
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, issueToken(userId, ttl), {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      ...(body.remember ? { maxAge: ttl } : {}),
    });
    return res;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email: String(body.email).trim(), password: body.password }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({ message: "We couldn't reach the server. Check your connection and try again." }, { status: 502 });
  }

  if (upstream.status === 401 || upstream.status === 400 || upstream.status === 403) {
    return NextResponse.json({ message: "Incorrect email or password." }, { status: 401 });
  }
  if (upstream.status === 429) {
    return NextResponse.json({ message: "Too many attempts. Wait a minute and try again." }, { status: 429 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ message: "Something went wrong on our side. Please try again." }, { status: 502 });
  }

  const data = (await upstream.json().catch(() => null)) as { token?: string; expiresIn?: number } | null;
  if (!data?.token) {
    return NextResponse.json({ message: "Something went wrong on our side. Please try again." }, { status: 502 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    path: "/",
    // "Keep me signed in" → persistent cookie; otherwise a session cookie
    ...(body.remember ? { maxAge: Math.min(data.expiresIn ?? THIRTY_DAYS, THIRTY_DAYS) } : {}),
  });
  return res;
}
