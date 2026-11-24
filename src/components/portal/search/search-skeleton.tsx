export function SearchSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-[52px] items-center gap-3 px-3">
          <span className="tp-shimmer size-8 shrink-0 rounded-full" />
          <span className="flex min-w-0 grow flex-col gap-1.5">
            <span className="tp-shimmer h-3 rounded" style={{ width: `${[58, 44, 66][i % 3]}%` }} />
            <span className="tp-shimmer h-2.5 rounded" style={{ width: `${[36, 52, 30][i % 3]}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}
