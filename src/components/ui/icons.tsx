type P = { size?: number; className?: string };

export function BookmarkIcon({ size = 24, fill = "currentColor", className }: P & { fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M6 3h12v18l-6-4-6 4z" fill={fill} />
    </svg>
  );
}

export function SparkIcon({ size = 16, fill = "currentColor", stroke }: P & { fill?: string; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1l2.6 7.4L22 11l-7.4 2.6L12 21l-2.6-7.4L2 11l7.4-2.6z" fill={fill} />
      {stroke && <path d="M12 1v20" stroke={stroke} strokeWidth="0.8" />}
    </svg>
  );
}

export function CheckCircle({ size = 20 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#111111" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#D4FA1E" strokeWidth="2" />
    </svg>
  );
}

export function ArrowDown({ size = 12 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

export function ArrowRight({ size = 14, stroke = "currentColor" }: P & { stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
