"use client";

import { useSyncExternalStore } from "react";
import { parallax } from "@/lib/parallax-config";

const QUERIES = {
  reduced: "(prefers-reduced-motion: reduce)",
  mobile: "(max-width: 767px)",
  desktop: "(min-width: 1024px)",
  pointer: "(min-width: 1024px) and (hover: hover) and (pointer: fine)",
} as const;

function store(query: string) {
  return {
    subscribe(cb: () => void) {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    get: () => window.matchMedia(query).matches,
  };
}
const stores = {
  reduced: store(QUERIES.reduced),
  mobile: store(QUERIES.mobile),
  desktop: store(QUERIES.desktop),
  pointer: store(QUERIES.pointer),
};
const server = () => false;

export function useMotionPrefs() {
  const reduced = useSyncExternalStore(stores.reduced.subscribe, stores.reduced.get, server);
  const mobile = useSyncExternalStore(stores.mobile.subscribe, stores.mobile.get, server);
  const desktop = useSyncExternalStore(stores.desktop.subscribe, stores.desktop.get, server);
  const pointer = useSyncExternalStore(stores.pointer.subscribe, stores.pointer.get, server);
  return {
    reduced,
    mobile,
    desktop,
    /** mouse parallax allowed (fine pointer, ≥1024px, motion OK) */
    mouse: pointer && !reduced,
    /** multiplier applied to every scroll offset: 0 = off, 0.4 on mobile */
    factor: reduced ? 0 : mobile ? parallax.mobileFactor : 1,
  };
}
