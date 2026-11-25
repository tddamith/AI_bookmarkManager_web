import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/landing/header-hero";
import { DecideLater } from "@/components/plans/decide-later";
import { PlanPicker } from "@/components/plans/plan-picker";
import { getCatalog, getOverview } from "@/lib/billing";
import { getSession } from "@/lib/session";
import { links } from "@/lib/site";

export const metadata: Metadata = {
  title: "Choose a plan",
  description: "Pick Free or Pro for your Tidypin account.",
  alternates: { canonical: "/plans" },
  robots: { index: false, follow: true },
};

async function Gate() {
  const session = await getSession();
  if (!session) redirect(`/signin?next=${links.plans}`);
  if (!session.verified) redirect("/verify");
  const [catalog, overview] = await Promise.all([getCatalog(), getOverview(session.token).catch(() => null)]);
  return <PlanPicker catalog={catalog} current={overview?.subscription ?? null} />;
}

export default function PlansPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-6 py-4">
        <Logo />
        <DecideLater />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-[1040px] grow flex-col gap-8 px-6 py-14">
        <Suspense fallback={null}>
          <Gate />
        </Suspense>
      </main>
    </div>
  );
}
