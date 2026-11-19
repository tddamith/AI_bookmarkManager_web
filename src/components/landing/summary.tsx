import { parallax as cfg } from "@/lib/parallax-config";
import { BandDecor } from "@/components/motion/band-decor";
import { ParallaxLayer } from "@/components/motion/parallax-layer";
import { Reveal } from "@/components/motion/reveal";
import { CheckCircle, SparkIcon } from "@/components/ui/icons";
import { container } from "@/components/ui/section-heading";

const points = [
  "Three key points and reading time",
  "Copy it, or ask for a longer version",
  "Search finds pages by what they said",
];

const bullets = [
  "Grid lays out rows and columns at once; Flexbox handles one direction.",
  "Name regions with grid-template-areas, then place items by name.",
  "repeat(auto-fit, minmax()) builds responsive grids.",
];

export function Summary() {
  return (
    <section aria-labelledby="summary-title" className="relative overflow-hidden border-y border-ink bg-sky">
      <BandDecor tone="ink" preset="b" />
      <ParallaxLayer speed={cfg.decorSpeed} className="pointer-events-none absolute -left-24 top-10 size-72">
        <span aria-hidden="true" className="block size-full rounded-full border-[1.5px] border-ink/25" />
      </ParallaxLayer>
      <ParallaxLayer speed={-cfg.decorSpeed} className="pointer-events-none absolute -right-16 bottom-0 size-56">
        <span aria-hidden="true" className="block size-full rounded-full bg-lime/60" />
      </ParallaxLayer>
      <div className={`${container} relative flex flex-wrap items-center gap-14 py-24`}>
        <Reveal className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
          <p className="text-sm text-[#1F1F1F]">AI summary —<br />Know before you save</p>
          <h2 id="summary-title" className="text-[clamp(36px,4.5vw,56px)] font-normal leading-[1.02] tracking-[-0.035em]">
            Never miss a single detail.
          </h2>
          <p className="max-w-[480px] text-lg leading-normal text-[#1F1F1F]">
            Tidypin reads the page with you and pulls out the three points that matter. Save the
            summary with the bookmark, so months later you still know why you kept it.
          </p>
          <ul className="m-0 flex max-w-[480px] list-none flex-col border-b border-ink p-0">
            {points.map((p, i) => (
              <Reveal as="li" key={p} index={i} className="flex h-[52px] items-center gap-3 border-t border-ink text-base">
                <CheckCircle />
                {p}
              </Reveal>
            ))}
          </ul>
        </Reveal>
        <ParallaxLayer speed={cfg.mockSpeed} className="flex min-w-0 flex-[1_1_420px] justify-center">
          <div className="flex w-full max-w-[420px] flex-col gap-3.5 rounded-card border-[1.5px] border-ink bg-lime p-6">
            <p className="flex justify-between text-[13px] text-ink-soft">
              <span>On this page —</span>
              <span>12 min read</span>
            </p>
            <p className="text-[26px] leading-[1.1] tracking-[-0.02em]">CSS Grid: the complete guide</p>
            <div className="flex flex-col gap-2.5 border-t border-ink pt-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <SparkIcon fill="#111111" />
                AI summary
              </p>
              {bullets.map((b) => (
                <p key={b} className="flex gap-2.5 text-[15px] leading-[1.4]">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink" aria-hidden="true" />
                  {b}
                </p>
              ))}
            </div>
            <div className="flex h-12 items-center justify-center rounded-full bg-ink text-[15px] font-medium text-white">
              Save with summary
            </div>
          </div>
        </ParallaxLayer>
      </div>
    </section>
  );
}
