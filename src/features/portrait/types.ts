/** Frontend contract for the native portrait editor controls. */
export type PortraitLighting = {
  sessionId: number;
  editorOpen: boolean;
  characterReady: boolean;
  openType: number;
  hasChanges: boolean;
  ambientColor: [number, number, number];
  ambientBrightness: number;
  directionalColor: [number, number, number];
  directionalBrightness: number;
  directionalVerticalAngle: number;
  directionalHorizontalAngle: number;
  animationAvailable: boolean;
  animationPaused: boolean;
  animationEditable: boolean;
  animationTime: number;
  animationDuration: number;
  animationFrameCount: number;
};

export type PortraitLightingUpdate = Omit<
  PortraitLighting,
  | "sessionId"
  | "editorOpen"
  | "characterReady"
  | "openType"
  | "hasChanges"
  | "animationAvailable"
  | "animationPaused"
  | "animationEditable"
  | "animationTime"
  | "animationDuration"
  | "animationFrameCount"
> & {
  fields: number;
};

export const PORTRAIT_LIGHTING_FIELDS = {
  ambientColor: 1 << 0,
  ambientBrightness: 1 << 1,
  directionalColor: 1 << 2,
  directionalBrightness: 1 << 3,
  directionalAngles: 1 << 4,
  all: (1 << 5) - 1,
} as const;

export type PortraitAnimationUpdate = {
  fields: number;
  time: number;
  paused: boolean;
};

export const PORTRAIT_ANIMATION_FIELDS = {
  time: 1 << 0,
  paused: 1 << 1,
} as const;

export type PortraitConnectionPhase =
  "idle" | "connecting" | "ready" | "unsupported";
