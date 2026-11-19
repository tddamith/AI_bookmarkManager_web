"use client";

import { motion, MotionConfig, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useRef, useState, type ComponentType } from "react";
import { useMotionPrefs } from "@/components/motion/use-motion-prefs";
import { parallax as cfg } from "@/lib/parallax-config";
import { useDemoTimeline, type Reg } from "./use-demo-timeline";

type Step = { n: string; title: string; body: string };

type Props = {
  steps: Step[];
  total: number;
  stageW: number;
  stageH: number;
  stepStarts: number[];
  stepStatic: number[];
  /** timeline time (ms) at scroll progress 0, ⅓, ⅔, 1 — scroll drives the scene on desktop */
  scrubT: [number, number, number, number];
  cursorPath: readonly { t: number; target: string }[];
  clicks: number[];
  fadeOutAt: number;
  Stage: ComponentType<{ t: number; reg: Reg }>;
};

const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/**
 * Steps on the left + demo window on the right.
 * ≥1024px: window is sticky, scroll progress through the steps scrubs the timeline (both ways) and tilts the window.
 * <1024px: steps stack above, timer autoplay loop (pauses off-screen / on hover).
 */
export function DemoShell({ steps, total, stageW, stageH, stepStarts, stepStatic, scrubT, cursorPath, clicks, fadeOutAt, Stage }: Props) {
  const { desktop, reduced } = useMotionPrefs();
  const scrub = desktop && !reduced;

  const trackRef = useRef<HTMLDivElement>(null);
  const stepEls = useRef<(HTMLLIElement | null)[]>([]);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start 60%", "end 60%"] });
  const [scrollT, setScrollT] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const q = Math.min(1, Math.max(0, p)) * 3;
    const i = Math.min(2, Math.floor(q));
    setScrollT(Math.floor(lerp(scrubT[i], scrubT[i + 1], q - i) / 20) * 20);
  });

  const tilt = useTransform(scrollYProgress, [0, 0.5, 1], [cfg.demoTilt, 0, -cfg.demoTilt]);

  const { t, loop, scale, cursor, wp, activeStep, goToStep, reg, setWrap, setStage, setHover } = useDemoTimeline({
    total,
    stageW,
    stepStarts,
    stepStatic,
    cursorPath,
    externalT: scrub ? scrollT : null,
  });

  const pressed = clicks.some((c) => t >= c && t < c + 220);
  const fadeOut = t >= fadeOutAt;

  const onStep = (i: number) => {
    if (scrub) stepEls.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
    else goToStep(i);
  };

  return (
    <MotionConfig transition={reduced ? { duration: 0 } : undefined}>
      <div ref={trackRef} className="flex flex-wrap items-start gap-10 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-14">
        <ol className="m-0 flex w-full list-none flex-col gap-3 p-0 lg:gap-0">
          {steps.map((s, i) => {
            const active = i === activeStep;
            return (
              <li key={s.n} ref={(el) => { stepEls.current[i] = el; }} className="lg:flex lg:min-h-[70vh] lg:items-center">
                <button
                  type="button"
                  onClick={() => onStep(i)}
                  aria-current={active ? "step" : undefined}
                  className={`flex w-full cursor-pointer flex-col gap-2 rounded-[20px] border-2 p-5 text-left transition-all duration-300 ${
                    active ? "border-ink bg-white opacity-100" : "border-transparent bg-white/40 opacity-50 hover:opacity-80"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className={`size-2.5 rounded-full transition-colors ${active ? "bg-lime ring-1 ring-ink" : "bg-ink/30"}`} />
                    {s.n}
                  </span>
                  <span className="text-[22px] font-normal leading-tight tracking-[-0.02em]">{s.title}</span>
                  <span className="text-[15px] leading-normal text-ink-muted">{s.body}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div
          className="w-full min-w-0 lg:sticky lg:top-24 lg:self-start"
          aria-hidden="true"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <div ref={setWrap} className="w-full">
            <motion.div
              className="overflow-hidden rounded-card bg-lime"
              style={{ height: stageH * scale, willChange: "transform", transformPerspective: cfg.mouse.perspective, rotateX: scrub ? tilt : 0 }}
            >
              <div ref={setStage} className="relative origin-top-left" style={{ width: stageW, height: stageH, transform: `scale(${scale})` }}>
                <motion.div key={loop} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: fadeOut ? 0 : 1 }} transition={{ duration: 0.3 }}>
                  <Stage t={t} reg={reg} />
                </motion.div>
                <motion.svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute left-0 top-0 z-30 hidden md:block"
                  style={{ marginLeft: -4, marginTop: -3 }}
                  animate={{ x: cursor.x, y: cursor.y, opacity: wp >= 0 && !fadeOut && !reduced ? 1 : 0, scale: pressed ? 0.85 : 1 }}
                  transition={{ x: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }, y: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }, scale: { duration: 0.12 }, opacity: { duration: 0.2 } }}
                >
                  <path d="M4 3l16 7-7 2-2 7z" fill="#111111" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
                </motion.svg>
              </div>
            </motion.div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sand">
              <div className="h-full origin-left rounded-full bg-ink transition-transform duration-100 ease-linear" style={{ transform: `scaleX(${Math.min(1, t / total)})` }} />
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
