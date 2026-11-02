/** Complete static utilities reused by the gearing workspace; created once per module. */
export const gearingHintClasses = "gear-muted text-xs leading-[1.7] text-muted";

export const gearingScreenReaderClasses =
  "gear-sr-only absolute h-px w-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)]";

export const gearingAlertClasses =
  "gear-alert mb-3 flex items-start gap-3 border border-solid border-danger bg-surface p-3";

export const gearingDialogBackdropClasses =
  "gear-meld-backdrop gear-editor fixed inset-0 z-30 mx-auto grid w-full max-w-none place-items-center bg-[rgb(31_29_26_/_0.54)] px-8 py-6 text-[15px] text-ink max-[767px]:items-end max-[767px]:px-4 max-[767px]:py-3";

/** Editor primitives bind defaults to each control instead of the workspace ancestor. */
export const gearingControlClasses = {
  button:
    "transition-[background-color,color,border-color] duration-120 ease-[ease] inline-flex items-center justify-center gap-1.5 min-h-10 pointer-coarse:min-h-11 px-3 py-2 border border-solid rounded-control border-control text-inherit bg-surface enabled:hover:bg-hover disabled:cursor-default disabled:text-disabled disabled:opacity-100 aria-pressed:enabled:hover:bg-selected aria-pressed:text-accent aria-pressed:bg-selected",
  input:
    "min-w-0 min-h-10 pointer-coarse:min-h-11 px-3 py-2 border border-solid border-control rounded-control text-ink bg-surface",
  select:
    "min-w-0 min-h-10 pointer-coarse:min-h-11 px-3 py-2 border border-solid border-control rounded-control text-ink bg-surface",
  textarea:
    "min-w-0 min-h-18 px-3 py-2 border border-solid border-control rounded-control text-ink bg-surface resize-y",
  label: "flex items-center gap-2",
  table: "w-full border-collapse tabular-nums",
  th: "px-2.5 py-3 border-b border-b-line text-right whitespace-nowrap text-muted text-[13px] font-normal first:text-left",
  td: "px-2.5 py-3 border-b border-b-line text-right whitespace-nowrap first:text-left",
  icon: "w-4.5 h-4.5 shrink-0",
} as const;
