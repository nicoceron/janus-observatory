import { clamp, smooth } from './scroll';

// Restrained reflected light, not a colorful nebula wallpaper. All values are editorial.
const light = [
  [0.18, 0, 0.04],
  [0.25, 0.03, 0.2],
  [0.14, 0.03, 0.04],
  [0.05, 0.27, 0.03],
  [0.19, 0.05, 0.08],
  [0.1, 0.15, 0.02],
  [0.08, 0.02, 0.25],
  [0.22, 0.03, 0.12],
  [0.08, 0.2, 0.04],
  [0.07, 0.14, 0.06],
  [0.2, 0, 0.1],
  [0.12, 0.12, 0.08],
  [0.12, 0.02, 0.16],
  [0.02, 0, 0.02],
  [0.08, 0, 0.05],
  [0.1, 0.04, 0.04],
  [0.18, 0.02, 0.06],
];
export function skyPose(progress: number) {
  const p = clamp(progress, 0, 16),
    a = Math.floor(p),
    b = Math.min(16, a + 1);
  const mix = smooth(p - a);
  return {
    light: light[a].map((value, i) => value + (light[b][i] - value) * mix),
    x: Math.sin(p * 0.43) * 3,
    y: -p * 0.32,
    nearX: Math.sin(p * 0.43) * -1.6,
    nearY: -p * 0.65,
    scale: 1 + Math.sin(Math.PI * (p - a)) ** 2 * 0.015,
    galaxyAngle: Math.sin(p * 0.24) * 6,
    galaxyOpacity: 0.58 - 0.42 * Math.max(0, 1 - Math.abs(p - 13)),
  };
}
