import { highlightRanges } from "@/lib/search";

/** Text with the matched part in bold (no background). */
export function Highlight({ text, query }: { text: string; query: string }) {
  const ranges = query.trim() ? highlightRanges(text, query) : [];
  if (!ranges.length) return <>{text}</>;
  const out: React.ReactNode[] = [];
  let at = 0;
  ranges.forEach(([a, b], i) => {
    if (a > at) out.push(text.slice(at, a));
    out.push(<mark key={i} className="bg-transparent font-semibold text-inherit">{text.slice(a, b)}</mark>);
    at = b;
  });
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}
