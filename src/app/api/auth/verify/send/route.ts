import { NextResponse } from "next/server";
import { authApiUrl } from "@/lib/auth";
import { getSession } from "@/lib/session";

/**
 * POST /api/auth/verify/send — emails a fresh 6-digit code (also used by "Resend code").
 * Backend: POST {AUTH_API_URL}/auth/verify/send → 200 | 429 { error: "rate_limited", retryIn: seconds } | 502 { error: "send_failed" }
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  const base = authApiUrl();
  if (!base) return NextResponse.json({ ok: true, verified: true });

  try {
    const res = await fetch(`${base}/auth/verify/send`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session.token}` },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; retryIn?: number };
    if (res.ok) return NextResponse.json({ ok: true, retryIn: 45 });
    if (data.error === "rate_limited") return NextResponse.json({ ok: false, rateLimited: true, retryIn: Math.max(1, Math.ceil(data.retryIn ?? 45)) }, { status: 429 });
    if (data.error === "already_verified") return NextResponse.json({ ok: true, verified: true });
    return NextResponse.json({ message: "We couldn't send the email. Please try again in a moment." }, { status: 502 });
  } catch {
    return NextResponse.json({ message: "We couldn't reach the server. Please try again." }, { status: 502 });
  }
}
