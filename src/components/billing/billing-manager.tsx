"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CheckCircle } from "@/components/ui/icons";
import {
  FALLBACK_CATALOG, billingErrorMessage, formatDate, formatMoney, planOf, statusLabel,
  type Billing, type BillingOverview, type Device, type Payment,
} from "@/lib/plans";
import { links } from "@/lib/site";

const pill = "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-pill px-5 text-[15px] font-medium transition-colors disabled:cursor-not-allowed";
const primary = `${pill} bg-ink text-white hover:bg-ink-muted disabled:bg-disabled`;
const secondary = `${pill} border-[1.5px] border-ink text-ink hover:bg-white disabled:border-dashed disabled:border-disabled disabled:text-disabled`;
const row = "flex min-h-11 items-center justify-between gap-4 border-t border-ink py-2 text-[15px]";

const banners: Record<string, string> = {
  success: "Payment received — welcome to Pro.",
  changed: "Your billing period was updated. The new price applies from your next renewal.",
  pending: "Thanks. PayPal is still confirming your payment. This page updates by itself.",
  cancelled: "Checkout was cancelled. Nothing was charged.",
  failed: "We couldn't confirm that payment. If you were charged, refresh in a minute or contact us.",
  mismatch: "That payment belongs to a different Tidypin account. Sign in with the account you paid with.",
};

async function call<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { message?: string; code?: string } }> {
  try {
    const res = await fetch(path, { cache: "no-store", ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
    return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T & { message?: string } };
  } catch {
    return { ok: false, status: 0, data: { message: "We couldn't reach the server. Check your connection and try again." } as T & { message?: string } };
  }
}

function Meter({ label, used, limit, note }: { label: string; used: number; limit: number | null; note?: string }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="flex flex-col gap-2 border-t border-ink pt-3">
      <div className="flex items-baseline justify-between gap-3 text-[15px]">
        <span>{label}</span>
        <span className="text-ink-muted">{limit ? `${used.toLocaleString()} of ${limit.toLocaleString()}` : `${used.toLocaleString()} · Unlimited`}</span>
      </div>
      {limit ? (
        <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(used, limit)} className="h-2.5 overflow-hidden rounded-pill border border-ink bg-white">
          <div className={`h-full ${pct >= 90 ? "bg-ink" : "bg-lime"}`} style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {note && <p className="text-[13px] text-ink-muted">{note}</p>}
    </div>
  );
}

export function BillingManager({ initial, checkout }: { initial: BillingOverview | null; checkout: string | null }) {
  const router = useRouter();
  const [data, setData] = useState<BillingOverview | null>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(checkout ? banners[checkout] ?? null : null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [devices, setDevices] = useState<{ devices: Device[]; limit: number | null } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async (refresh = false) => {
    const r = await call<BillingOverview>(`/api/billing/subscription${refresh ? "?refresh=1" : ""}`);
    if (r.status === 401) { router.push(`/signin?next=${encodeURIComponent(links.billing)}`); return null; }
    if (r.ok) { setData(r.data); return r.data; }
    setError(r.data.message ?? "We couldn't load your plan.");
    return null;
  }, [router]);

  const loadExtras = useCallback(() =>
    Promise.all([call<{ payments: Payment[] }>("/api/billing/history"), call<{ devices: Device[]; limit: number | null }>("/api/billing/devices")])
      .then(([p, d]) => {
        setPayments(p.ok ? p.data.payments : []);
        if (d.ok) setDevices({ devices: d.data.devices, limit: d.data.limit });
      }), []);

  useEffect(() => {
    void loadExtras();
  }, [loadExtras]);

  // Coming back from PayPal while the payment is still being confirmed: re-check every few seconds for a minute.
  const polls = useRef(0);
  useEffect(() => {
    if (checkout !== "pending" || data?.subscription.pro) return;
    const t = setInterval(async () => {
      polls.current += 1;
      const d = await load(true);
      if (d?.subscription.pro) { setNotice(banners.success); clearInterval(t); void loadExtras(); }
      if (polls.current >= 12) clearInterval(t);
    }, 5000);
    return () => clearInterval(t);
  }, [checkout, data?.subscription.pro, load, loadExtras]);

  async function act(name: string, path: string, body?: unknown, redirect = false) {
    if (busy) return;
    setBusy(name); setError(null); setNotice(null);
    const r = await call<{ url?: string; subscription?: unknown }>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
    if (r.ok && redirect && r.data.url) { window.location.assign(r.data.url); return; }
    setBusy(null);
    if (!r.ok) { setError(r.data.message ?? billingErrorMessage(r.data.code)); return; }
    await load();
    void loadExtras();
    return true;
  }

  async function removeDevice(id: string) {
    if (busy) return;
    setBusy(`device:${id}`);
    const r = await call(`/api/billing/devices/${encodeURIComponent(id)}`, { method: "DELETE" });
    setBusy(null);
    if (!r.ok) setError(r.data.message ?? "We couldn't remove that device.");
    void loadExtras(); void load();
  }

  if (!data) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-[clamp(40px,5vw,56px)] font-normal leading-[0.98] tracking-[-0.045em]">Plan &amp; billing</h1>
        <p role="alert" className="border-l-2 border-ink bg-white px-3 py-2 text-sm">{error ?? "We couldn't load your plan."}</p>
        <button type="button" className={secondary} onClick={() => { setError(null); void load(); }}>Try again</button>
      </div>
    );
  }

  const { subscription: s, entitlements: e } = data;
  const catalog = data.catalog ?? FALLBACK_CATALOG;
  const pro = planOf(catalog, "pro");
  const other: Billing = s.billing === "yearly" ? "monthly" : "yearly";
  const canSwitch = Boolean(pro.price[other]);                       // e.g. no monthly price: Pro is yearly-only
  const renewPeriod: Billing = s.billing && pro.price[s.billing] ? s.billing : "yearly";
  const price = s.billing && pro.price[s.billing] ? formatMoney(pro.price[s.billing], catalog.currency) : null;
  const progress = s.daysLeft !== null && s.periodDays ? Math.min(100, Math.max(0, Math.round((s.daysLeft / s.periodDays) * 100))) : null;
  const suspended = s.paypalStatus === "SUSPENDED";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-2.5">
          <p className="text-sm text-ink-soft">Account —<br />Plan, usage and payments</p>
          <h1 className="text-[clamp(40px,5vw,56px)] font-normal leading-[0.98] tracking-[-0.045em]">Plan &amp; billing</h1>
        </div>
        <button type="button" className={secondary} disabled={busy === "refresh"} onClick={async () => { setBusy("refresh"); await load(true); void loadExtras(); setBusy(null); }}>
          {busy === "refresh" ? "Checking…" : "Refresh status"}
        </button>
      </div>

      {notice && <p role="status" className="rounded-panel border-[1.5px] border-ink bg-lime px-4 py-3 text-[15px]">{notice}</p>}
      {error && <p role="alert" className="border-l-2 border-ink bg-white px-3 py-2 text-sm">{error}</p>}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        {/* Current plan */}
        <section aria-labelledby="current-plan" className={`flex flex-col gap-4 rounded-card p-8 ${s.pro ? "border-[1.5px] border-ink bg-lime" : "bg-white"}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="current-plan" className="text-[28px] font-normal tracking-[-0.02em]">{s.pro ? "Pro —" : "Free —"}</h2>
            <span className="rounded-pill border-[1.5px] border-ink px-3 py-1 text-[13px]">{s.pro ? statusLabel[s.status] : s.status === "expired" ? "Pro expired" : statusLabel.none}</span>
          </div>
          {s.pro && price && <p className="flex items-baseline gap-1.5"><span className="text-[40px] tracking-[-0.03em]">{price}</span><span className="text-sm text-ink-soft">/ {s.billing === "yearly" ? "year" : "month"}</span></p>}

          {s.pro && s.daysLeft !== null && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[15px]">
                <span>{s.daysLeft} {s.daysLeft === 1 ? "day" : "days"} left</span>
                <span className="text-ink-soft">{s.autoRenew ? `Renews ${formatDate(s.renews)}` : `Ends ${formatDate(s.ends)}`}</span>
              </div>
              {progress !== null && (
                <div role="meter" aria-label="Days left in this billing period" aria-valuemin={0} aria-valuemax={s.periodDays ?? 0} aria-valuenow={s.daysLeft} className="h-2.5 overflow-hidden rounded-pill border border-ink bg-white">
                  <div className="h-full bg-ink" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          )}

          <dl className="m-0 flex flex-col border-b border-ink">
            {([
              ["Billing", s.billing ? (s.billing === "yearly" ? "Yearly" : "Monthly") : "—"],
              ["Auto-renew", s.pro ? (s.autoRenew ? "On" : "Off") : "—"],
              [s.autoRenew ? "Next payment" : "Access until", s.pro ? formatDate(s.autoRenew ? s.renews : s.ends) : "—"],
              ["Member since", formatDate(s.startedAt)],
              ["Last payment", s.lastPayment ? `${formatMoney(s.lastPayment.amount, s.lastPayment.currency)} · ${formatDate(s.lastPayment.time)}` : "—"],
            ] as const).map(([k, v]) => (
              <div key={k} className={row}><dt className="text-ink-soft">{k}</dt><dd className="m-0 text-right">{v}</dd></div>
            ))}
          </dl>

          {s.pending && !s.pro && <p className="text-sm text-ink-soft">A {s.pending.billing} checkout was started but isn&apos;t finished yet.</p>}
          {suspended && <p className="text-sm">Your last payment failed. Update your payment method in PayPal, then reactivate to keep Pro.</p>}
          {s.status === "cancelled" && <p className="text-sm">Pro stays on until {formatDate(s.ends)}. Renew now and your first payment starts then — you won&apos;t pay twice.</p>}

          <div className="mt-auto flex flex-wrap gap-2.5 pt-2">
            {!s.pro && (
              <Link href={links.plans} className={primary}>Upgrade to Pro</Link>
            )}
            {s.pro && s.autoRenew && (
              <>
                {canSwitch && (
                  <button type="button" className={primary} disabled={!!busy} onClick={() => void act("change", "/api/billing/change", { period: other }, true)}>
                    {busy === "change" ? "Opening PayPal…" : `Switch to ${other}`}
                  </button>
                )}
                <button type="button" className={secondary} disabled={!!busy} onClick={() => setConfirming(true)}>Cancel subscription</button>
              </>
            )}
            {s.pro && !s.autoRenew && suspended && (
              <button type="button" className={primary} disabled={!!busy} onClick={() => void act("reactivate", "/api/billing/reactivate").then((done) => done && setNotice("Your subscription is active again."))}>
                {busy === "reactivate" ? "Reactivating…" : "Reactivate"}
              </button>
            )}
            {s.pro && !s.autoRenew && !suspended && s.billing && (
              <button type="button" className={primary} disabled={!!busy} onClick={() => void act("renew", "/api/billing/checkout", { period: renewPeriod }, true)}>
                {busy === "renew" ? "Opening PayPal…" : "Renew Pro"}
              </button>
            )}
          </div>
          {!catalog.available && !s.pro && <p className="text-[13px] text-ink-soft">Payments aren&apos;t available yet.</p>}
        </section>

        {/* Usage + limits */}
        <section aria-labelledby="usage" className="flex flex-col gap-4 rounded-card bg-white p-8">
          <h2 id="usage" className="text-[28px] font-normal tracking-[-0.02em]">Usage —</h2>
          <Meter label="AI credits this month" used={e.usage.ai.used} limit={e.usage.ai.limit} note={e.usage.ai.resetsAt ? `Resets ${formatDate(e.usage.ai.resetsAt)}` : undefined} />
          <Meter label="Syncing devices" used={e.usage.devices.used} limit={e.usage.devices.limit} />
          <Meter label="Bookmarks" used={e.usage.bookmarks.used} limit={e.usage.bookmarks.limit} />
          <ul className="m-0 mt-2 flex list-none flex-col border-b border-ink p-0">
            {([["AI dashboard insights", e.features.insights], ["One-tap tidy-up", e.features.tidy], ["Sync on all devices", e.features.sync]] as const).map(([label, on]) => (
              <li key={label} className={row}>
                <span className="flex items-center gap-2.5">{on ? <CheckCircle size={18} /> : <span aria-hidden="true" className="inline-block size-[18px] rounded-full border-[1.5px] border-dashed border-ink" />}{label}</span>
                <span className="text-[13px] text-ink-soft">{on ? "Included" : "Pro"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Devices */}
      <section aria-labelledby="devices" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink pb-3">
          <h2 id="devices" className="text-[clamp(28px,3vw,36px)] font-normal tracking-[-0.03em]">Devices —</h2>
          <p className="text-sm text-ink-soft">{devices?.limit ? `${devices.devices.length} of ${devices.limit} on your plan` : "Unlimited on your plan"}</p>
        </div>
        {devices === null ? <p className="text-sm text-ink-muted">Loading…</p> : devices.devices.length === 0 ? (
          <p className="text-[15px] text-ink-muted">No devices have synced yet. Install the extension and sign in to start.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {devices.devices.map((d, i) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/20 py-3">
                <span className="flex flex-col"><span className="text-[15px]">{d.name}{devices.limit && i >= devices.limit ? " · paused on Free" : ""}</span><span className="text-[13px] text-ink-muted">Last synced {formatDate(d.lastSeen)}</span></span>
                <button type="button" className={secondary} disabled={!!busy} onClick={() => void removeDevice(d.id)}>{busy === `device:${d.id}` ? "Removing…" : "Remove"}</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Payments */}
      <section aria-labelledby="payments" className="flex flex-col gap-4">
        <h2 id="payments" className="border-b border-ink pb-3 text-[clamp(28px,3vw,36px)] font-normal tracking-[-0.03em]">Payments —</h2>
        {payments === null ? <p className="text-sm text-ink-muted">Loading…</p> : payments.length === 0 ? (
          <p className="text-[15px] text-ink-muted">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-[15px]">
              <thead><tr className="text-[13px] text-ink-soft"><th scope="col" className="py-2 font-normal">Date</th><th scope="col" className="py-2 font-normal">Amount</th><th scope="col" className="py-2 font-normal">Status</th><th scope="col" className="py-2 font-normal">Reference</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={`${p.subscriptionId}:${p.id}`} className="border-t border-ink/20">
                    <td className="py-3">{formatDate(p.time)}</td>
                    <td className="py-3">{formatMoney(p.amount, p.currency ?? catalog.currency)}</td>
                    <td className="py-3">{p.status === "COMPLETED" ? "Paid" : p.status?.toLowerCase().replace(/_/g, " ") ?? "—"}</td>
                    <td className="py-3 font-mono text-[13px] text-ink-muted">{p.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CancelDialog
        open={confirming}
        ends={s.renews}
        busy={busy === "cancel"}
        onClose={() => setConfirming(false)}
        onConfirm={async (reason) => {
          const done = await act("cancel", "/api/billing/cancel", { reason });
          setConfirming(false);
          if (done) setNotice("Your subscription is cancelled. You keep Pro until the end of the period you paid for.");
        }}
      />
    </>
  );
}

const reasons = ["Too expensive", "Not using it enough", "Missing a feature", "Switching to another tool", "Something else"];

function CancelDialog({ open, ends, busy, onClose, onConfirm }: { open: boolean; ends: string | null; busy: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [reason, setReason] = useState("");
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby={`${id}-t`} className="m-auto w-[min(460px,calc(100%-32px))] rounded-card border-[1.5px] border-ink bg-paper p-0 text-ink backdrop:bg-ink/40">
      <form method="dialog" onSubmit={(ev) => { ev.preventDefault(); onConfirm(reason); }} className="flex flex-col gap-[18px] p-7">
        <h2 id={`${id}-t`} className="text-3xl font-normal tracking-[-0.03em]">Cancel Pro?</h2>
        <p className="text-[15px] leading-normal text-ink-soft">
          Auto-renew stops now. You keep Pro until {formatDate(ends)}, then your account moves to Free. Your bookmarks stay.
        </p>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm">Why are you leaving? (optional)</legend>
          {reasons.map((r) => (
            <label key={r} className="flex min-h-9 items-center gap-2.5 text-[15px]">
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="size-[18px] accent-ink" />{r}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className="h-12 flex-1 cursor-pointer rounded-pill bg-ink px-6 text-base font-medium text-white hover:bg-ink-muted disabled:cursor-not-allowed disabled:bg-disabled">
            {busy ? "Cancelling…" : "Cancel subscription"}
          </button>
          <button type="button" onClick={onClose} className="h-12 cursor-pointer rounded-pill border-[1.5px] border-ink px-6 text-base hover:bg-white">Keep Pro</button>
        </div>
      </form>
    </dialog>
  );
}
