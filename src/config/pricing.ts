/**
 * One place for plan prices and limits. Change a number here and the plans page, the landing page and the checkout all follow.
 * (The browser extension and the API are separate projects and keep their own copies of these numbers: see the "Keep in sync" notes there.)
 */
export const PRICING = {
  currency: "USD",
  free: {
    price: 0,
    aiSuggestionsPerMonth: 20,   // replaces [N]
    devices: 1,
  },
  pro: {
    yearlyPrice: 29,             // replaces [PRICE]
    /** Optional monthly price. Leave null for a yearly-only plan (the plans page then hides the Monthly/Yearly switch). */
    monthlyPrice: null as null | number,
    // Optional promo. Set to null to turn it off.
    promo: null as null | { price: number; label: string; endsAt?: string },
    // e.g. { price: 19, label: "Launch offer", endsAt: "2026-12-31" }

    /**
     * PayPal subscription plan IDs. The amount PayPal charges is set by the plan, so the plan chosen at checkout must be the one that
     * matches the price shown. Leave "" to use the API's default plan (PAYPAL_PLAN_YEARLY); the API only accepts IDs it knows.
     */
    paypalPlanId: "",
    promoPaypalPlanId: "",       // used while the promo is active
  },
} as const;

/** "$29", "$29.99": whole amounts drop the ".00". */
export function formatPrice(amount: number, currency: string = PRICING.currency): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** A promo date like "2026-12-31" lasts through the end of that day (UTC); a full timestamp ends at that moment. */
function promoEnd(endsAt: string): number {
  const t = Date.parse(endsAt);
  return /^\d{4}-\d{2}-\d{2}$/.test(endsAt) ? t + 24 * 3600 * 1000 : t;
}

export type ProPrice = { current: number; original: number | null; label: string | null; promoActive: boolean };

/**
 * What Pro costs right now. `now` is only read when the promo has an end date; pass it explicitly from request-time code, and don't
 * rely on the default inside code that is prerendered (Next.js rejects `new Date()` there).
 */
export function getProPrice(now?: Date): ProPrice {
  const { yearlyPrice, promo } = PRICING.pro;
  if (promo && (!promo.endsAt || (now ?? new Date()).getTime() < promoEnd(promo.endsAt))) {
    return { current: promo.price, original: yearlyPrice, label: promo.label, promoActive: true };
  }
  return { current: yearlyPrice, original: null, label: null, promoActive: false };
}

/** The PayPal plan to charge for the price returned by getProPrice(): the promo plan while a promo is active. */
export function getProPlanId(price: ProPrice): string {
  return price.promoActive && PRICING.pro.promoPaypalPlanId ? PRICING.pro.promoPaypalPlanId : PRICING.pro.paypalPlanId;
}

/** "Save 35%": yearly vs paying monthly for 12 months, or the promo vs the regular price. null when there is nothing to compare. */
export function getSavingPercent(price: ProPrice = getProPrice(new Date(0))): number | null {
  const { monthlyPrice } = PRICING.pro;
  const base = price.promoActive && price.original ? price.original : monthlyPrice ? monthlyPrice * 12 : null;
  if (!base || price.current >= base) return null;
  return Math.round((1 - price.current / base) * 100);
}
