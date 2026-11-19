import { parallax as cfg } from "@/lib/parallax-config";
import { BandDecor } from "@/components/motion/band-decor";
import { ParallaxLayer } from "@/components/motion/parallax-layer";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { container } from "@/components/ui/section-heading";
import { links } from "@/lib/site";

const points = [
  "Dashboard of your interests and habits",
  "Search, folders and AI summaries in one view",
  "Synced with the popup and side panel",
];

const folders = [
  ["Dev", "bg-lime"],
  ["Design", "bg-sky"],
  ["Travel", "bg-sand"],
] as const;

const stats = [
  ["12", "saved"],
  ["146", "opened"],
  ["5", "read later"],
];

function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#D4FA1E" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#111111" strokeWidth="2" />
    </svg>
  );
}

export function Portal() {
  return (
    <section id="portal" aria-labelledby="portal-title" className="relative overflow-x-clip border-t border-ink bg-ink text-white">
      <BandDecor tone="lime" preset="b" />
      <div className={`${container} relative flex flex-wrap items-center gap-14 py-24`}>
        <Reveal className="flex min-w-0 flex-[1_1_400px] flex-col gap-5">
          <p className="text-sm text-footer-text">Web portal —<br />Your library on any computer</p>
          <h2 id="portal-title" className="text-[clamp(36px,4.5vw,56px)] font-normal leading-[1.02] tracking-[-0.035em]">
            Your bookmarks, on the big screen.
          </h2>
          <p className="max-w-[460px] text-lg leading-normal text-footer-text">
            Sign in at tidypin.com to sort folders, read summaries and see what you&apos;ve been into
            this week — no extension needed.
          </p>
          <ul className="m-0 flex max-w-[460px] list-none flex-col border-b border-line-dark p-0">
            {points.map((p) => (
              <li key={p} className="flex h-[50px] items-center gap-3 border-t border-line-dark text-base">
                <Check />
                {p}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <ButtonLink href={links.signup} variant="accent" size="xl" className="gap-2.5">
              Sign up free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </ButtonLink>
            <a
              href={links.signin}
              className="inline-flex h-14 items-center rounded-pill border-[1.5px] border-white px-[26px] text-[17px] text-white no-underline hover:bg-white/10"
            >
              Sign in
            </a>
          </div>
        </Reveal>

        <ParallaxLayer speed={cfg.mockSpeed} className="min-w-0 flex-[1_1_520px]">
          <div
            role="img"
            aria-label="Preview of the Tidypin web portal dashboard with folders, interest bars and AI suggestions"
            className="overflow-hidden rounded-panel border border-paper bg-paper text-ink"
          >
            <div className="flex h-10 items-center gap-2.5 border-b border-ink px-3.5">
              <span className="flex size-5 items-center justify-center rounded-full bg-ink">
                <svg width="8" height="8" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" fill="#D4FA1E" /></svg>
              </span>
              <span className="text-[9px] font-semibold tracking-[0.06em]">TIDYPIN</span>
              <span className="ml-6 h-[22px] max-w-[220px] grow rounded-full border border-ink bg-white" />
            </div>
            <div className="flex h-[340px]">
              <div className="flex w-[120px] shrink-0 flex-col gap-1.5 border-r border-ink px-2.5 py-3.5 text-[10px]">
                <span className="flex h-[22px] items-center rounded-full bg-ink px-2 text-white">Dashboard</span>
                <span className="px-2 py-1">All bookmarks</span>
                <span className="px-2 py-1">Read later</span>
                <span className="px-2 pb-0.5 pt-2 text-ink-muted">Folders —</span>
                {folders.map(([name, bg]) => (
                  <span key={name} className="flex items-center gap-1.5 px-2 py-[3px]">
                    <span className={`h-[7px] w-[9px] rounded-sm border border-ink ${bg}`} />
                    {name}
                  </span>
                ))}
              </div>
              <div className="flex min-w-0 grow flex-col gap-3 p-4">
                <p className="text-xl tracking-[-0.03em]">Your week in bookmarks</p>
                <div className="grid grid-cols-3 border-y border-ink">
                  {stats.map(([n, l], i) => (
                    <div key={l} className={`py-2 ${i ? "border-l border-ink pl-2" : ""}`}>
                      <p className="text-lg">{n}</p>
                      <p className="text-[9px] text-ink-muted">{l}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grow grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1.5 rounded-xl bg-white p-2.5">
                    <p className="text-[9px]">What you&apos;re into —</p>
                    <div className="box-border h-[7px] w-full rounded bg-lime ring-1 ring-ink" />
                    <div className="h-[7px] w-[64%] rounded bg-ink" />
                    <div className="h-[7px] w-[42%] rounded bg-ink" />
                    <div className="h-[7px] w-[32%] rounded bg-ink" />
                  </div>
                  <div className="flex flex-col gap-1.5 rounded-xl bg-lime p-2.5">
                    <p className="text-[9px]">AI suggests —</p>
                    {[["Make a CSS collection", "Create"], ["Group Japan saves", "Group"]].map(([t, a]) => (
                      <div key={t} className="flex h-[22px] items-center justify-between border-t border-ink text-[9px]">
                        <span>{t}</span>
                        <span className="rounded-md bg-ink px-1.5 py-0.5 text-white">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ParallaxLayer>
      </div>
    </section>
  );
}
