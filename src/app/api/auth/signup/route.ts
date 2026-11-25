import { NextResponse } from "next/server";
import { issueToken, registerUser } from "@/lib/auth-store";
import {
  authApiUrl,
  isSecureRequest,
  SESSION_COOKIE,
  THIRTY_DAYS,
  validateSignUp,
} from "@/lib/auth";
import {
  backendFetch,
  jsonError,
  readJson,
  setSessionCookie,
  unreachable,
} from "@/lib/backend";

/**
 * POST /api/auth/signup  { name, email, password, terms }
 * Proxies to `${AUTH_API_URL}/auth/signup` and signs the new user in with an httpOnly cookie.
 *
 * Backend: POST /auth/signup { name, email, password } → 200 { token, user: {id,name,email,verified}, pro, ... }
 *                                                      | 409 { error: "exists" } | 400 { error: "bad_email" | "bad_password" }
 */
export async function POST(request: Request) {
  const body = await readJson<{
    name: unknown;
    email: unknown;
    password: unknown;
    terms: unknown;
  }>(request);
  if (!body) return jsonError("Invalid request.", 400);

  const invalid = validateSignUp(body);
  if (invalid) return NextResponse.json(invalid, { status: 422 });

  if (!authApiUrl()) {
    // Built-in backend (no AUTH_API_URL configured — development only)
    const result = await registerUser({
      name: String(body.name),
      email: String(body.email),
      password: String(body.password),
    });
    if (!result.ok) {
      return jsonError(
        "An account with this email already exists. Try signing in.",
        409,
        { field: "email" },
      );
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

  let upstream;
  try {
    upstream = await backendFetch<{ token?: string }>("/auth/signup", {
      request,
      body: {
        name: String(body.name).trim(),
        email: String(body.email).trim(),
        password: body.password,
      },
    });
  } catch {
    return unreachable();
  }

  const err = upstream.ok ? null : upstream.data.error;
  if (err === "bad_email")
    return jsonError("Enter a valid email address.", 422, { field: "email" });
  if (err === "bad_password")
    return jsonError("Choose a stronger password (8–200 characters).", 422, {
      field: "password",
    });
  if (err === "bad_name")
    return jsonError("Enter your name.", 422, { field: "name" });
  if (upstream.status === 409) {
    return NextResponse.json(
      {
        field: "email",
        message: "An account with this email already exists. Try signing in.",
      },
      { status: 409 },
    );
  }
  if (upstream.status === 400 || upstream.status === 422) {
    return NextResponse.json(
      {
        message:
          "We couldn't create your account with those details. Check them and try again.",
      },
      { status: 422 },
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

  // Account created but no session returned: send them to sign in.
  if (!upstream.data.token)
    return NextResponse.json({ ok: true, signedIn: false });

  const res = NextResponse.json({ ok: true, signedIn: true });
  setSessionCookie(res, request, upstream.data.token, true);
  return res;
}
