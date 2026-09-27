export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

/** Absolute positions make reversal and direct jumps independent of animation history. */
export function sceneAtScroll(scrollY: number, anchors: number[], holdEnds: number[] = []) {
  if (anchors.length < 2 || scrollY <= anchors[0]) return 0;
  // Native scroll offsets can round to a CSS pixel (notably in WebKit).
  // Treat that subpixel landing as the complete chapter, rather than the previous scene.
  const landed = anchors.findIndex((anchor) => Math.abs(scrollY - anchor) <= 1);
  if (landed !== -1) return landed;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (scrollY < anchors[i + 1]) {
      const start = Math.min(holdEnds[i] ?? anchors[i], anchors[i + 1] - 1);
      return i + clamp((scrollY - start) / Math.max(1, anchors[i + 1] - start));
    }
  }
  return anchors.length - 1;
}

/** Shared handoff state for the DOM narrative and spatial scene. */
export function chapterFrame(progress: number) {
  const p = clamp(progress, 0, 16),
    lo = Math.floor(p);
  return { p, lo, hi: Math.min(16, lo + 1), blend: transitionBlend(p - lo) };
}

export function chapterCopyPose(progress: number, chapter: number) {
  const { lo, hi, blend } = chapterFrame(progress);
  const outgoing = chapter === lo;
  const amount = outgoing ? 1 - smooth(blend * 2) : chapter === hi ? smooth((blend - 0.5) * 2) : 0;
  return { opacity: amount, y: (outgoing ? -1 : 1) * (1 - amount) * 32 };
}

export type FlightState = {
  progress: number;
  active: boolean;
  pointerX: number;
  pointerY: number;
  closingPortrait?: { x: number; y: number; diameter: number };
};

/** Zero velocity and acceleration at each portrait hold avoids a mechanical stop/start. */
export function transitionBlend(fraction: number) {
  const t = clamp((fraction - 0.08) / 0.84);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
