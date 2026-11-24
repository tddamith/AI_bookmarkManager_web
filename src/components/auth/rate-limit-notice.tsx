import { formatWait, spokenWait } from "@/components/auth/use-rate-limit";

/** "Too many attempts" message with a live countdown (the visible timer is hidden from screen readers; they get a coarse, calm update). */
export function RateLimitNotice({ left, id }: { left: number; id?: string }) {
  return (
    <div id={id} role="status" aria-live="polite" className="flex items-start gap-3 border-l-2 border-ink bg-white px-3 py-2.5 text-sm">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="mt-px shrink-0"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg>
      <p className="m-0">
        <strong className="font-medium">Too many attempts.</strong>{" "}
        You can try again in <time aria-label={spokenWait(left)} className="font-medium tabular-nums">{formatWait(left)}</time>.
      </p>
    </div>
  );
}
