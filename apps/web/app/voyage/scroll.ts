export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

/** Absolute positions make reversal and direct jumps independent of animation history. */
export function sceneAtScroll(scrollY: number, anchors: number[]) {
  if (anchors.length < 2 || scrollY <= anchors[0]) return 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (scrollY < anchors[i + 1])
      return i + clamp((scrollY - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]));
  }
  return anchors.length - 1;
}

export type FlightState = { progress: number; active: boolean; pointerX: number; pointerY: number };
