"use client";

import { useRouter } from "next/navigation";
import { links } from "@/lib/site";

/** "Decide later" counts as a choice, so the plan screen isn't shown again after verification. */
export function DecideLater() {
  const router = useRouter();
  return (
    <button type="button" className="cursor-pointer text-sm text-ink-soft hover:text-ink"
      onClick={async () => { await fetch("/api/plan/choose", { method: "POST" }).catch(() => undefined); router.push(links.welcome); }}>
      Decide later
    </button>
  );
}
