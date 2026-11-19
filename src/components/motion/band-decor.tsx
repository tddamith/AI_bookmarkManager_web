"use client";

import type { ReactNode } from "react";
import { parallax as cfg } from "@/lib/parallax-config";
import { ParallaxLayer } from "./parallax-layer";

const Pill = ({ s }: { s: string }) => (
  <svg width="120" height="48" viewBox="0 0 120 48" fill="none" stroke={s} strokeWidth="1.5"><rect x="1" y="1" width="118" height="46" rx="23" /></svg>
);
const Spark = ({ s }: { s: string }) => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="0.7"><path d="M12 1l2.6 7.4L22 11l-7.4 2.6L12 21l-2.6-7.4L2 11l7.4-2.6z" /></svg>
);
const Mark = ({ s }: { s: string }) => (
  <svg width="56" height="72" viewBox="0 0 24 29" fill="none" stroke={s} strokeWidth="0.8"><path d="M2 1h20v27l-10-7-10 7z" /></svg>
);
const shapes: Record<string, (p: { s: string }) => ReactNode> = { pill: Pill, spark: Spark, mark: Mark };

type Item = { kind: keyof typeof shapes; className: string; rotate?: number };

const presets: Record<"a" | "b", Item[]> = {
  a: [
    { kind: "pill", className: "left-[4%] top-[14%]", rotate: -12 },
    { kind: "spark", className: "right-[6%] top-[10%]" },
    { kind: "mark", className: "right-[14%] bottom-[8%]", rotate: 10 },
  ],
  b: [
    { kind: "mark", className: "left-[6%] bottom-[10%]", rotate: -8 },
    { kind: "pill", className: "right-[5%] top-[18%]", rotate: 14 },
    { kind: "spark", className: "left-[40%] top-[6%]" },
  ],
};

/** Decorative ink-outline shapes that scroll at 0.5× — pure depth, aria-hidden. */
export function BandDecor({ tone = "ink", preset = "a" }: { tone?: "ink" | "lime"; preset?: "a" | "b" }) {
  const stroke = tone === "ink" ? "#111111" : "#D4FA1E";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {presets[preset].map((it, i) => {
        const Shape = shapes[it.kind];
        return (
          <ParallaxLayer key={i} speed={cfg.decorSpeed * (i % 2 ? -1 : 1)} className={`absolute ${it.className}`}>
            <div style={{ rotate: `${it.rotate ?? 0}deg` }}>
              <Shape s={stroke} />
            </div>
          </ParallaxLayer>
        );
      })}
    </div>
  );
}
