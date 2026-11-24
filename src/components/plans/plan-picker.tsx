"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle } from "@/components/ui/icons";
import { ProPrice, useSavingPercent } from "@/components/plans/pro-price";
import { PRICING, formatPrice } from "@/config/pricing";
import { links } from "@/lib/site";

const freeFeatures = [
  "Unlimited bookmarks",
  `${PRICING.free.aiSuggestionsPerMonth} AI suggestions a month`,
  "Popup, side panel and web portal",
  `${PRICING.free.devices} ${PRICING.free.devices === 1 ? "device" : "devices"}`,
];
const hasMonthly = PRICING.pro.monthlyPrice != null;
const proFeatures = [
  "Unlimited AI suggestions and summaries",
  "One-tap tidy-up",
  "Dashboard insights and For you picks",
  "Sync on all devices",
];

const row = "flex h-[46px] items-center gap-3 border-t border-ink text-base";

export function PlanPicker() {
  const router = useRouter();
  const [yearlyChoice, setYearly] = useState(true);
  const yearly = yearlyChoice || !hasMonthly;   // yearly-only plan: there is nothing else to choose
  const saving = useSavingPercent();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function chooseFree() {
    if (loading) return;
    setLoading(true);
    await fetch("/api/plan/choose", { method: "POST" }).catch(() => undefined);
    router.push(links.welcome);
  }

  async function upgrade() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ period: yearly ? "yearly" : "monthly" }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
      if (res.status === 401) return router.push(`/signin?next=${encodeURIComponent(links.plans)}`);
      if (!res.ok || !data.url) {
        setError(data.message ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }
  const tab = "h-10 rounded-pill px-5 text-sm";
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-2.5">
          <p className="text-sm text-ink-soft">Account created —<br />One more step</p>
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

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        <section aria-labelledby="plan-free" className="flex flex-col gap-4 rounded-card bg-white p-8">
          <div className="flex items-baseline justify-between">
            <h2 id="plan-free" className="text-[28px] font-normal">Free —</h2>
            <p className="text-[44px] tracking-[-0.03em]">{formatPrice(PRICING.free.price)}</p>
          </div>
          <ul className="m-0 flex list-none flex-col border-b border-ink p-0">
            {freeFeatures.map((f) => <li key={f} className={row}>{f}</li>)}
          </ul>
          <button type="button" onClick={chooseFree} disabled={loading}
            className="mt-auto inline-flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-pill border-[1.5px] border-ink px-7 text-[17px] font-medium text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">
            Continue with Free <ArrowRight />
          </button>
        </section>

        <section aria-labelledby="plan-pro" className="flex flex-col gap-4 rounded-card border-[1.5px] border-ink bg-lime p-8">
          <div className="flex items-baseline justify-between">
            <h2 id="plan-pro" className="text-[28px] font-normal">Pro —</h2>
            <ProPrice period={yearly ? "year" : "month"} />
          </div>
          <ul className="m-0 flex list-none flex-col border-b border-ink p-0">
            {proFeatures.map((f) => (
              <li key={f} className={row}><CheckCircle size={18} />{f}</li>
            ))}
          </ul>
          {error && (
            <p role="alert" className="border-l-2 border-ink bg-white px-3 py-2 text-sm">{error}</p>
          )}
          <button
            type="button"
            onClick={upgrade}
            disabled={loading}
            aria-busy={loading}
            className="mt-auto inline-flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-pill bg-ink px-7 text-[17px] font-medium text-white transition-colors hover:bg-ink-muted disabled:cursor-not-allowed disabled:bg-disabled"
          >
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                Opening PayPal…
              </>
            ) : (
              <>Upgrade to Pro <ArrowRight stroke="#FFFFFF" /></>
            )}
          </button>
          <p className="text-center text-[13px] text-ink-soft">Secure payment with PayPal · Cancel any time</p>
        </section>
      </div>
    </>
  );
}
