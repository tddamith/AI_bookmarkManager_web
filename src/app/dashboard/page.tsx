import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { PortalApp } from "@/components/portal/portal-app";
import { getSource, hasBookmarks } from "@/lib/library";
import { sidebarData } from "@/lib/library-store";
import { getSession } from "@/lib/session";
import { links } from "@/lib/site";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

async function Session({ searchParams }: { searchParams: Promise<{ fresh?: string }> }) {
  const { fresh } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/signin?next=/dashboard");
  if (!session.verified) redirect("/verify");
  if (!session.onboarded) redirect(links.welcome); // first visit: show Get started once
  // No bookmarks yet: show Get started (import / extension) instead of an empty library — unless they chose "Start fresh".
  if (fresh !== "1" && !(await hasBookmarks({ userId: session.userId, token: session.token }))) redirect(links.welcome);
  // Preload the sidebar (folders + counts) on the server so it renders with data and no skeleton.
  const sidebar = await getSource({ userId: session.userId, token: session.token }).then(sidebarData).catch(() => null);
  const jar = await cookies();
  return (
    <PortalApp name={session.name} fresh={fresh === "1"} sidebar={sidebar}
      foldersOpen={jar.get("tidypin_folders_open")?.value === "1"} enter={!jar.get("tidypin_sidebar_entered")} />
  );
}

export default function Dashboard({ searchParams }: { searchParams: Promise<{ fresh?: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" aria-hidden="true" />}>
      <Session searchParams={searchParams} />
    </Suspense>
  );
}
