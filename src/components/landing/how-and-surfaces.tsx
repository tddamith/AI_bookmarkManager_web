import { parallax as cfg } from "@/lib/parallax-config";
import { BandDecor } from "@/components/motion/band-decor";
import { ParallaxLayer } from "@/components/motion/parallax-layer";
import { Reveal } from "@/components/motion/reveal";
import { HowItWorksDemo } from "@/components/landing/how-it-works-demo";
import { container, SectionHeading } from "@/components/ui/section-heading";

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className={`${container} flex flex-col gap-10 py-24`}>
      <SectionHeading id="how-title" title="Set up in 30 seconds." eyebrow={<>How it works —<br />3 steps</>} />
      <HowItWorksDemo />
    </section>
  );
}

export function Surfaces() {
  return (
    <section aria-labelledby="surfaces-title" className="relative overflow-x-clip border-y border-ink bg-sand">
      <BandDecor tone="ink" preset="a" />
      <div className={`${container} relative flex flex-col gap-10 py-24`}>
        <Reveal variant="heading" className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="surfaces-title" className="max-w-[640px] text-[clamp(36px,4.5vw,56px)] font-normal leading-[1.02] tracking-[-0.035em]">
            Small popup or side panel. Your call.
          </h2>
          <p className="max-w-[380px] text-[17px] leading-normal text-[#1F1F1F]">
            Open Tidypin as a quick popup from the toolbar, or dock it beside every page. Switch any time.
          </p>
        </Reveal>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
          <ParallaxLayer speed={cfg.surfaces.popup} className="flex flex-wrap items-center gap-6 rounded-card bg-paper p-7">
            <div aria-hidden="true" className="flex h-[230px] w-[150px] shrink-0 flex-col gap-2 rounded-[20px] border-[1.5px] border-ink bg-lime p-3.5">
              <div className="grid grid-cols-4 gap-[3px]">
                <div className="h-0.5 bg-ink" />
                <div className="h-px bg-ink/40" />
                <div className="h-px bg-ink/40" />
                <div className="h-px bg-ink/40" />
              </div>
              <div className="h-3 w-[80%] rounded-sm bg-ink" />
              <div className="h-3 w-[60%] rounded-sm bg-ink" />
              <div className="mt-auto h-6 rounded-full bg-ink" />
            </div>
            <div className="flex flex-[1_1_160px] flex-col gap-2">
              <p className="text-[13px] text-ink-muted">Popup —</p>
              <h3 className="text-[26px] font-normal tracking-[-0.02em]">Quick and small</h3>
              <p className="text-[15px] leading-normal text-ink-muted">Click the icon, save, done. Five tabs in a 380 px window.</p>
            </div>
          </ParallaxLayer>
          <ParallaxLayer speed={cfg.surfaces.panel} className="flex flex-wrap items-center gap-6 rounded-card bg-paper p-7">
            <div aria-hidden="true" className="flex h-[230px] w-[220px] shrink-0 overflow-hidden rounded-2xl border-[1.5px] border-ink bg-white">
              <div className="flex grow flex-col gap-1.5 p-3">
                <div className="h-2 w-[80%] rounded-sm bg-[#E3E4E7]" />
                <div className="h-1.5 w-[90%] rounded-sm bg-[#ECEDEF]" />
                <div className="h-1.5 w-[70%] rounded-sm bg-[#ECEDEF]" />
                <div className="h-[50px] rounded-md bg-[#F1F2F4]" />
              </div>
              <div className="flex w-[44%] flex-col gap-1.5 border-l border-ink bg-paper p-2">
                <div className="h-[70px] rounded-lg bg-lime" />
                <div className="h-1.5 w-[80%] rounded-sm bg-ink" />
                <div className="h-1.5 w-[60%] rounded-sm bg-ink" />
              </div>
            </div>
            <div className="flex flex-[1_1_160px] flex-col gap-2">
              <p className="text-[13px] text-ink-muted">Side panel —</p>
              <h3 className="text-[26px] font-normal tracking-[-0.02em]">Always beside you</h3>
              <p className="text-[15px] leading-normal text-ink-muted">Summaries, suggestions and your library next to every page.</p>
            </div>
          </ParallaxLayer>
        </div>
      </div>
    </section>
  );
}
