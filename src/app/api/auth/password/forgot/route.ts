import { NextResponse } from "next/server";
import { authApiUrl, validateForgot } from "@/lib/auth";
import { backendFetch, jsonError, readJson, unreachable } from "@/lib/backend";

/**
 * POST /api/auth/password/forgot { email } — emails a 6-digit reset code if the account exists.
 * The answer is identical either way, so nobody can use this form to find out who has an account.
 * Backend: POST /auth/password/forgot { email } → 200 { sent, resendIn } | 429 { error: "rate_limited", retryIn }
 */
export async function POST(request: Request) {
  const body = await readJson<{ email: unknown }>(request);
  if (!body) return jsonError("Invalid request.", 400);
  const invalid = validateForgot(body);
  if (invalid) return NextResponse.json(invalid, { status: 422 });
  if (!authApiUrl()) return jsonError("Password reset isn't available on this server.", 503);

  try {
    const res = await backendFetch<{ resendIn?: number; retryIn?: number }>("/auth/password/forgot", {
      request,
      body: { email: String(body.email).trim() },
    });
    if (res.ok) return NextResponse.json({ ok: true, retryIn: res.data.resendIn ?? 45 });
    if (res.status === 429) return jsonError("Too many requests. Wait a few minutes and try again.", 429, { retryIn: res.data.retryIn ?? 60 });
    if (res.data.error === "bad_email") return jsonError("Enter a valid email address.", 422, { field: "email" });
    return jsonError("Something went wrong on our side. Please try again.", 502);
  } catch {
    return unreachable();
  }
}
