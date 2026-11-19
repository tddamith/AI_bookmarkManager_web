"use client";

import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, type RefObject } from "react";
import { useMotionPrefs } from "@/components/motion/use-motion-prefs";
import { ButtonLink } from "@/components/ui/button";
import { ArrowDown, BookmarkIcon, SparkIcon } from "@/components/ui/icons";
import { container } from "@/components/ui/section-heading";
import { parallax as cfg } from "@/lib/parallax-config";
import { links, siteConfig } from "@/lib/site";

/** Pointer position relative to the hero centre, -1…1, sprung; eases back to 0 on leave. */
function usePointer(ref: RefObject<HTMLElement | null>, enabled: boolean) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const x = useSpring(rx, cfg.spring);
  const y = useSpring(ry, cfg.spring);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      rx.set(Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)));
      ry.set(Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2)));
    };
    const leave = () => {
      rx.set(0);
      ry.set(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      leave();
    };
  }, [ref, enabled, rx, ry]);
  return { x, y };
}

const layer = { willChange: "transform" } as const;

const chips = [
  { name: "Dev", bg: "bg-lime", pos: "right-[-6px] top-[64px]", rot: 1 },
  { name: "Design", bg: "bg-sky", pos: "right-[22%] bottom-[-34px]", rot: -1 },
  { name: "Reading", bg: "bg-sand", pos: "left-[14%] top-[-20px]", rot: 1 },
];

export function HeroBanner() {
  const ref = useRef<HTMLElement>(null);
  const { mouse, factor } = useMotionPrefs();
  const m = usePointer(ref, mouse);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const s = cfg.heroScroll;
  const f = factor;

  // scroll parallax (pre-scaled by `factor`: 0 for reduced motion, 0.4 on mobile)
  const textY = useTransform(p, [0, 1], [0, s.text.y * f]);
  const textOpacity = useTransform(p, [0, 1], [1, f ? s.text.opacity : 1]);
  const winY = useTransform(p, [0, 1], [0, s.window.y * f]);
  const winScale = useTransform(p, [0, 1], [1, f ? s.window.scale : 1]);
  const toastY = useTransform(p, [0, 1], [0, s.toast.y * f]);
  const chipsY = useTransform(p, [0, 1], [0, s.chips.y * f]);
  const chipRotA = useTransform(p, [0, 1], [0, s.chips.rotate * f]);
  const chipRotB = useTransform(p, [0, 1], [0, -s.chips.rotate * f]);
  const blobY = useTransform(p, [0, 1], [0, s.blob.y * f]);

  // mouse parallax per depth layer
  const mm = cfg.mouse;
  const blobX = useTransform(m.x, [-1, 1], [-mm.blob, mm.blob]);
  const blobMY = useTransform(m.y, [-1, 1], [-mm.blob, mm.blob]);
  const winX = useTransform(m.x, [-1, 1], [-mm.window, mm.window]);
  const winMY = useTransform(m.y, [-1, 1], [-mm.window, mm.window]);
  const rotY = useTransform(m.x, [-1, 1], [-mm.tilt, mm.tilt]);
  const rotX = useTransform(m.y, [-1, 1], [mm.tilt, -mm.tilt]);
  const cardX = useTransform(m.x, [-1, 1], [-mm.card, mm.card]);
  const cardY = useTransform(m.y, [-1, 1], [-mm.card, mm.card]);
  const flX = useTransform(m.x, [-1, 1], [-mm.floaters, mm.floaters]);
  const flY = useTransform(m.y, [-1, 1], [-mm.floaters, mm.floaters]);

  return (
    <section ref={ref} aria-labelledby="hero-title" className={`${container} relative flex flex-wrap items-center gap-14 pb-[88px] pt-[72px]`}>
      {/* copy: scroll parallax only (readable text) */}
      <motion.div style={{ ...layer, y: textY, opacity: textOpacity }} className="relative z-10 flex min-w-0 flex-[1_1_440px] flex-col gap-6">
        <p className="hero-in text-sm text-ink-soft" style={{ "--d": 0 } as React.CSSProperties}>
          AI bookmark manager —<br />
          for Chrome, Edge and Brave
        </p>
        <h1
          id="hero-title"
          style={{ "--d": 1 } as React.CSSProperties}
          className="hero-in text-[clamp(48px,7vw,88px)] font-normal leading-[0.98] tracking-[-0.045em]"
        >
          {siteConfig.tagline}
        </h1>
        <p style={{ "--d": 2 } as React.CSSProperties} className="hero-in max-w-[520px] text-[19px] leading-normal text-ink-soft">
          Save any page in one click. AI picks the folder, writes a summary, cleans up duplicates and dead links, and
          shows what you already saved — right beside the page you&apos;re on.
        </p>
        <div style={{ "--d": 3 } as React.CSSProperties} className="hero-in flex flex-wrap gap-3">
          <ButtonLink href={links.install} size="xl">Add to browser — it&apos;s free</ButtonLink>
          <a
            href="#how"
            className="nudge inline-flex h-14 items-center gap-2.5 rounded-pill border-[1.5px] border-ink pl-6 pr-4 text-[17px] no-underline hover:bg-white"
          >
            See how it works
            <span className="flex size-7 items-center justify-center rounded-full bg-ink">
              <ArrowDown />
            </span>
          </a>
        </div>
        <p style={{ "--d": 4 } as React.CSSProperties} className="hero-in text-[13px] text-ink-soft">
          Free forever plan · No card needed · Imports your existing bookmarks
        </p>
      </motion.div>

      {/* depth layers */}
      <div className="relative min-w-0 flex-[1_1_520px]" style={{ perspective: cfg.mouse.perspective }}>
        {/* L0 — lime-deep blob, moves slowest and opposite */}
        <motion.div aria-hidden="true" style={{ ...layer, y: blobY }} className="pointer-events-none absolute -right-10 -top-8 -z-0 size-[420px] max-w-full">
          <motion.div style={{ ...layer, x: blobX, y: blobMY }} className="size-full rounded-full bg-lime-deep" />
        </motion.div>

        <div className="mock-in relative">
          {/* L1 — browser window (+ L2 card share its scroll travel) */}
          <motion.div style={{ ...layer, y: winY, scale: winScale }} className="relative">
            <motion.div
              style={{ ...layer, x: winX, y: winMY, rotateX: rotX, rotateY: rotY, transformPerspective: cfg.mouse.perspective }}
              role="img"
              aria-label="Tidypin side panel open beside a web page, showing an AI summary and a Save button"
              className="overflow-hidden rounded-panel border-[1.5px] border-ink bg-white"
            >
              <div className="flex h-10 items-center gap-2.5 border-b border-ink bg-[#EEEFF1] px-3.5">
                <div className="flex gap-1.5">{[0, 1, 2].map((i) => (<span key={i} className="size-2.5 rounded-full bg-[#C8CACE]" />))}</div>
                <div className="h-6 grow rounded-full bg-white" />
                <span className="flex size-6 items-center justify-center rounded-full bg-ink shadow-[0_0_0_2px_#D4FA1E]">
                  <BookmarkIcon size={10} fill="#D4FA1E" />
                </span>
              </div>
              <div className="flex h-[400px]">
                <div className="flex grow flex-col gap-3 p-7" aria-hidden="true">
                  <div className="h-[22px] w-[70%] rounded-md bg-[#E3E4E7]" />
                  <div className="h-2.5 w-[92%] rounded bg-[#ECEDEF]" />
                  <div className="h-2.5 w-[84%] rounded bg-[#ECEDEF]" />
                  <div className="h-2.5 w-[88%] rounded bg-[#ECEDEF]" />
                  <div className="mt-2 h-[130px] rounded-[10px] bg-[#F1F2F4]" />
                  <div className="h-2.5 w-[80%] rounded bg-[#ECEDEF]" />
                  <div className="h-2.5 w-[74%] rounded bg-[#ECEDEF]" />
                </div>
                <div className="flex w-[46%] shrink-0 flex-col gap-2.5 border-l border-ink bg-paper p-3.5">
                  <div className="h-[30px] shrink-0 rounded-full border-[1.5px] border-ink" />
                  <div className="h-[178px] shrink-0" aria-hidden="true" />
                  <div className="flex flex-col gap-1.5 text-[10px]">
                    {[["Merge 4 duplicates", "Merge"], ["Sort 6 unsorted", "Move"]].map(([label, action]) => (
                      <div key={label} className="flex h-6 items-center justify-between border-t border-ink">
                        <span>{label}</span>
                        <span className="rounded-lg bg-ink px-2 py-0.5 text-white">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* L2 — lime card floats above the window panel */}
            <motion.div
              aria-hidden="true"
              style={{ ...layer, x: cardX, y: cardY }}
              className="absolute right-3.5 top-[94px] flex h-[178px] w-[calc(46%-28px)] flex-col gap-2 rounded-[14px] bg-lime p-3"
            >
              <p className="text-[10px] text-ink-soft">On this page —</p>
              <p className="text-sm leading-[1.15]">CSS Grid: the complete guide</p>
              <div className="flex flex-col gap-[5px] border-t border-ink pt-1.5">
                <p className="text-[10px] font-semibold">AI summary</p>
                <div className="h-1.5 w-[95%] rounded-sm bg-ink/35" />
                <div className="h-1.5 w-[82%] rounded-sm bg-ink/35" />
                <div className="h-1.5 w-[88%] rounded-sm bg-ink/35" />
              </div>
              <div className="mt-auto flex h-[26px] items-center justify-center rounded-full bg-ink text-[10px] text-white">Save with summary</div>
            </motion.div>
          </motion.div>

          {/* L3 — toast (fastest scroll) */}
          <motion.div aria-hidden="true" style={{ ...layer, y: toastY }} className="absolute -bottom-7 left-0 lg:-left-6">
            <motion.div style={{ ...layer, x: flX, y: flY }}>
              <div className="float flex items-center gap-2.5 rounded-2xl bg-ink px-4 py-3 text-sm text-white">
                <SparkIcon fill="#D4FA1E" />
                Filed to Dev › Docs
              </div>
            </motion.div>
          </motion.div>

          {/* L3 — floating folder chips */}
          {chips.map((c) => (
            <motion.div
              key={c.name}
              aria-hidden="true"
              style={{ ...layer, y: chipsY, rotate: c.rot > 0 ? chipRotA : chipRotB }}
              className={`absolute ${c.pos}`}
            >
              <motion.div style={{ ...layer, x: flX, y: flY }}>
                <span className={`flex h-9 items-center gap-2 rounded-full border-[1.5px] border-ink px-4 text-sm ${c.bg}`}>
                  <BookmarkIcon size={11} fill="#111111" />
                  {c.name}
                </span>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
