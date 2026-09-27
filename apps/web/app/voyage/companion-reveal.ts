import { clamp, smooth } from './scroll';

/** Absolute scroll poses: entry and exit retrace the same path on backscroll. */
export function companionReveal(progress: number, scene: number, order: number, reduced: boolean) {
  if (reduced) return Math.round(progress) === scene ? 1 : 0;
  const delay = Math.min(order, 6) * 0.018;
  const arrive = smooth(clamp((progress - (scene - 0.8 + delay)) / (0.66 - delay)));
  const leave = smooth(clamp((progress - (scene + 0.16 - delay)) / (0.64 + delay)));
  return arrive * (1 - leave);
}

/** A camera-ray-aligned point behind Earth's opaque sphere, in Earth's local coordinates. */
export function behindEarth(cameraX: number, cameraY: number, cameraZ: number) {
  const depth = 2.5;
  return { x: (-cameraX * depth) / cameraZ, y: (-cameraY * depth) / cameraZ, z: -depth };
}
