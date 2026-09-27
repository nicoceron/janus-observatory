/** Capture only nearby portraits. A departed anchor cannot pull a reader back. */
export function nearbyChapter(
  y: number,
  anchors: readonly number[],
  viewport: number,
  departed: number | null,
  excluded: readonly number[] = [],
) {
  let best: number | null = null;
  let distance = Infinity;
  anchors.forEach((anchor, index) => {
    if (index === departed || excluded.includes(index)) return;
    const gap = Math.min(
      index > 0 ? anchor - anchors[index - 1] : Infinity,
      index < anchors.length - 1 ? anchors[index + 1] - anchor : Infinity,
    );
    const radius = Math.min(viewport * 0.46, gap * 0.42);
    const delta = Math.abs(anchor - y);
    if (delta > 1 && delta <= radius && delta < distance) {
      best = index;
      distance = delta;
    }
  });
  return best;
}
