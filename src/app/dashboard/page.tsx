import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PortalApp } from "@/components/portal/portal-app";
import { getSession } from "@/lib/session";
import { links } from "@/lib/site";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

async function Session() {
  const session = await getSession();
  if (!session) redirect("/signin?next=/dashboard");
  if (!session.verified) redirect("/verify");
  if (!session.onboarded) redirect(links.welcome); // first visit: show Get started once
  return <PortalApp name={session.name} />;
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" aria-hidden="true" />}>
      <Session />
    </Suspense>
  );
}
