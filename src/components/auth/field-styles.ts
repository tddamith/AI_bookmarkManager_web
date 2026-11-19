/**
 * Underline text-field styles — same states as the panel design (Components · Text field states):
 * default 1px · hover 1.5px + darker label · focus 2px + lime underglow · disabled dashed grey.
 */
export const fieldWrap =
  "group flex flex-col gap-1 border-b border-ink pb-1.5 transition-[box-shadow,border-color] " +
  "hover:not-focus-within:border-b-[1.5px] " +
  "focus-within:border-b-2 focus-within:shadow-[0_4px_0_-2px_#D4FA1E] " +
  "has-[:disabled]:border-b has-[:disabled]:border-dashed has-[:disabled]:border-[#A3A3A3] has-[:disabled]:shadow-none";

export const fieldLabel =
  "text-xs text-ink-muted transition-colors group-hover:text-ink group-focus-within:text-ink group-has-[:disabled]:text-[#8A8A8A]";

export const fieldInput =
  "h-9 border-0 bg-transparent p-0 text-[17px] text-ink outline-none placeholder:text-[#6B6B6B] disabled:text-[#A3A3A3]";
