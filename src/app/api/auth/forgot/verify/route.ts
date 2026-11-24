import { NextResponse } from "next/server";
import { callBackend, codeError, EMAIL_RE } from "@/lib/reset-proxy";

/**
 * POST /api/auth/forgot/verify { email, code } — checks the reset code without consuming it.
 * Backend: POST {AUTH_API_URL}/auth/forgot/verify { email, code } → 200 | 400 { error: "wrong_code", triesLeft } | 400 { error: "expired" } | 429
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; code?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!EMAIL_RE.test(email)) return NextResponse.json({ message: "Enter a valid email address." }, { status: 422 });
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ message: "Enter the 6-digit code from your email." }, { status: 422 });

  const r = await callBackend("/auth/forgot/verify", { email, code });
  if ("error" in r) return r.error;
  return r.res.ok ? NextResponse.json({ ok: true }) : codeError(r.res, r.data);
}
