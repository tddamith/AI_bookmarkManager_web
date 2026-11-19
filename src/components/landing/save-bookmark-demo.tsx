"use client";

import { AnimatePresence, motion } from "motion/react";
import { BookmarkIcon, SparkIcon } from "@/components/ui/icons";
import { DemoShell } from "./demo-shell";
import type { Reg } from "./use-demo-timeline";

/* ───────────────────────── CONFIG (edit copy & timing here) ───────────────────────── */

const TOTAL = 9000;
const STAGE_W = 640;
const STAGE_H = 500;

const steps = [
  { n: "01", title: "Open Tidypin", body: "Click the pin to open the side panel beside any page." },
  { n: "02", title: "Check the summary & folder", body: "AI writes the summary and suggests a folder. Keep it or change it." },
  { n: "03", title: "Save", body: "One click files it away. Or press ⌘ + Shift + S." },
];
const stepStarts = [0, 2000, 5000];
const stepStatic = [1900, 4900, 8000]; // reduced-motion frames

const T = {
  click1: 700, panelIn: 800, card: 1300,
  summaryLabel: 2100, bars: 2300, barEvery: 350,
  chip: 3000, dropdownOpen: 3600, optionHover: 3950, dropdownClose: 4400,
  tags: 4400, tagEvery: 60,
  saveClick: 5700, saveDone: 6100, fly: 6500, counter: 7300, toast: 7400, hint: 7600,
  fadeOut: 8700,
};

const cursorPath = [
  { t: 300, target: "bookmark" },
  { t: 3100, target: "chip" },
  { t: 3950, target: "option" },
  { t: 5100, target: "save" },
] as const;
const clicks = [T.click1, T.dropdownOpen, 4300, T.saveClick];

const FOLDERS = [
  { name: "Dev › Docs", count: 12, grow: "flex-[1.4]" },
  { name: "Design", count: 8, grow: "flex-1" },
  { name: "Reading", count: 5, grow: "flex-1" },
];
const OPTIONS = ["Dev › Docs", "Design", "Reading"];
const TAGS = "#css #layout";

// Card → "Dev › Docs" pill, in panel px (layout is fixed): card centre (144,169) → pill centre (65,373)
const FLY = { x: -79, y: 204 };

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

/* ───────────────────────── Stage (pure function of time) ───────────────────────── */

function Stage({ t, reg }: { t: number; reg: Reg }) {
  const press = (c: number) => t >= c && t < c + 200;
  const panelIn = t >= T.panelIn;
  const saving = t >= T.saveClick + 100 && t < T.saveDone; // spinner ~400ms
  const saved = t >= T.saveDone;
  const flying = t >= T.fly;
  const dropdown = t >= T.dropdownOpen && t < T.dropdownClose;
  const tagText = TAGS.slice(0, Math.floor(clamp((t - T.tags) / T.tagEvery, 0, TAGS.length)));
  const devCount = t >= T.counter ? 13 : 12;

  return (
    <div className="absolute inset-0">
      <div className="absolute overflow-hidden rounded-[28px] border-2 border-ink bg-white" style={{ left: 20, top: 16, width: 600, height: 440 }}>
        <div className="flex h-10 items-center gap-2.5 border-b border-ink bg-[#EEEFF1] px-3.5">
          <div className="flex gap-1.5">{[0, 1, 2].map((i) => (<span key={i} className="size-2.5 rounded-full bg-[#C8CACE]" />))}</div>
          <div className="flex h-6 grow items-center rounded-full bg-white px-3 text-[11px]">developer.mozilla.org/css-grid</div>
          <motion.span
            ref={reg("bookmark")}
            animate={{ scale: press(clicks[0]) ? 0.92 : 1 }}
            transition={{ duration: 0.15 }}
            className="relative flex size-6 items-center justify-center rounded-full bg-ink shadow-[0_0_0_2px_#D4FA1E]"
          >
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-lime"
              initial={{ scale: 1, opacity: 0 }}
              animate={t >= clicks[0] ? { scale: [1, 2.4], opacity: [0.8, 0] } : { scale: 1, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            <BookmarkIcon size={10} fill="#D4FA1E" />
          </motion.span>
        </div>

        <div className="relative flex" style={{ height: 400 }}>
          <div className="flex grow flex-col gap-3 p-7">
            <div className="h-[22px] w-[70%] rounded-md bg-[#E3E4E7]" />
            <div className="h-2.5 w-[92%] rounded bg-[#ECEDEF]" />
            <div className="h-2.5 w-[84%] rounded bg-[#ECEDEF]" />
            <div className="h-2.5 w-[88%] rounded bg-[#ECEDEF]" />
            <div className="mt-2 h-[130px] rounded-[10px] bg-[#F1F2F4]" />
            <div className="h-2.5 w-[80%] rounded bg-[#ECEDEF]" />
            <div className="h-2.5 w-[74%] rounded bg-[#ECEDEF]" />
          </div>

          {/* side panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: panelIn ? 0 : "100%" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute right-0 top-0 h-full border-l border-ink bg-[#F2F2EE]"
            style={{ width: 288 }}
          >
            <div className="absolute inset-x-3.5 top-3.5 h-[34px] rounded-full border-[1.5px] border-ink bg-white" />

            {/* lime card — flies into the Dev › Docs pill on save */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={
                flying
                  ? { opacity: [1, 1, 0], x: FLY.x, y: FLY.y, scale: 0.15 }
                  : t >= T.card
                    ? { opacity: 1, x: 0, y: 0, scale: 1 }
                    : { opacity: 0, x: 0, y: 14, scale: 1 }
              }
              transition={flying ? { duration: 0.8, ease: [0.5, 0, 0.75, 0] } : { duration: 0.4, ease: "easeOut" }}
              className="absolute inset-x-3.5 flex flex-col gap-1.5 rounded-[14px] bg-lime p-3"
              style={{ top: 58, height: 222 }}
            >
              <p className="text-[10px] text-ink-soft">On this page —</p>
              <p className="text-sm leading-[1.15]">CSS Grid: the complete guide</p>
              <div className="flex flex-col gap-[5px] border-t border-ink pt-1.5">
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: t >= T.summaryLabel ? 1 : 0 }} className="flex items-center gap-1 text-[10px] font-semibold">
                  <SparkIcon size={10} fill="#111111" />
                  AI summary
                </motion.p>
                {[95, 82, 88].map((w, i) => (
                  <motion.div
                    key={w}
                    initial={{ width: 0 }}
                    animate={{ width: t >= T.bars + i * T.barEvery ? `${w}%` : 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="h-1.5 rounded-sm bg-[#8FA10C]"
                  />
                ))}
              </div>

              {/* folder chip + dropdown */}
              <div className="relative">
                <motion.div
                  ref={reg("chip")}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: t >= T.chip ? 1 : 0, y: t >= T.chip ? 0 : 6, scale: press(clicks[1]) ? 0.96 : 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex h-[22px] items-center justify-between rounded-full border-[1.5px] border-ink bg-white px-2.5 text-[10px]"
                >
                  <span>Dev › Docs</span>
                  <span aria-hidden="true">▾</span>
                </motion.div>
                <AnimatePresence>
                  {dropdown && (
                    <motion.ul
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-x-0 top-[26px] z-20 m-0 list-none rounded-xl border-[1.5px] border-ink bg-white p-1 text-[10px]"
                    >
                      {OPTIONS.map((o, i) => (
                        <li
                          key={o}
                          ref={i === 0 ? reg("option") : undefined}
                          className={`flex h-[22px] items-center justify-between rounded-lg px-2 transition-colors ${
                            i === 0 && t >= T.optionHover ? "bg-lime" : ""
                          }`}
                        >
                          {o}
                          {i === 0 && <span aria-hidden="true">✓</span>}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              {/* tags */}
              <div className="flex h-[18px] items-center gap-1 text-[10px]">
                {tagText.split(" ").filter(Boolean).map((tag, i) => (
                  <span key={i} className="rounded-full border border-ink px-1.5 leading-4">{tag}</span>
                ))}
              </div>

              <motion.div
                ref={reg("save")}
                animate={{ scale: press(clicks[3]) ? 0.95 : 1 }}
                transition={{ duration: 0.15 }}
                className="mt-auto flex h-[26px] items-center justify-center gap-1.5 rounded-full bg-ink text-[10px] text-white"
              >
                {saving ? (
                  <>
                    <motion.span
                      className="size-2.5 rounded-full border-[1.5px] border-white/40 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }}
                    />
                    Saving
                  </>
                ) : saved ? (
                  <><span aria-hidden="true">✓</span> Saved</>
                ) : (
                  "Save with summary"
                )}
              </motion.div>
            </motion.div>

            {/* folder pills */}
            <div className="absolute inset-x-3.5 flex gap-1.5" style={{ bottom: 14 }}>
              {FOLDERS.map((f, i) => (
                <motion.div
                  key={f.name}
                  animate={{ scale: i === 0 && t >= T.counter && t < T.counter + 300 ? [1, 1.12, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                  className={`flex h-[26px] items-center justify-between rounded-full border-[1.5px] border-ink px-2.5 text-[10px] ${f.grow} ${
                    i === 0 && t >= T.counter ? "bg-lime" : "bg-white"
                  }`}
                >
                  <span className="truncate">{f.name}</span>
                  <span className="tabular-nums">{i === 0 ? devCount : f.count}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* toast */}
      <AnimatePresence>
        {t >= T.toast && t < T.fadeOut && (
          <motion.div
            key="toast"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="absolute flex items-center gap-2.5 rounded-2xl bg-ink px-4 py-3 text-sm text-white"
            style={{ left: 0, bottom: 14, transformOrigin: "left bottom" }}
          >
            <motion.span initial={{ rotate: 0 }} animate={{ rotate: 90 }} transition={{ duration: 0.5, ease: "easeOut" }} className="flex">
              <SparkIcon fill="#D4FA1E" />
            </motion.span>
            Filed to Dev › Docs
          </motion.div>
        )}
      </AnimatePresence>

      {/* keyboard shortcut hint, pulses once */}
      <AnimatePresence>
        {t >= T.hint && t < T.fadeOut && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: 8, scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: [1, 1.12, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute flex items-center gap-1 rounded-xl border-[1.5px] border-ink bg-white px-3 py-2 text-xs"
            style={{ right: 4, bottom: 6 }}
          >
            {["⌘", "Shift", "S"].map((k, i) => (
              <span key={k} className="flex items-center gap-1">
                {i > 0 && <span className="text-ink-muted">+</span>}
                <kbd className="rounded-md border border-ink bg-paper px-1.5 py-0.5 font-sans">{k}</kbd>
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Demo ───────────────────────── */

// scroll progress 0 → ⅓ → ⅔ → 1 maps to these timeline times
const scrubT: [number, number, number, number] = [0, 2000, 5000, 8000];

export function SaveBookmarkDemo() {
  return (
    <DemoShell
      steps={steps}
      total={TOTAL}
      stageW={STAGE_W}
      stageH={STAGE_H}
      stepStarts={stepStarts}
      stepStatic={stepStatic}
      scrubT={scrubT}
      cursorPath={cursorPath}
      clicks={clicks}
      fadeOutAt={T.fadeOut}
      Stage={Stage}
    />
  );
}
