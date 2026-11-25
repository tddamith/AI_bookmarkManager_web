import "server-only";
import { NextResponse } from "next/server";
import { authApiUrl, isSecureRequest, SESSION_COOKIE, THIRTY_DAYS } from "@/lib/auth";

/**
 * Server-side client for the FastAPI backend (AUTH_API_URL).
 * Every call forwards the visitor's IP with the shared INTERNAL_API_KEY, so the backend's per-IP rate limits apply to the
 * visitor and not to this web server (without it, one abuser could rate-limit every visitor at once).
 */

export type BackendResult<T = Record<string, unknown>> = { status: number; ok: boolean; data: T & { error?: string } };

/** The visitor's IP as reported by the hosting proxy (Vercel / nginx overwrite these headers). */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim();
  return ip && ip.length <= 64 ? ip : null;
}

/** Throws only when the backend can't be reached (network error / timeout). */
export async function backendFetch<T = Record<string, unknown>>(
  path: string,
  opts: { request?: Request; token?: string; body?: unknown; method?: "GET" | "POST" | "DELETE"; timeoutMs?: number } = {},
): Promise<BackendResult<T>> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  const key = process.env.INTERNAL_API_KEY;
  const ip = opts.request ? clientIp(opts.request) : null;
  if (key && ip) {
    headers["x-internal-key"] = key;
    headers["x-client-ip"] = ip;
  }
  const res = await fetch(`${authApiUrl()}${path}`, {
    method: opts.method ?? "POST",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { status: res.status, ok: res.ok, data: data && typeof data === "object" ? data : ({} as T & { error?: string }) };
}

/** Stores the backend session token in an httpOnly cookie (browser JavaScript never sees it). */
export function setSessionCookie(res: NextResponse, request: Request, token: string, persistent = true) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    path: "/",
    priority: "high",
    // "Keep me signed in" → persistent cookie; otherwise it ends with the browser session
    ...(persistent ? { maxAge: THIRTY_DAYS } : {}),
  });
}

export function clearSessionCookie(res: NextResponse, request: Request) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: isSecureRequest(request), sameSite: "lax", path: "/", maxAge: 0 });
}

export const jsonError = (message: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ message, ...extra }, { status, headers: { "cache-control": "no-store" } });

export const unreachable = () => jsonError("We couldn't reach the server. Check your connection and try again.", 502);

/** Parses a JSON object body; null for wrong content type or malformed JSON. */
export async function readJson<T extends Record<string, unknown>>(request: Request): Promise<Partial<T> | null> {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  const body = (await request.json().catch(() => null)) as unknown;
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Partial<T>) : null;
}
