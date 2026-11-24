import { NextResponse } from "next/server";
import { authApiUrl, isSecureRequest, SESSION_COOKIE, THIRTY_DAYS } from "@/lib/auth";
import { callBackend, codeError, EMAIL_RE } from "@/lib/reset-proxy";

/**
 * POST /api/auth/reset { email, code, password, signOutOthers } — sets the new password and signs the user in.
 * Backend: POST {AUTH_API_URL}/auth/reset { email, code, password, signOutOthers } → 200 { token, expiresIn? } | 400 { error: "wrong_code" | "expired" }
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; code?: unknown; password?: unknown; signOutOthers?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) return NextResponse.json({ message: "Start again to get a new code." }, { status: 422 });
  if (password.length < 8 || !/\d/.test(password)) return NextResponse.json({ message: "Use at least 8 characters and one number." }, { status: 422 });
  if (password.length > 256) return NextResponse.json({ message: "Password is too long." }, { status: 422 });

  const r = await callBackend("/auth/reset", { email, code, password, signOutOthers: body?.signOutOthers !== false });
  if ("error" in r) return r.error;
  if (!r.res.ok) return codeError(r.res, r.data);

  const token = typeof r.data.token === "string" ? r.data.token : null;
  const out = NextResponse.json({ ok: true, signedIn: Boolean(token) });
  if (token && authApiUrl()) {
    out.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      path: "/",
      maxAge: Math.min(typeof r.data.expiresIn === "number" ? r.data.expiresIn : THIRTY_DAYS, THIRTY_DAYS),
    });
  }
  return out;
}
