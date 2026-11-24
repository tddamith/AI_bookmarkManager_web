import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/landing/header-hero";
import { VerifyForm } from "@/components/verify/verify-form";
import { safeNext } from "@/lib/auth";
import { afterVerifyPath, getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Verify email",
  description: "Enter the 6-digit code we emailed you.",
  alternates: { canonical: "/verify" },
  robots: { index: false, follow: false },
  referrer: "no-referrer", // the link in the email carries the code; never leak it in a Referer header
};

type Params = { next?: string; code?: string; email?: string; autocopy?: string };

/** Same short tag the email puts in the link (sha256 of the lower-cased address, first 16 hex chars). */
const emailTag = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  const { next, code, email, autocopy } = await searchParams;
  const session = await getSession();
  if (!session) {
    // Keep the email link's parameters through sign-in so the code is still there afterwards.
    const own = new URLSearchParams();
    for (const [k, v] of Object.entries({ next, code, email, autocopy })) if (v) own.set(k, v);
    redirect(`/signin?next=${encodeURIComponent(own.size ? `/verify?${own}` : "/verify")}`);
  }
  // Prefill only a well-formed code that was sent to THIS account.
  const wellFormed = typeof code === "string" && /^\d{6}$/.test(code);
  const mismatch = wellFormed && Boolean(email) && Boolean(session.email) && email !== emailTag(session.email!);
  const prefill = wellFormed && !mismatch ? { code: code!, autocopy: autocopy === "1" } : null;
  // Explicit ?next wins; otherwise: no plan chosen yet → plan screen, else on to welcome.
  const dest = next ? safeNext(next) : afterVerifyPath(session);
  if (session.verified) redirect(dest); // already verified: nothing to do
  return (
    <div className="flex grow flex-wrap">
      <section className="relative flex min-w-0 flex-[1_1_480px] flex-col gap-6 overflow-hidden border-r border-ink bg-sand px-6 py-16 sm:px-14">
        <svg width="300" height="150" viewBox="0 0 300 150" className="absolute right-10 top-12 hidden sm:block" aria-hidden="true">
          <path d="M0 0H200V110" fill="none" stroke="#111111" strokeWidth="1" />
          <path d="M220 0L300 100" fill="none" stroke="#111111" strokeWidth="1" />
        </svg>
        <p className="text-sm text-[#1F1F1F]">Verify —<br />One quick step</p>
        <h1 className="max-w-[520px] text-[clamp(44px,6vw,64px)] font-normal leading-[0.98] tracking-[-0.045em]">Check your inbox.</h1>
        <p className="max-w-[420px] text-lg leading-normal text-[#1F1F1F]">
          We sent a 6-digit code to <strong className="font-medium text-ink">{session.email ?? "your email"}</strong>. It works for 10 minutes.
        </p>
        <div aria-hidden="true" className="relative -mx-6 mt-2 min-h-24 grow overflow-hidden border-t border-ink sm:-mx-14">
          <svg className="absolute inset-0 size-full" aria-hidden="true">
            <defs>
              <pattern id="tp-verify" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M8 8H36V36" fill="none" stroke="#111111" strokeWidth="1" strokeLinecap="square" />
                <path d="M48 44L72 68" fill="none" stroke="#111111" strokeWidth="1" strokeLinecap="square" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="#C9B597" />
            <rect width="100%" height="100%" fill="url(#tp-verify)" />
          </svg>
        </div>
        <svg width="150" height="110" viewBox="0 0 150 110" className="mt-auto" aria-hidden="true">
          <rect x="0" y="10" width="150" height="100" rx="14" fill="#111111" />
          <path d="M8 22l67 48 67-48" fill="none" stroke="#C9B597" strokeWidth="2" />
          <circle cx="136" cy="14" r="14" fill="#D4FA1E" stroke="#111111" strokeWidth="1.5" />
        </svg>
      </section>
      <main id="main" className="flex min-w-0 flex-[1_1_440px] justify-center px-6 py-16">
        <div className="w-full max-w-[440px]">
          <VerifyForm name={session.name} next={dest} prefill={prefill} mismatch={mismatch} />
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-6 py-4">
        <Logo />
        <span className="text-sm text-ink-muted">Step 1 of 2 — verify email</span>
      </header>
      <Suspense fallback={<div className="grow" aria-hidden="true" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
