/** Complete static utilities reused by the fishing workspace; created once per module. */
export const fishingEmptyClasses =
  "fish-inline-empty m-0 px-0 py-6 text-muted [border-block:1px_solid_var(--ors-color-line)]";

export const fishingTextActionClasses =
  "fish-text-action mt-3 min-h-9 border-0 bg-transparent px-0 py-[5px] text-left font-semibold hover:bg-transparent hover:underline";

export const fishingSectionHeadingClasses =
  "fish-section-heading mb-3.5 flex flex-wrap items-baseline justify-between gap-[8px_20px]";

export const fishingBackClasses =
  "fish-back mb-5 inline-flex items-center gap-2 border-0 bg-transparent pl-0 text-accent";

export const fishingSectionDescriptionClasses =
  "mx-0 mt-0.5 mb-0 text-[13px] leading-[1.5] text-muted";

export const fishingBiteErrorClasses =
  "fish-bite-error mx-0 my-2.5 px-2 py-0 text-[13px] text-muted";

/** Fishing controls own their frame and state; nested components keep their own utilities. */
export const fishingControlClasses = {
  button:
    "transition-[background-color,color,border-color] duration-120 ease-[ease] min-h-10 pointer-coarse:min-h-11 px-3.5 py-2 border border-solid rounded-control border-control text-ink bg-surface enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-50 aria-pressed:enabled:hover:bg-selected aria-pressed:text-accent aria-pressed:bg-selected",
} as const;

/** The standalone timer uses compact controls without inheriting application geometry. */
export const timerControlClasses = {
  button:
    "transition-[background-color,color,border-color] duration-120 ease-[ease] min-h-8 pointer-coarse:min-h-11 px-2.5 py-[5px] border border-solid rounded-[6px] border-control text-inherit bg-surface enabled:hover:bg-hover disabled:cursor-not-allowed disabled:text-inherit disabled:opacity-45 aria-pressed:enabled:hover:bg-selected aria-pressed:text-accent aria-pressed:bg-selected",
} as const;
