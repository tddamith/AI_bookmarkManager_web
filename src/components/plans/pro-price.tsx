"use client";

import { formatPrice, PRICING, getSavingPercent } from "@/config/pricing";
import { useProPrice } from "@/components/plans/use-pro-price";

/** Pro price block shared by the plans page and the landing page. Shows the promo label, the struck-through regular price and the suffix. */
export function ProPrice({ period = "year" }: { period?: "year" | "month" }) {
  const price = useProPrice();
  const monthly = period === "month" && PRICING.pro.monthlyPrice != null;
  const promo = price.promoActive && !monthly;
  return (
    <div className="flex flex-col items-end gap-1.5">
      {promo && price.label && (
        <span className="rounded-pill bg-ink px-3 py-1 text-xs font-medium text-white">{price.label}</span>
      )}
      <p className="flex items-baseline gap-1.5">
        {promo && price.original != null && (
          <span className="text-xl text-ink-soft line-through">
            <span className="sr-only">Regular price </span>{formatPrice(price.original)}
          </span>
        )}
        <span className="text-[44px] tracking-[-0.03em]">
          {promo && <span className="sr-only">Now </span>}
          {formatPrice(monthly ? PRICING.pro.monthlyPrice! : price.current)}
        </span>
        <span className="text-sm text-ink-soft">/ {monthly ? "month" : "year"}</span>
      </p>
    </div>
  );
}

/** "Save 35%" for the billing switch, or null when there is nothing to compare (no monthly price, no active promo). */
export function useSavingPercent() {
  return getSavingPercent(useProPrice());
}

/** Landing page footnote under the Pro card. */
export function PayNote() {
  const saving = useSavingPercent();
  return <>{saving ? `Save ${saving}% · ` : ""}Pay securely with PayPal</>;
}
