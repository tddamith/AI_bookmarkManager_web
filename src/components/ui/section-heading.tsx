import { Reveal } from "@/components/motion/reveal";
import type { ReactNode } from "react";

/** Big light heading on the left, small eyebrow with em-dash on the right, 1px rule below. */
export function SectionHeading({
  id,
  title,
  eyebrow,
  rule = true,
}: {
  id?: string;
  title: ReactNode;
  eyebrow: ReactNode;
  rule?: boolean;
}) {
  return (
    <Reveal variant="heading" className={`flex flex-wrap items-end justify-between gap-6 pb-6 ${rule ? "border-b border-ink" : ""}`}>
      <h2
        id={id}
        className="max-w-[640px] text-[clamp(36px,4.5vw,56px)] font-normal leading-[1.02] tracking-[-0.035em]"
      >
        {title}
      </h2>
      <p className="text-sm text-ink-muted">{eyebrow}</p>
    </Reveal>
  );
}

export const container = "mx-auto w-full max-w-[1200px] px-6";
