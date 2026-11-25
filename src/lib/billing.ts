import "server-only";
import { authApiUrl } from "@/lib/auth";
import { backendFetch, type BackendResult } from "@/lib/backend";
import {
  FALLBACK_CATALOG, FREE_STATE, freeEntitlements,
  type Billing, type BillingOverview, type Catalog, type Device, type Entitlements, type Payment, type SubscriptionState,
} from "@/lib/plans";

/**
 * Server-side billing calls to the API (/billing/*). The browser never talks to PayPal or the API directly:
 * these run inside our route handlers with the httpOnly session token.
 * Without AUTH_API_URL (built-in dev backend) everyone is on Free and payments are unavailable.
 */
export const billingEnabled = () => Boolean(authApiUrl());

export async function getCatalog(): Promise<Catalog> {
  if (!billingEnabled()) return FALLBACK_CATALOG;
  try {
    const r = await backendFetch<Catalog>("/billing/plans", { method: "GET", timeoutMs: 8000 });
    return r.ok && Array.isArray(r.data.plans) ? r.data : FALLBACK_CATALOG;
  } catch {
    return FALLBACK_CATALOG;
  }
}

/** Subscription + entitlements + catalog. `refresh` asks the API to re-check PayPal right now. Null on 401. */
export async function getOverview(token: string, refresh = false): Promise<BillingOverview | null> {
  if (!billingEnabled()) return { subscription: FREE_STATE, entitlements: freeEntitlements(), catalog: FALLBACK_CATALOG };
  const [sub, catalog] = await Promise.all([
    backendFetch<{ subscription: SubscriptionState; entitlements: Entitlements }>(`/billing/subscription${refresh ? "?refresh=1" : ""}`, { method: "GET", token }),
    getCatalog(),
  ]);
  if (sub.status === 401) return null;
  if (!sub.ok || !sub.data.subscription) throw new Error(`billing ${sub.status}`);
  return { subscription: sub.data.subscription, entitlements: sub.data.entitlements, catalog };
}

type Opts = { token: string; request?: Request };
type Checkout = { approveUrl?: string; subscriptionId?: string; startsAt?: string | null };
type WithSub = { subscription?: SubscriptionState };

/** `price` is what the buyer was shown (src/config/pricing.ts): the API refuses with price_mismatch if the PayPal plan charges anything else. */
export type ShownPrice = { expectedAmount: number; currency: string; planId?: string };

export const subscribe = (o: Opts, billing: Billing, returnUrl: string, cancelUrl: string, price?: ShownPrice): Promise<BackendResult<Checkout>> =>
  backendFetch<Checkout>("/billing/subscribe", { ...o, body: { billing, returnUrl, cancelUrl, ...price } });

export const changeBilling = (o: Opts, billing: Billing, returnUrl: string, cancelUrl: string): Promise<BackendResult<Checkout>> =>
  backendFetch<Checkout>("/billing/change", { ...o, body: { billing, returnUrl, cancelUrl } });

export const confirmSubscription = (o: Opts, subscriptionId: string) =>
  backendFetch<WithSub & { paypalStatus?: string }>("/billing/confirm", { ...o, body: { subscriptionId } });

export const cancelSubscription = (o: Opts, reason: string) => backendFetch<WithSub>("/billing/cancel", { ...o, body: { reason } });

export const reactivateSubscription = (o: Opts) => backendFetch<WithSub>("/billing/reactivate", { ...o, body: {} });

export const paymentHistory = (o: Opts) => backendFetch<{ payments?: Payment[] }>("/billing/history", { ...o, method: "GET" });

export const devices = (o: Opts) => backendFetch<{ devices?: Device[]; limit?: number | null }>("/billing/devices", { ...o, method: "GET" });

export const removeDevice = (o: Opts, id: string) =>
  backendFetch<{ ok?: boolean }>(`/billing/devices/${encodeURIComponent(id)}`, { ...o, method: "DELETE" });

/** This site's public origin for PayPal's return URLs (honours the hosting proxy's forwarded headers). */
export function siteOrigin(request: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}
