import { expect, it } from 'vitest';
import { skyPose } from './sky-pose';
import { transitionBlend } from './scroll';
it('sky poses are bounded, continuous through chapter boundaries and independent of scroll direction', () => {
  for (let i = 0; i <= 16; i++) {
    const pose = skyPose(i);
    expect(pose.light.every((n) => n >= 0 && n <= 0.3)).toBe(true);
    const left = skyPose(i - 0.00001),
      right = skyPose(i + 0.00001);
    left.light.forEach((n, j) => expect(Math.abs(n - right.light[j])).toBeLessThan(0.0001));
    expect(Math.abs(left.x - right.x)).toBeLessThan(0.0001);
    expect(Math.abs(left.scale - right.scale)).toBeLessThan(0.0001);
  }
  expect(skyPose(-10)).toEqual(skyPose(0));
  expect(skyPose(20)).toEqual(skyPose(16));
});
it('portrait handoffs hold at both ends and reverse along the same easing curve', () => {
  expect(transitionBlend(0.08)).toBe(0);
  expect(transitionBlend(0.92)).toBeCloseTo(1);
  for (let i = 0; i <= 100; i++)
    expect(transitionBlend(i / 100) + transitionBlend(1 - i / 100)).toBeCloseTo(1, 9);
  expect(transitionBlend(0.081)).toBeLessThan(0.000001);
});
