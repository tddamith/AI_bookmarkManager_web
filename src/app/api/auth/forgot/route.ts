import { NextResponse } from "next/server";
import { callBackend, EMAIL_RE } from "@/lib/reset-proxy";

/**
 * POST /api/auth/forgot { email } — emails a 6-digit reset code.
 * Always answers ok for a well-formed email so the form can't be used to find out who has an account.
 * Backend: POST {AUTH_API_URL}/auth/forgot { email } → 200 | 429 { error: "rate_limited", retryIn: seconds }
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email) return NextResponse.json({ message: "Enter your email." }, { status: 422 });
  if (!EMAIL_RE.test(email) || email.length > 254) return NextResponse.json({ message: "Enter a valid email address." }, { status: 422 });

  const r = await callBackend("/auth/forgot", { email });
  if ("error" in r) return r.error;
  if (r.res.status === 429 || r.data.error === "rate_limited") {
    return NextResponse.json({ ok: true, retryIn: Math.max(1, Math.ceil(Number(r.data.retryIn) || 45)) });
  }
  if (r.res.status >= 500) return NextResponse.json({ message: "We couldn't send the email. Please try again in a moment." }, { status: 502 });
  return NextResponse.json({ ok: true, retryIn: 45 });
}
