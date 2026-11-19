"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const getReduced = () => window.matchMedia(REDUCED).matches;

export type Reg = (key: string) => (el: HTMLElement | null) => void;

type Options = {
  total: number;
  stageW: number;
  /** timeline position where each step begins (also where a step click jumps to) */
  stepStarts: number[];
  /** static frame shown per step under prefers-reduced-motion */
  stepStatic: number[];
  /** the fake cursor moves to the element registered as `target` at time `t` */
  cursorPath: readonly { t: number; target: string }[];
  /** when set (scroll-scrub mode) it replaces the autoplay clock */
  externalT?: number | null;
};

/**
 * Shared engine for the landing-page demos: a pausable master clock (plays only while in
 * view, pauses on hover), width-fit scaling, fake-cursor tracking and reduced-motion frames.
 * The visuals are a pure function of `t`.
 */
export function useDemoTimeline({ total, stageW, stepStarts, stepStatic, cursorPath, externalT = null }: Options) {
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, () => false);
  const [clock, setClock] = useState(0);
  const [staticT, setStaticT] = useState(stepStatic[0]);
  const [loop, setLoop] = useState(0);
  const [inView, setInView] = useState(false);
  const [hover, setHover] = useState(false);
  const [scale, setScale] = useState(1);
  const [cursor, setCursor] = useState({ x: stageW / 2, y: 480 });

  const tRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const targets = useRef<Record<string, HTMLElement | null>>({});

  const t = reduced ? staticT : (externalT ?? clock);
  const running = inView && !hover && !reduced && externalT == null;

  // callback refs (not ref objects) so consumers never touch `.current` during render
  const setWrap = useCallback((el: HTMLDivElement | null) => {
    wrapRef.current = el;
  }, []);
  const setStage = useCallback((el: HTMLDivElement | null) => {
    stageRef.current = el;
  }, []);

  const reg = useCallback<Reg>((key) => (el) => {
    targets.current[key] = el;
  }, []);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      tRef.current += Math.min(now - last, 64);
      last = now;
      if (tRef.current >= total) {
        tRef.current -= total;
        setLoop((l) => l + 1);
      }
      setClock(Math.floor(tRef.current / 40) * 40);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, total]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / stageW)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [stageW]);

  const wp = useMemo(() => {
    let idx = -1;
    cursorPath.forEach((w, i) => {
      if (t >= w.t) idx = i;
    });
    return idx;
  }, [t, cursorPath]);

  useEffect(() => {
    if (wp < 0) return;
    const measure = () => {
      const stage = stageRef.current;
      const el = targets.current[cursorPath[wp].target];
      if (!stage || !el) return;
      const s = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setCursor({ x: (r.left + r.width / 2 - s.left) / scale, y: (r.top + r.height / 2 - s.top) / scale });
    };
    const a = setTimeout(measure, 40);
    const b = setTimeout(measure, 520); // again after entrance animations settle
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [wp, scale, loop, cursorPath]);

  let activeStep = 0;
  stepStarts.forEach((s, i) => {
    if (t >= s) activeStep = i;
  });

  const goToStep = (i: number) => {
    tRef.current = stepStarts[i];
    setClock(stepStarts[i]);
    setStaticT(stepStatic[i]);
    setLoop((l) => l + 1);
  };

  return { t, loop, reduced, scale, cursor, wp, activeStep, goToStep, reg, setWrap, setStage, setHover };
}
