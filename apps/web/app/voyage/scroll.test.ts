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
  it('lands on complete scenes when native scrolling rounds fractional anchors', () => {
    expect(sceneAtScroll(2199, [0, 1000.25, 2199.75])).toBe(2);
    expect(sceneAtScroll(1001, [0, 1000.25, 2199.75])).toBe(1);
    expect(sceneAtScroll(2197, [0, 1000.25, 2199.75])).toBeLessThan(2);
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

import { chapterCopyPose, chapterFrame } from './scroll';
it('pairs narrative visibility with the same spatial handoff and reverses deterministically', () => {
  for (let p = 2; p <= 11; p += 0.025) {
    const frame = chapterFrame(p);
    const outgoing = chapterCopyPose(p, frame.lo);
    const incoming = chapterCopyPose(p, frame.hi);
    if (frame.blend < 0.5) expect(incoming.opacity).toBe(0);
    if (frame.blend > 0.5) expect(outgoing.opacity).toBe(0);
    expect(chapterCopyPose(p, frame.lo)).toEqual(outgoing);
  }
  expect(chapterCopyPose(4, 4)).toEqual({ opacity: 1, y: -0 });
  expect(chapterCopyPose(4, 3).opacity).toBe(0);
  expect(chapterCopyPose(4, 5).opacity).toBe(0);
});
it('holds a mobile world while its complete narrative scrolls into view', () => {
  const anchors = [0, 1000, 2400, 4000];
  const holds = [0, 1700, 3200, 4000];
  expect(sceneAtScroll(1600, anchors, holds)).toBe(1);
  expect(sceneAtScroll(2050, anchors, holds)).toBe(1.5);
  expect(sceneAtScroll(3000, anchors, holds)).toBe(2);
  expect(sceneAtScroll(2400, anchors, holds)).toBe(2);
});
