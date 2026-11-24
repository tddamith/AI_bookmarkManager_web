import "server-only";
import { NextResponse } from "next/server";
import { authApiUrl } from "@/lib/auth";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ResetResult = { res: Response; data: Record<string, unknown> } | { error: NextResponse };

/** POSTs JSON to the auth backend. Password reset needs email delivery, so it requires AUTH_API_URL. */
export async function callBackend(path: string, body: unknown): Promise<ResetResult> {
  const base = authApiUrl();
  if (!base) return { error: NextResponse.json({ message: "Password reset isn't available yet. Contact support." }, { status: 503 }) };
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { res, data };
  } catch {
    return { error: NextResponse.json({ message: "We couldn't reach the server. Please try again." }, { status: 502 }) };
  }
}

/** Maps backend code errors to the same shape the verify form uses. */
export function codeError(res: Response, data: Record<string, unknown>) {
  const err = String(data.error ?? "");
  const triesLeft = typeof data.triesLeft === "number" ? data.triesLeft : null;
  if (err === "wrong_code") {
    return NextResponse.json({ code: "wrong_code", triesLeft, message: triesLeft === null ? "That code doesn’t match." : triesLeft === 0 ? "Too many wrong tries. Send a new code." : `That code doesn’t match. ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left.` }, { status: 400 });
  }
  if (/expired/.test(err)) return NextResponse.json({ code: "expired", message: "That code has expired. Send a new one." }, { status: 400 });
  if (res.status === 429 || /locked|too_many|rate/.test(err)) return NextResponse.json({ code: "locked", triesLeft: 0, message: "Too many wrong tries. Send a new code." }, { status: 429 });
  return NextResponse.json({ message: "We couldn't check that code. Please try again." }, { status: 502 });
}
