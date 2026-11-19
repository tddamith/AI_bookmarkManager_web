import { Reveal } from "@/components/motion/reveal";
import { container, SectionHeading } from "@/components/ui/section-heading";
import { SparkIcon } from "@/components/ui/icons";

const features = [
  {
    n: "01",
    title: "Save",
    body: "One click. AI picks the folder and tags, and writes a short summary.",
    bg: "bg-lime",
    text: "text-ink-soft",
    icon: (
      <svg width="56" height="56" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#111111" />
        <path d="M12 7v10M7 12h10" stroke="#D4FA1E" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "Find",
    body: "Search in plain words, like “that pricing page I saved last month”.",
    bg: "bg-white",
    text: "text-ink-muted",
    icon: (
      <svg width="56" height="56" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 2h14v21l-7-5-7 5z" fill="#111111" />
        <path d="M12 2v11" stroke="#FFFFFF" strokeWidth="0.8" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Tidy",
    body: "Duplicates, dead links and messy folders, fixed in one tap. Undo any time.",
    bg: "bg-sky",
    text: "text-[#1F1F1F]",
    icon: <SparkIcon size={56} fill="#111111" stroke="#A6C3DD" />,
  },
  {
    n: "04",
    title: "For you",
    body: "Related saves and the best sites on the topic of the page you're on.",
    bg: "bg-sand",
    text: "text-[#1F1F1F]",
    icon: (
      <svg width="56" height="56" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#111111" />
        <path d="M16 8l-2.5 5.5L8 16l2.5-5.5z" fill="none" stroke="#C9B597" strokeWidth="1" />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className={`${container} flex flex-col gap-10 pb-16 pt-24`}>
      <SectionHeading
        id="features-title"
        title="Four things your bookmarks bar never did."
        eyebrow={<>Features —<br />01 to 04</>}
      />
      <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 p-0">
        {features.map((f, i) => (
          <Reveal as="li" key={f.n} index={i}>
            <article className={`lift flex min-h-[300px] flex-col gap-3 rounded-card p-7 ${f.bg} h-full`}>
              {f.icon}
              <p className={`mt-auto text-[13px] ${f.text}`}>{f.n} —</p>
              <h3 className="text-[30px] font-normal tracking-[-0.02em]">{f.title}</h3>
              <p className={`text-[15px] leading-normal ${f.text}`}>{f.body}</p>
            </article>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
