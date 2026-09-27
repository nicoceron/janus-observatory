import { expect, it } from 'vitest';
import { nearbyChapter } from './chapter-settle';
it('captures approaching portraits in both directions without forcing distant jumps', () => {
  const anchors = [0, 1250, 2500, 3750];
  expect(nearbyChapter(1040, anchors, 1000, null)).toBe(1);
  expect(nearbyChapter(1460, anchors, 1000, null)).toBe(1);
  expect(nearbyChapter(650, anchors, 1000, null)).toBeNull();
  expect(nearbyChapter(1250, anchors, 1000, null)).toBeNull();
});
it('releases the previous portrait and protects article sections and small viewports', () => {
  const anchors = [0, 1250, 2500, 3750];
  expect(nearbyChapter(1400, anchors, 1000, 1)).toBeNull();
  expect(nearbyChapter(2300, anchors, 1000, 1, [2])).toBeNull();
  expect(nearbyChapter(800, anchors, 500, null)).toBeNull();
  expect(nearbyChapter(3700, anchors, 500, null)).toBe(3);
});
