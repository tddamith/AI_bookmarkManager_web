/**
 * Plan + subscription shapes shared by the server routes and the client UI (mirrors the API's /billing/* responses).
 * Prices and limits come from the API (GET /billing/plans); FALLBACK_CATALOG is only used when the API can't be reached.
 */
export type Billing = "monthly" | "yearly";
export type PlanId = "free" | "pro";

export type PlanLimits = { ai_credits: number; devices: number; bookmarks: number };
export type PlanFeatures = { insights: boolean; tidy: boolean; sync: boolean };
export type CatalogPlan = {
  id: PlanId;
  name: string;
  /** null: not sold for that period (e.g. yearly-only Pro). */
  price: Record<Billing, string | null>;
  yearlySavingPercent?: number;
  limits: PlanLimits;
  features: PlanFeatures;
};
export type Catalog = { currency: string; available: boolean; plans: CatalogPlan[] };

export type SubscriptionStatus = "none" | "active" | "past_due" | "cancelled" | "expired";
export type SubscriptionState = {
  pro: boolean;
  plan: PlanId;
  billing: Billing | null;
  renews: string | null;
  ends: string | null;
  status: SubscriptionStatus;
  paypalStatus: string | null;
  subscriptionId: string | null;
  autoRenew: boolean;
  startedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  daysLeft: number | null;
  periodDays: number | null;
  cancelledAt: string | null;
  lastPayment: { amount: string; currency: string; time: string | null } | null;
  failedPayments: number;
  checkedAt: string | null;
  pending: { billing: Billing; kind: "new" | "change" } | null;
};

type Meter = { used: number; limit: number | null; remaining?: number; resetsAt?: string };
export type Entitlements = {
  plan: PlanId;
  features: PlanFeatures;
  limits: { ai_credits: number; devices: number | null; bookmarks: number | null };
  usage: { ai: Meter; devices: Meter; bookmarks: Meter };
};

export type Payment = { id: string; subscriptionId: string; status: string; amount: string | null; currency: string | null; time: string | null; billing: Billing | null };
export type Device = { id: string; name: string; firstSeen: string | null; lastSeen: string | null };
export type BillingOverview = { subscription: SubscriptionState; entitlements: Entitlements; catalog: Catalog };

export const FALLBACK_CATALOG: Catalog = {
  currency: "USD",
  available: false,
  plans: [
    { id: "free", name: "Free", price: { monthly: "0", yearly: "0" }, limits: { ai_credits: 20, devices: 1, bookmarks: 0 }, features: { insights: false, tidy: false, sync: false } },
    { id: "pro", name: "Pro", price: { monthly: null, yearly: "29" }, yearlySavingPercent: 0, limits: { ai_credits: 1000, devices: 10, bookmarks: 0 }, features: { insights: true, tidy: true, sync: true } },
  ],
};

export const FREE_STATE: SubscriptionState = {
  pro: false, plan: "free", billing: null, renews: null, ends: null, status: "none", paypalStatus: null, subscriptionId: null,
  autoRenew: false, startedAt: null, periodStart: null, periodEnd: null, daysLeft: null, periodDays: null, cancelledAt: null,
  lastPayment: null, failedPayments: 0, checkedAt: null, pending: null,
};

export function freeEntitlements(catalog: Catalog = FALLBACK_CATALOG): Entitlements {
  const free = planOf(catalog, "free");
  return {
    plan: "free",
    features: free.features,
    limits: { ai_credits: free.limits.ai_credits, devices: free.limits.devices || null, bookmarks: free.limits.bookmarks || null },
    usage: { ai: { used: 0, limit: free.limits.ai_credits }, devices: { used: 0, limit: free.limits.devices || null }, bookmarks: { used: 0, limit: free.limits.bookmarks || null } },
  };
}

export const planOf = (catalog: Catalog, id: PlanId) =>
  catalog.plans.find((p) => p.id === id) ?? FALLBACK_CATALOG.plans.find((p) => p.id === id)!;

export function formatMoney(value: string | null | undefined, currency = "USD") {
  const n = Number(value);
  if (!value || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export const statusLabel: Record<SubscriptionStatus, string> = {
  none: "Free plan",
  active: "Active",
  past_due: "Payment issue",
  cancelled: "Cancelled — ends soon",
  expired: "Expired",
};

/** Friendly text for the API's billing error codes. */
export function billingErrorMessage(code: string | undefined, fallback = "Something went wrong. Please try again.") {
  switch (code) {
    case "paypal_not_configured":
      return "Payments aren't available yet. Continue with Free for now.";
    case "already_subscribed":
      return "You already have Pro. Manage it from Plan & billing.";
    case "price_mismatch":
      return "The price changed. Reload the page to see the current price.";
    case "monthly_unavailable":
      return "Pro is billed yearly.";
    case "same_plan":
      return "You're already on that billing period.";
    case "no_subscription":
      return "There's no active subscription to change.";
    case "not_suspended":
      return "Your subscription doesn't need reactivating.";
    case "not_yours":
      return "That payment belongs to a different account.";
    case "rate_limited":
      return "Too many attempts. Wait a few minutes and try again.";
    case "bad_plan":
      return "Choose monthly or yearly billing.";
    case "bad_return_url":
      return "Checkout isn't set up for this site yet (WEB_URL on the API).";
    case "paypal_unreachable":
    case "paypal_error":
      return "We couldn't reach PayPal. Please try again.";
    case "unauthorized":
      return "Your session expired. Please sign in again.";
    default:
      return fallback;
  }
}
