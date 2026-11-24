import "server-only";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { SESSION_COOKIE, ONBOARDED_COOKIE, PLAN_COOKIE, authApiUrl } from "@/lib/auth";
import { getUser, verifyToken } from "@/lib/auth-store";

export type Session = { userId: string; token: string; name: string | null; email: string | null; verified: boolean; pro: boolean; planChosen: boolean; onboarded: boolean };

/**
 * Current session or null.
 * - External backend (AUTH_API_URL): the token is validated with GET /auth/me (gives id, name, pro).
 *   "onboarded" falls back to a per-browser cookie.
 * - Built-in backend: token verified locally and the user looked up (onboarded flag is stored per user).
 */
export async function getSession(): Promise<Session | null> {
  const r = await resolveSession();
  return r === "unavailable" ? null : r;
}

/**
 * Like getSession(), but tells "signed out" (null) apart from "the backend didn't answer" ("unavailable": timeout, network error,
 * 5xx). API routes use this so a slow or busy backend is reported as 503 instead of kicking the user back to the sign-in page.
 */
export async function resolveSession(): Promise<Session | null | "unavailable"> {
  const jar = await cookies();
  // Web uses the httpOnly cookie; the browser extension sends the same token as a Bearer header.
  const bearer = (await headers()).get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = jar.get(SESSION_COOKIE)?.value ?? bearer;
  if (!token) return null;
  // From here on the result depends on the moment of the request (token expiry uses Date.now(), and the backend call is per request),
  // so stop prerendering: without this Next flags "unstable value Date.now() while prerendering" on every page that checks the session.
  await connection();
  const base = authApiUrl();
  if (base) {
    try {
      const res = await fetch(`${base}/auth/me`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (res.status >= 500 || res.status === 429) return "unavailable";
      if (!res.ok) return null;
      const me = (await res.json()) as { user?: { id?: string; name?: string; email?: string; verified?: boolean }; pro?: boolean };
      if (!me.user?.id) return null;
      return { userId: me.user.id, token, name: me.user.name ?? null, email: me.user.email ?? null, verified: me.user.verified === true, pro: me.pro === true, planChosen: me.pro === true || jar.get(PLAN_COOKIE)?.value === "1", onboarded: jar.get(ONBOARDED_COOKIE)?.value === "1" };
    } catch {
      return "unavailable";
    }
  }
  const id = verifyToken(token);
  const user = id ? await getUser(id) : null;
  return user ? { userId: user.id, token, name: user.name, email: user.email, verified: true, pro: false, planChosen: user.planChosen, onboarded: user.onboarded } : null;
}

/** Where a freshly verified user goes next: pick a plan first, otherwise on to the welcome flow. */
export const afterVerifyPath = (s: Pick<Session, "planChosen">) => (s.planChosen ? "/welcome" : "/plans");
