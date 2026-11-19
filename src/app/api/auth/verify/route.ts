import { NextResponse } from "next/server";
import { authApiUrl } from "@/lib/auth";
import { getSession } from "@/lib/session";

/**
 * POST /api/auth/verify { code } — checks the 6-digit email code.
 * Backend: POST {AUTH_API_URL}/auth/verify { code } → 200 | 400 { error: "wrong_code", triesLeft }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ message: "Enter the 6-digit code from your email." }, { status: 422 });

  const base = authApiUrl();
  if (!base) return NextResponse.json({ ok: true });

  try {
    const res = await fetch(`${base}/auth/verify`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ code }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return NextResponse.json({ ok: true });
    const data = (await res.json().catch(() => ({}))) as { error?: string; triesLeft?: number | null };
    const triesLeft = typeof data.triesLeft === "number" ? data.triesLeft : null;
    if (data.error === "wrong_code") {
      return NextResponse.json({ code: "wrong_code", triesLeft, message: triesLeft === null ? "That code doesn’t match." : triesLeft === 0 ? "Too many wrong tries. Send a new code." : `That code doesn’t match. ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left.` }, { status: 400 });
    }
    if (/expired/.test(data.error ?? "")) return NextResponse.json({ code: "expired", message: "That code has expired. Send a new one." }, { status: 400 });
    if (res.status === 429 || /locked|too_many|rate/.test(data.error ?? "")) return NextResponse.json({ code: "locked", triesLeft: 0, message: "Too many wrong tries. Send a new code." }, { status: 429 });
    return NextResponse.json({ message: "We couldn't verify that code. Please try again." }, { status: 502 });
  } catch {
    return NextResponse.json({ message: "We couldn't reach the server. Please try again." }, { status: 502 });
  }
}
