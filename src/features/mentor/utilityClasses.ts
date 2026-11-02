/** Complete static utilities reused by the mentor workspace; created once per module. */
export const mentorSectionHeadingClasses =
  "mentor-section-heading flex items-center justify-between gap-6 max-[850px]:flex-wrap";

/** Ledger fields and actions explicitly opt into their reusable control defaults. */
export const mentorControlClasses = {
  button:
    "transition-[background-color,color,border-color] duration-120 ease-[ease] inline-flex items-center justify-center gap-2 min-h-10 pointer-coarse:min-h-11 px-3.5 py-2 border border-solid rounded-control border-control text-inherit bg-surface enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-55",
  primaryButton:
    "transition-[background-color,color,border-color] duration-120 ease-[ease] inline-flex items-center justify-center gap-2 min-h-10 pointer-coarse:min-h-11 px-3.5 py-2 border border-solid rounded-control disabled:cursor-not-allowed disabled:text-on-accent disabled:opacity-55 text-on-accent bg-accent border-accent enabled:hover:bg-accent-hover disabled:bg-accent disabled:border-accent font-semibold",
  input:
    "w-full min-w-0 min-h-10 pointer-coarse:min-h-11 px-3 py-2 border border-solid border-control rounded-control text-ink bg-surface",
  select:
    "w-full min-w-0 min-h-10 pointer-coarse:min-h-11 px-3 py-2 border border-solid border-control rounded-control text-ink bg-surface",
  textarea:
    "w-full min-w-0 min-h-18 px-3 py-2 border border-solid border-control rounded-control text-ink bg-surface resize-y",
  label: "grid gap-1.5 font-semibold",
  icon: "w-4.5 h-4.5 shrink-0",
} as const;
