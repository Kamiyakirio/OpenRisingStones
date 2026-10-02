/** SVG pie geometry and integer count axes, independent of rendering and themes. */
export function mentorPieSlices(counts: readonly number[]) {
  const total = counts.reduce((sum, count) => sum + Math.max(0, count), 0);
  let angle = -Math.PI / 2;
  return counts.map((count) => {
    if (count <= 0 || total === 0) return null;
    const start = angle;
    angle += (count / total) * Math.PI * 2;
    // A complete circle requires two arcs; a single SVG arc has coincident ends.
    if (count === total)
      return "M 100 10 A 90 90 0 1 1 100 190 A 90 90 0 1 1 100 10 Z";
    const point = (value: number) =>
      `${100 + 90 * Math.cos(value)} ${100 + 90 * Math.sin(value)}`;
    return `M 100 100 L ${point(start)} A 90 90 0 ${angle - start > Math.PI ? 1 : 0} 1 ${point(angle)} Z`;
  });
}

/** Choose a small set of whole-count ticks with a shared baseline at zero. */
export function mentorBarScale(maximum: number) {
  const value = Math.max(1, maximum);
  const rough = value / 4;
  const power = 10 ** Math.floor(Math.log10(Math.max(1, rough)));
  const step =
    [1, 2, 5, 10].find((multiple) => multiple * power >= rough)! * power;
  const limit = Math.ceil(value / step) * step;
  return {
    limit,
    ticks: Array.from({ length: limit / step + 1 }, (_, index) => index * step),
  };
}
