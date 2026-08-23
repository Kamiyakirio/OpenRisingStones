/** Presentation helpers shared by glamour hero and gallery components. */
import { FALLBACK_GLAMOUR_IMAGES } from "../data/previewGlamours";

export function replaceBrokenImage(image: HTMLImageElement, index: number) {
  image.onerror = null;
  image.src = FALLBACK_GLAMOUR_IMAGES[index % FALLBACK_GLAMOUR_IMAGES.length];
}

export function formatGlamourCount(value: number) {
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}w`;
  return value.toLocaleString("zh-CN").padStart(2, "0");
}
