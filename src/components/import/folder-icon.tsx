export function FolderIcon({ tone }: { tone: string }) {
  const dark = tone === "bg-ink";
  return (
    <span className={`flex size-[34px] shrink-0 items-center justify-center rounded-full ${tone}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" fill={dark ? "#FFFFFF" : "#111111"} />
      </svg>
    </span>
  );
}
