import { describe, expect, it } from 'vitest';
import { sceneAtScroll } from './scroll';
import { chapters, worlds } from './worlds';

describe('absolute narrative position', () => {
  it('resolves direct jumps and reverse navigation without prior state', () => {
    const anchors = [0, 1200, 2400, 4000];
    expect([4000, 0, 1800, 1200, -50, 9000].map((y) => sceneAtScroll(y, anchors))).toEqual([
      3, 0, 1.5, 1, 0, 3,
    ]);
  });
  it('uses measured section heights after reflow', () => {
    expect(sceneAtScroll(1500, [0, 1000, 2000])).toBe(1.5);
    expect(sceneAtScroll(1500, [0, 1500, 3000])).toBe(1);
  });
  it('gives every world a different surface and infrastructure composition', () => {
    expect(
      new Set(worlds.map((w) => JSON.stringify([w.form, w.seed, w.seaLevel, w.relief]))).size,
    ).toBe(10);
    expect(new Set(chapters.map((c) => c.id)).size).toBe(chapters.length);
  });
});
