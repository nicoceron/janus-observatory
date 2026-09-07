export type StepBounds = { index: number; top: number; bottom: number };

/** Ownership belongs to the step containing the reading line, irrespective of its height. */
export function readingLineOwner(steps: StepBounds[], line: number, fallback: number): number {
  const containing = steps.find(({ top, bottom }) => top <= line && bottom > line);
  if (containing) return containing.index;
  let nearest = fallback;
  let distance = Infinity;
  for (const step of steps) {
    const next = Math.min(Math.abs(step.top - line), Math.abs(step.bottom - line));
    if (next < distance) {
      nearest = step.index;
      distance = next;
    }
  }
  return nearest;
}
