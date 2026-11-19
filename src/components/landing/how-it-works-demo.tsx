"use client";

import { AnimatePresence, motion } from "motion/react";
import { BookmarkIcon, SparkIcon } from "@/components/ui/icons";
import { DemoShell } from "./demo-shell";
import type { Reg } from "./use-demo-timeline";

/* ───────────────────────── CONFIG (edit copy & timing here) ───────────────────────── */

const TOTAL = 12000; // ms, whole loop

/** The 3 step cards. */
const steps = [
  { n: "01", title: "Add Tidypin to your browser", body: "Install the extension and sign up with Google or email. Free, no card." },
  { n: "02", title: "Bring your bookmarks", body: "Import what you already have. AI sorts it into folders and removes duplicates." },
  { n: "03", title: "Browse as usual", body: "Save with one click or Alt + S. Tidypin stays beside the page with ideas." },
];

/** Where the timeline jumps when a step card is clicked, and the "static" frame for reduced motion. */
const stepStart = [0, 2500, 9500];
const stepStatic = [2400, 9400, 11500];

const T = {
  typeStart: 200, typeEvery: 80,
  panelIn: 1700,
  card: 2800, summaryLabel: 3300, bars: 3500, barEvery: 450,
  saveSpin: 4700, saveDone: 5200, toast: 5300,
  mergeRow: 6200, mergeClick: 7200, counter: 7300, counterEnd: 7800, mergeOut: 7950,
  sortRow: 7900, folders: 8300, moveClick: 8800, chipEvery: 60, chipFly: 450,
  find: 9500, searchClick: 9800, typeFind: 9950, results: 10800, highlight: 11050,
  fadeOut: 11700,
};

/** Fake cursor path: it moves to `target` at time `t` (ms). */
const cursorPath = [
  { t: 800, target: "bookmark" },
  { t: 3900, target: "save" },
  { t: 6500, target: "merge" },
  { t: 8400, target: "move" },
  { t: 9400, target: "search" },
] as const;
const clicks = [1600, 4700, 7200, 8800, 9800];

const URL_TEXT = "tidypin.app";
const QUERY = "grid layout";
const FOLDERS = ["Dev", "Design", "Reading"];
const RESULTS = [
  { title: "CSS Grid: the complete guide", folder: "Dev › Docs" },
  { title: "Grid vs Flexbox — when to use which", folder: "Dev › Articles" },
  { title: "Tailwind grid layout recipes", folder: "Design" },
];

const STAGE_W = 640;
const STAGE_H = 500;

/* ───────────────────────── helpers ───────────────────────── */

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);

/* ───────────────────────── Stage (pure function of time `t`) ───────────────────────── */

function Stage({ t, reg }: { t: number; reg: Reg }) {
  const typed = URL_TEXT.slice(0, Math.floor(clamp((t - T.typeStart) / T.typeEvery, 0, URL_TEXT.length)));
  const typing = t >= T.typeStart && typed.length < URL_TEXT.length;
  const bookmarkPressed = t >= clicks[0] && t < clicks[0] + 220;
  const ring = t >= clicks[0];
  const panelIn = t >= T.panelIn;
  const find = t >= T.find;

  const saving = t >= T.saveSpin && t < T.saveDone;
  const saved = t >= T.saveDone;
  const savePressed = t >= clicks[1] && t < clicks[1] + 200;

  const mergeProg = prog(t, T.counter, T.counterEnd);
  const mergeCount = Math.round(4 * (1 - mergeProg));
  const merged = t >= T.mergeClick;
  const mergePressed = t >= clicks[2] && t < clicks[2] + 200;

  const flying = t >= T.moveClick;
  const landed = (j: number) => t >= T.moveClick + j * T.chipEvery + T.chipFly;
  const landedCount = [0, 1, 2, 3, 4, 5].filter(landed).length;
  const folderCount = (f: number) => [0, 1, 2, 3, 4, 5].filter((j) => j % 3 === f && landed(j)).length;
  const movePressed = t >= clicks[3] && t < clicks[3] + 200;
  const sortDone = landedCount === 6;

  const searchFocused = t >= clicks[4];
  const query = QUERY.slice(0, Math.floor(clamp((t - T.typeFind) / T.typeEvery, 0, QUERY.length)));
  const showResults = t >= T.results;

  // folder-pill centres relative to the Move button (panel layout is fixed, see ROW constants)
  const chipTargets = [
    { x: -197, y: -38 },
    { x: -108, y: -38 },
    { x: -20, y: -38 },
  ];

  return (
    <div className="absolute inset-0">
      {/* browser window */}
      <div
        className="absolute overflow-hidden rounded-[28px] border-2 border-ink bg-white"
        style={{ left: 20, top: 16, width: 600, height: 440 }}
      >
        {/* top bar */}
        <div className="flex h-10 items-center gap-2.5 border-b border-ink bg-[#EEEFF1] px-3.5">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2.5 rounded-full bg-[#C8CACE]" />
            ))}
          </div>
          <div className="flex h-6 grow items-center overflow-hidden rounded-full bg-white px-3 text-[11px] text-ink">
            {typed}
            {typing && <span className="ml-px inline-block h-3 w-px bg-ink" />}
          </div>
          <motion.span
            ref={reg("bookmark")}
            animate={{ scale: bookmarkPressed ? 0.92 : 1 }}
            transition={{ duration: 0.15 }}
            className="relative flex size-6 items-center justify-center rounded-full bg-ink shadow-[0_0_0_2px_#D4FA1E]"
          >
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-lime"
              initial={{ scale: 1, opacity: 0 }}
              animate={ring ? { scale: [1, 2.4], opacity: [0.8, 0] } : { scale: 1, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            <BookmarkIcon size={10} fill="#D4FA1E" />
          </motion.span>
        </div>

        <div className="relative flex" style={{ height: 400 }}>
          {/* fake article */}
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
            className="absolute right-0 top-0 flex h-full flex-col gap-2.5 border-l border-ink bg-[#F2F2EE] p-3.5"
            style={{ width: 288 }}
          >
            {/* search pill */}
            <motion.div
              ref={reg("search")}
              animate={{ scale: t >= clicks[4] && t < clicks[4] + 200 ? 0.97 : 1 }}
              transition={{ duration: 0.15 }}
              className={`flex h-[34px] shrink-0 items-center rounded-full border-[1.5px] border-ink bg-white px-3.5 text-[12px] ${
                searchFocused ? "shadow-[0_0_0_3px_#D4FA1E]" : ""
              }`}
            >
              {find ? query : ""}
              {find && searchFocused && query.length < QUERY.length && <span className="ml-px inline-block h-3.5 w-px bg-ink" />}
            </motion.div>

            <AnimatePresence mode="wait" initial={false}>
              {!find ? (
                <motion.div
                  key="main"
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-2.5"
                >
                  {/* lime card */}
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={t >= T.card ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex h-[172px] flex-col gap-2 rounded-[14px] bg-lime p-3"
                  >
                    <p className="text-[10px] text-ink-soft">On this page —</p>
                    <p className="text-sm leading-[1.15]">CSS Grid: the complete guide</p>
                    <div className="flex flex-col gap-[5px] border-t border-ink pt-1.5">
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: t >= T.summaryLabel ? 1 : 0 }}
                        className="flex items-center gap-1 text-[10px] font-semibold"
                      >
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
                    <motion.div
                      ref={reg("save")}
                      animate={{ scale: savePressed ? 0.95 : 1 }}
                      transition={{ duration: 0.15 }}
                      className="mt-auto flex h-[26px] items-center justify-center gap-1.5 rounded-full bg-ink text-[10px] text-white"
                    >
                      {saving ? (
                        <>
                          <motion.span
                            className="size-2.5 rounded-full border-[1.5px] border-white/40 border-t-white"
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                          />
                          Saving
                        </>
                      ) : saved ? (
                        <>
                          <span aria-hidden="true">✓</span> Saved
                        </>
                      ) : (
                        "Save with summary"
                      )}
                    </motion.div>
                  </motion.div>

                  {/* rows: fixed slots, so nothing shifts */}
                  <div className="relative" style={{ height: 124 }}>
                    {/* Merge row (slot y=0) */}
                    <AnimatePresence>
                      {t >= T.mergeRow && t < T.mergeOut && (
                        <motion.div
                          key="merge"
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                          className="absolute inset-x-0 top-0 flex h-[34px] items-center justify-between border-t border-ink text-[10px]"
                        >
                          <span className="relative mr-2 h-[14px] w-[34px] shrink-0">
                            {[0, 1, 2, 3].map((i) => (
                              <motion.span
                                key={i}
                                className="absolute top-0 h-[14px] w-[18px] rounded-[4px] border border-ink bg-white"
                                animate={{
                                  left: merged ? 8 : i * 5,
                                  opacity: merged && i > 0 ? 0 : 1,
                                }}
                                transition={{ duration: 0.35, delay: merged ? i * 0.04 : 0 }}
                              />
                            ))}
                          </span>
                          <span className="grow">
                            Merge <span className="tabular-nums">{mergeCount}</span> duplicates
                          </span>
                          <motion.span
                            ref={reg("merge")}
                            animate={{ scale: mergePressed ? 0.92 : 1 }}
                            className="rounded-lg bg-ink px-2 py-0.5 text-white"
                          >
                            Merge
                          </motion.span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Folder pills (slot y=42) */}
                    <div className="absolute inset-x-0 flex gap-1.5" style={{ top: 42 }}>
                      {FOLDERS.map((f, i) => (
                        <motion.div
                          key={f}
                          initial={{ opacity: 0, y: 8 }}
                          animate={t >= T.folders ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                          transition={{ duration: 0.3, delay: i * 0.08 }}
                          className="flex h-[26px] flex-1 items-center justify-between rounded-full border-[1.5px] border-ink bg-white px-2.5 text-[10px]"
                        >
                          {f}
                          <span className="tabular-nums">{folderCount(i)}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Sort row (slot y=76) */}
                    <motion.div
                      initial={{ opacity: 0, x: 24 }}
                      animate={t >= T.sortRow ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="absolute inset-x-0 flex h-[34px] items-center justify-between border-t border-ink text-[10px]"
                      style={{ top: 76 }}
                    >
                      <span>
                        {sortDone ? "All sorted" : <>Sort <span className="tabular-nums">{6 - landedCount}</span> unsorted</>}
                      </span>
                      <motion.span
                        ref={reg("move")}
                        animate={{ scale: movePressed ? 0.92 : 1 }}
                        className="rounded-lg bg-ink px-2 py-0.5 text-white"
                      >
                        {sortDone ? "Done ✓" : "Move"}
                      </motion.span>
                    </motion.div>

                    {/* chips flying from Move into the folder pills */}
                    {[0, 1, 2, 3, 4, 5].map((j) => (
                      <motion.span
                        key={j}
                        aria-hidden="true"
                        className="pointer-events-none absolute h-2.5 w-3.5 rounded-[3px] border border-ink bg-lime"
                        style={{ left: 238 - 7, top: 93 - 5 }}
                        initial={{ x: 0, y: 0, opacity: 0 }}
                        animate={
                          flying
                            ? {
                                x: chipTargets[j % 3].x + (j < 3 ? -6 : 6),
                                y: chipTargets[j % 3].y,
                                opacity: [0, 1, 1, 0],
                                scale: [1, 1, 1, 0.6],
                              }
                            : { x: 0, y: 0, opacity: 0 }
                        }
                        transition={{ duration: T.chipFly / 1000, delay: (j * T.chipEvery) / 1000, ease: "easeInOut" }}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.ul
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="m-0 flex list-none flex-col p-0"
                >
                  <AnimatePresence>
                    {showResults &&
                      RESULTS.map((r, i) => (
                        <motion.li
                          key={r.title}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.12 }}
                          className="border-t border-ink py-2.5"
                        >
                          <p className="relative inline text-[12px] leading-snug">
                            {r.title}
                            {i === 0 && (
                              <motion.span
                                className="absolute inset-x-0 -bottom-0.5 h-[3px] origin-left bg-lime"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: t >= T.highlight ? 1 : 0 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                              />
                            )}
                          </p>
                          <p className="mt-1 text-[10px] text-ink-muted">{r.folder}</p>
                        </motion.li>
                      ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* toast over the window edge */}
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
            <motion.span
              initial={{ rotate: 0 }}
              animate={{ rotate: 90 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex"
            >
              <SparkIcon fill="#D4FA1E" />
            </motion.span>
            Filed to Dev › Docs
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Demo ───────────────────────── */

// scroll progress 0 → ⅓ → ⅔ → 1 maps to these timeline times (step 1 | step 2 | step 3)
const scrubT: [number, number, number, number] = [0, 2500, 9500, 11500];

export function HowItWorksDemo() {
  return (
    <DemoShell
      steps={steps}
      total={TOTAL}
      stageW={STAGE_W}
      stageH={STAGE_H}
      stepStarts={stepStart}
      stepStatic={stepStatic}
      scrubT={scrubT}
      cursorPath={cursorPath}
      clicks={clicks}
      fadeOutAt={T.fadeOut}
      Stage={Stage}
    />
  );
}
