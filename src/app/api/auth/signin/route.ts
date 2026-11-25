import { NextResponse } from "next/server";
import { issueToken, verifyLogin } from "@/lib/auth-store";
import {
  authApiUrl,
  isSecureRequest,
  SESSION_COOKIE,
  THIRTY_DAYS,
  validateSignIn,
} from "@/lib/auth";
import {
  backendFetch,
  jsonError,
  readJson,
  setSessionCookie,
  unreachable,
} from "@/lib/backend";

/**
 * POST /api/auth/signin  { email, password, remember }
 * Proxies to `${AUTH_API_URL}/auth/login` and stores the returned token in an httpOnly cookie,
 * so the browser JavaScript never sees the token.
 *
 * Backend: POST /auth/login { email, password, remember } → 200 { token, user, pro } | 401 invalid | 429 rate_limited
 */
export async function POST(request: Request) {
  const body = await readJson<{
    email: unknown;
    password: unknown;
    remember: unknown;
  }>(request);
  if (!body) return jsonError("Invalid request.", 400);

  const invalid = validateSignIn(body);
  if (invalid) return NextResponse.json(invalid, { status: 422 });
  const remember = body.remember === true;

  if (!authApiUrl()) {
    // Built-in backend (no AUTH_API_URL configured — development only)
    const userId = await verifyLogin(String(body.email), String(body.password));
    if (!userId) return jsonError("Incorrect email or password.", 401);
    const ttl = remember ? THIRTY_DAYS : 60 * 60 * 12;
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, issueToken(userId, ttl), {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      ...(remember ? { maxAge: ttl } : {}),
    });
    return res;
  }

  let upstream;
  try {
    upstream = await backendFetch<{
      token?: string;
      user?: { verified?: boolean };
    }>("/auth/login", {
      request,
      body: {
        email: String(body.email).trim(),
        password: body.password,
        remember,
      },
    });
  } catch {
    return unreachable();
  }

  if (
    upstream.status === 401 ||
    upstream.status === 400 ||
    upstream.status === 403
  ) {
    return NextResponse.json(
      { message: "Incorrect email or password." },
      { status: 401 },
    );
  }
  if (upstream.status === 429) {
    // The API says how long the lock lasts (login: up to 15 min, signup: up to an hour), so the form can count it down.
    const d = upstream.data as { retryIn?: number };
    const retryIn = Math.min(
      Math.max(Math.ceil(Number(d?.retryIn)) || 60, 1),
      86_400,
    );
    return NextResponse.json(
      { code: "rate_limited", retryIn, message: "Too many attempts." },
      { status: 429, headers: { "Retry-After": String(retryIn) } },
    );
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { message: "Something went wrong on our side. Please try again." },
      { status: 502 },
    );
  }
  if (!upstream.ok || !upstream.data.token)
    return jsonError(
      "Something went wrong on our side. Please try again.",
      502,
    );

  const res = NextResponse.json({
    ok: true,
    verified: upstream.data.user?.verified !== false,
  });
  setSessionCookie(res, request, upstream.data.token, remember);
  return res;
}
