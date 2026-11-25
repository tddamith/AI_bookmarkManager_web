"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle } from "@/components/ui/icons";
import { ProPrice, useSavingPercent } from "@/components/plans/pro-price";
import { PRICING, formatPrice } from "@/config/pricing";
import { billingErrorMessage, formatDate, planOf, type Catalog, type SubscriptionState } from "@/lib/plans";
import { links } from "@/lib/site";

/** Prices come from src/config/pricing.ts (what checkout charges); the API catalog adds availability and Pro's limits. */
const hasMonthly = PRICING.pro.monthlyPrice != null;
const freeFeatures = [
  "Unlimited bookmarks",
  `${PRICING.free.aiSuggestionsPerMonth} AI suggestions a month`,
  "Popup, side panel and web portal",
  `${PRICING.free.devices} ${PRICING.free.devices === 1 ? "device" : "devices"}`,
];

const row = "flex min-h-[46px] items-center gap-3 border-t border-ink py-2 text-base";
const tab = "h-10 cursor-pointer rounded-pill px-5 text-sm";

export function PlanPicker({ catalog, current }: { catalog: Catalog; current: SubscriptionState | null }) {
  const router = useRouter();
  const pro = planOf(catalog, "pro");
  const [yearlyChoice, setYearly] = useState(current?.billing !== "monthly");
  const yearly = yearlyChoice || !hasMonthly; // yearly-only plan: there is nothing else to choose
  const saving = useSavingPercent();
  const [busy, setBusy] = useState<"free" | "pro" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPro = current?.pro === true;
  const autoRenew = isPro && current?.autoRenew === true;
  const proFeatures = [
    pro.limits.ai_credits ? `${pro.limits.ai_credits.toLocaleString()} AI suggestions and summaries a month` : "Unlimited AI suggestions and summaries",
    "One-tap tidy-up",
    "Dashboard insights and For you picks",
    pro.limits.devices ? `Sync on up to ${pro.limits.devices} devices` : "Sync on all devices",
  ];

  async function chooseFree() {
    if (busy) return;
    setBusy("free");
    await fetch("/api/plan/choose", { method: "POST" }).catch(() => undefined);
    router.push(links.welcome);
  }

  async function upgrade() {
    if (busy) return;
    if (autoRenew) return router.push(links.billing);
    setError(null);
    setBusy("pro");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ period: yearly ? "yearly" : "monthly" }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string; code?: string };
      if (res.status === 401) return router.push(`/signin?next=${encodeURIComponent(links.plans)}`);
      if (data.code === "already_subscribed") return router.push(links.billing);
      if (!res.ok || !data.url) {
        setError(data.message ?? billingErrorMessage(data.code));
        setBusy(null);
        return;
      }
      window.location.assign(data.url); // PayPal's approval page (external)
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setBusy(null);
    }
  }

  const proLabel = autoRenew ? "Manage your plan" : isPro ? "Renew Pro" : "Upgrade to Pro";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-2.5">
          <p className="text-sm text-ink-soft">
            {isPro ? (
              <>
                You&apos;re on Pro —<br />
                {autoRenew ? `Renews ${formatDate(current?.renews)}` : `Ends ${formatDate(current?.ends)}`}
              </>
            ) : (
              <>
                Account created —<br />
                One more step
              </>
            )}
          </p>
          <h1 className="max-w-[520px] text-[clamp(40px,5vw,56px)] font-normal leading-[0.98] tracking-[-0.045em]">
            Choose a plan
          </h1>
        </div>
        {hasMonthly && (
          <div role="group" aria-label="Billing period" className="flex rounded-pill border-[1.5px] border-ink p-[3px]">
            <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}
              className={`${tab} ${!yearly ? "bg-ink font-medium text-white" : "text-ink"}`}>
              Monthly
            </button>
            <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}
              className={`${tab} ${yearly ? "bg-ink font-medium text-white" : "text-ink"}`}>
              Yearly{saving ? ` · save ${saving}%` : ""}
            </button>
          </div>
        )}
      </div>

      {!catalog.available && (
        <p role="status" className="border-l-2 border-ink bg-white px-3 py-2 text-sm">
          Payments aren&apos;t available right now. You can continue with Free and upgrade later.
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        <section aria-labelledby="plan-free" className="flex flex-col gap-4 rounded-card bg-white p-8">
          <div className="flex items-baseline justify-between">
            <h2 id="plan-free" className="text-[28px] font-normal">Free —</h2>
            <p className="text-[44px] tracking-[-0.03em]">{formatPrice(PRICING.free.price)}</p>
          </div>
          <ul className="m-0 flex list-none flex-col border-b border-ink p-0">
            {freeFeatures.map((f) => (
              <li key={f} className={row}>{f}</li>
            ))}
          </ul>
          {isPro ? (
            <p className="mt-auto text-center text-sm text-ink-soft">Free is included — you keep everything here if Pro ends.</p>
          ) : (
            <button
              type="button"
              onClick={chooseFree}
              disabled={busy !== null}
              aria-busy={busy === "free"}
              className="mt-auto inline-flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-pill border-[1.5px] border-ink px-7 text-[17px] font-medium text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue with Free <ArrowRight />
            </button>
          )}
        </section>

        <section aria-labelledby="plan-pro" className="flex flex-col gap-4 rounded-card border-[1.5px] border-ink bg-lime p-8">
          <div className="flex items-start justify-between gap-3">
            <h2 id="plan-pro" className="text-[28px] font-normal">Pro —</h2>
            <ProPrice period={yearly ? "year" : "month"} />
          </div>
          <ul className="m-0 flex list-none flex-col border-b border-ink p-0">
            {proFeatures.map((f) => (
              <li key={f} className={row}>
                <CheckCircle size={18} />
                {f}
              </li>
            ))}
          </ul>
          {error && (
            <p role="alert" className="border-l-2 border-ink bg-white px-3 py-2 text-sm">
              {error}{" "}
              {error === billingErrorMessage("already_subscribed") && (
                <Link href={links.billing} className="underline">Plan &amp; billing</Link>
              )}
            </p>
          )}
          <button
            type="button"
            onClick={upgrade}
            disabled={busy !== null || (!catalog.available && !autoRenew)}
            aria-busy={busy === "pro"}
            className="mt-auto inline-flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-pill bg-ink px-7 text-[17px] font-medium text-white transition-colors hover:bg-ink-muted disabled:cursor-not-allowed disabled:bg-disabled"
          >
            {busy === "pro" ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                Opening PayPal…
              </>
            ) : (
              <>
                {proLabel} <ArrowRight stroke="currentColor" />
              </>
            )}
          </button>
          <p className="text-center text-[13px] text-ink-soft">
            {isPro && !autoRenew ? "Your first charge waits until your current Pro time ends." : "Secure payment with PayPal · Cancel any time"}
          </p>
        </section>
      </div>
    </>
  );
}
