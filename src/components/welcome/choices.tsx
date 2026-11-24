"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowRight } from "@/components/ui/icons";
import { links } from "@/lib/site";

const stroke = { fill: "none", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const options: { to: string; title: string; body: string; icon: ReactNode; tone: "dark" | "outline"; iconBg: string }[] = [
  {
    to: "/import",
    title: "Add the extension and bring my bookmarks",
    body: "Install for Chrome, Edge or Brave. AI sorts what you have.",
    tone: "dark",
    iconBg: "bg-lime",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" stroke="#111111" {...stroke} aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>,
  },
  {
    to: "/import",
    title: "Upload a bookmarks file",
    body: "Exported from any browser as HTML.",
    tone: "outline",
    iconBg: "bg-ink",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" stroke="#FFFFFF" {...stroke} aria-hidden="true"><path d="M6 3h9l3 3v15H6z" /><path d="M9 12h6M9 16h6" /></svg>,
  },
  {
    to: links.fresh,
    title: "Start fresh",
    body: "Begin with an empty library.",
    tone: "outline",
    iconBg: "bg-white",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" stroke="#111111" {...stroke} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  },
];

/** Any choice (or Skip) completes onboarding, so this screen is shown only once per user. */
export function WelcomeChoices() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function finish(to: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch {
      /* non-blocking: worst case the screen shows once more */
    }
    router.push(to);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={busy}>
      {options.map((o) => {
        const dark = o.tone === "dark";
        return (
          <button
            key={o.title}
            type="button"
            disabled={busy}
            onClick={() => finish(o.to)}
            className={`flex w-full cursor-pointer items-center gap-4 rounded-[24px] px-6 py-5 text-left transition-colors disabled:cursor-wait disabled:opacity-70 ${
              dark ? "bg-ink text-white hover:bg-ink-muted" : "border-[1.5px] border-ink hover:bg-white/60"
            }`}
          >
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${o.iconBg}`}>{o.icon}</span>
            <span className="flex grow flex-col gap-[3px]">
              <span className="text-[19px]">{o.title}</span>
              <span className={`text-sm ${dark ? "text-footer-text" : "text-ink-soft"}`}>{o.body}</span>
            </span>
            <ArrowRight stroke={dark ? "#FFFFFF" : "#111111"} />
          </button>
        );
      })}
    </div>
  );
}

export function SkipButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="cursor-pointer text-sm text-ink-soft hover:text-ink"
      onClick={async () => {
        await fetch("/api/onboarding/complete", { method: "POST" }).catch(() => undefined);
        router.push(links.fresh);
        router.refresh();
      }}
    >
      Skip
    </button>
  );
}
