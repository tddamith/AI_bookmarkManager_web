"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** One menu entry fading/sliding in (320ms, 40ms stagger). With `enter` false it renders in place, no animation. */
export function Enter({ i, enter, className, children }: { i: number; enter: boolean; className?: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={enter ? { opacity: 0, y: reduced ? 0 : 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0.12 } : { duration: 0.32, ease: EASE, delay: i * 0.04 }}
    >
      {children}
    </motion.div>
  );
}

/** Counts up from 0 once, the first time it appears with `animate`; later value changes show instantly. */
export function Count({ value, animate }: { value: number; animate: boolean }) {
  const reduced = useReducedMotion();
  const run = animate && !reduced;
  const [shown, setShown] = useState(run ? 0 : value);
  const played = useRef(false);

  useEffect(() => {
    if (!run || played.current || value === 0) { if (!run || played.current) setShown(value); return; }
    played.current = true;
    const t0 = performance.now();
    const dur = 400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, run]);

  return <>{shown.toLocaleString("en-US")}</>;
}
