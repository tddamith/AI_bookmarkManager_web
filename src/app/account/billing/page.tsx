import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BillingManager } from "@/components/billing/billing-manager";
import { Logo } from "@/components/landing/header-hero";
import { getOverview } from "@/lib/billing";
import { getSession } from "@/lib/session";
import { links } from "@/lib/site";

export const metadata: Metadata = {
  title: "Plan & billing",
  description: "Your Tidypin plan, subscription, usage and payments.",
  robots: { index: false, follow: false },
};

async function Gate({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const session = await getSession();
  if (!session) redirect(`/signin?next=${encodeURIComponent(links.billing)}`);
  if (!session.verified) redirect("/verify");
  const { checkout } = await searchParams;
  let initial = null;
  try {
    initial = await getOverview(session.token, Boolean(checkout));
  } catch {
    initial = null;                                     // the client shows a retry
  }
  return <BillingManager initial={initial} checkout={checkout ?? null} />;
}

export default function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-6 py-4">
        <Logo />
        <Link href={links.app} className="text-sm text-ink-soft hover:text-ink">Back to dashboard</Link>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-[1040px] grow flex-col gap-8 px-6 py-14">
        <Suspense fallback={<p className="text-sm text-ink-muted">Loading your plan…</p>}>
          <Gate searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
