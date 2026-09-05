/** Presentation helpers shared by glamour views. */
export function hideBrokenImage(image: HTMLImageElement) {
  image.hidden = true;
}

export function formatGlamourCount(value: number) {
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}w`;
  return value.toLocaleString("zh-CN").padStart(2, "0");
}
