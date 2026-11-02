/** Complete static utilities reused by the teleport workspace; created once per module. */
export const teleportProgressOverlayClasses =
  "teleport-progress-overlay fixed inset-0 z-40 grid place-items-center bg-[rgba(10,_15,_26,_0.64)] p-5";

export const teleportProgressSpinnerClasses =
  "spin mb-[17px] h-10.5 w-10.5 animate-[login-spin_900ms_linear_infinite] text-accent";

export const teleportFactRowClasses =
  "grid grid-cols-[120px_minmax(0,_1fr)] gap-3 bg-canvas px-3.5 py-[13px] max-[700px]:grid-cols-[1fr] max-[700px]:gap-1";

export const teleportSecondaryButtonClasses =
  "min-h-11 rounded-control border border-solid border-control bg-surface px-4 py-0 text-[12px] font-[720] text-ink max-[700px]:w-full";

export const teleportPrimaryButtonClasses = `is-primary ${teleportSecondaryButtonClasses} dark:text-canvas`;

/** Travel controls own their target size and icon geometry, including dialog actions. */
export const teleportControlClasses = {
  button:
    "transition-[background-color,color,border-color] duration-120 ease-[ease] inline-flex items-center justify-center gap-2 min-h-11 rounded-control",
  select: "min-h-11",
  icon: "w-4 h-4 shrink-0",
} as const;
