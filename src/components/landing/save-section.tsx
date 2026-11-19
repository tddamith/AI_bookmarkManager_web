import { Reveal } from "@/components/motion/reveal";
import { SaveBookmarkDemo } from "@/components/landing/save-bookmark-demo";
import { container } from "@/components/ui/section-heading";

export function SaveFlow() {
  return (
    <section id="save" aria-labelledby="save-title" className="border-b border-ink bg-paper">
      <div className={`${container} flex flex-col gap-10 py-24`}>
        <Reveal variant="heading" className="flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-6">
          <h2 id="save-title" className="max-w-[640px] text-[clamp(36px,4.5vw,56px)] font-normal leading-[1.02] tracking-[-0.035em]">
            Save any page in three steps.
          </h2>
          <p className="text-sm text-ink-muted">Save flow —<br />About 9 seconds</p>
        </Reveal>
        <SaveBookmarkDemo />
      </div>
    </section>
  );
}
