/** Frontend contract for the native portrait lighting editor. */
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
};

export type PortraitLightingUpdate = Omit<
  PortraitLighting,
  "sessionId" | "editorOpen" | "characterReady" | "openType" | "hasChanges"
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

export type PortraitConnectionPhase =
  "idle" | "connecting" | "ready" | "unsupported";
