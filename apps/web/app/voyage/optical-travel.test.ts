import { expect, test } from 'vitest';
import { opticalTravel } from './optical-travel';

test('the camera aligns before passing through the barrel and holds the eyepiece view', () => {
  expect(opticalTravel(12)).toMatchObject({ approach: 0, align: 0, through: 0, leave: 0 });
  expect(opticalTravel(12.65)).toMatchObject({ approach: 1, align: 1, through: 0 });
  expect(opticalTravel(13)).toMatchObject({ through: 1, enter: 1, frame: 1, leave: 0 });
  expect(opticalTravel(13.4)).toEqual(opticalTravel(13));
  expect(opticalTravel(14)).toMatchObject({ leave: 1, frame: 0 });
});
test('scroll reversal retraces a bounded continuous camera path', () => {
  const scenes = Array.from({ length: 221 }, (_, i) => 11.9 + i / 100);
  const forward = scenes.map(opticalTravel);
  expect([...scenes].reverse().map(opticalTravel).reverse()).toEqual(forward);
  for (let i = 1; i < forward.length; i++) {
    for (const key of Object.keys(forward[i]) as (keyof ReturnType<typeof opticalTravel>)[]) {
      expect(forward[i][key]).toBeGreaterThanOrEqual(0);
      expect(forward[i][key]).toBeLessThanOrEqual(1);
      expect(Math.abs(forward[i][key] - forward[i - 1][key])).toBeLessThan(0.05);
    }
  }
});
