import { NextResponse } from "next/server";
import { authApiUrl, validateReset } from "@/lib/auth";
import { backendFetch, jsonError, readJson, setSessionCookie, unreachable } from "@/lib/backend";

/**
 * POST /api/auth/password/reset { email, code, password } — sets a new password and signs the user in.
 * The backend signs out every other session (a stolen token dies with the old password).
 * Backend: POST /auth/password/reset → 200 { token, user } | 400 wrong_code {triesLeft} | expired | 429 too_many_attempts
 */
export async function POST(request: Request) {
  const body = await readJson<{ email: unknown; code: unknown; password: unknown }>(request);
  if (!body) return jsonError("Invalid request.", 400);
  const invalid = validateReset({ email: body.email, code: body.code, password: body.password });
  if (invalid) return NextResponse.json(invalid, { status: 422 });
  if (!authApiUrl()) return jsonError("Password reset isn't available on this server.", 503);

  let upstream;
  try {
    upstream = await backendFetch<{ token?: string; triesLeft?: number | null }>("/auth/password/reset", {
      request,
      body: { email: String(body.email).trim(), code: String(body.code).trim(), password: body.password },
    });
  } catch {
    return unreachable();
  }

  if (upstream.ok && upstream.data.token) {
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, request, upstream.data.token, true);
    return res;
  }
  const { error, triesLeft } = upstream.data;
  if (error === "wrong_code") {
    const left = typeof triesLeft === "number" ? triesLeft : null;
    return jsonError(left === null ? "That code doesn’t match." : `That code doesn’t match. ${left} ${left === 1 ? "try" : "tries"} left.`, 400, {
      code: "wrong_code",
      field: "code",
      triesLeft: left,
    });
  }
  if (error === "expired") return jsonError("That code has expired or was already used. Send a new one.", 400, { code: "expired", field: "code" });
  if (error === "too_many_attempts") return jsonError("Too many wrong tries. Send a new code.", 429, { code: "locked", field: "code" });
  if (error === "bad_password") return jsonError("Use 8–200 characters.", 422, { field: "password" });
  if (upstream.status === 429) return jsonError("Too many attempts. Wait a few minutes and try again.", 429);
  return jsonError("Something went wrong on our side. Please try again.", 502);
}
