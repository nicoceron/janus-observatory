import { describe, expect, it } from 'vitest';
import { readingLineOwner } from './reading-line';

describe('reading-line ownership', () => {
  it('does not replace a long observer shot with an adjacent short chapter', () => {
    expect(
      readingLineOwner(
        [
          { index: 12, top: -890, bottom: 30 },
          { index: 13, top: 30, bottom: 2630 },
          { index: 14, top: 2630, bottom: 3550 },
        ],
        520,
        12,
      ),
    ).toBe(13);
  });
  it('resolves restored scroll positions without old intersection ratios', () => {
    expect(readingLineOwner([{ index: 26, top: -150, bottom: 770 }], 520, 0)).toBe(26);
  });
  it('uses half-open boundaries and works in reverse order', () => {
    const steps = [
      { index: 3, top: -400, bottom: 520 },
      { index: 4, top: 520, bottom: 1440 },
    ];
    expect(readingLineOwner(steps, 520, 0)).toBe(4);
    expect(readingLineOwner([...steps].reverse(), 519, 4)).toBe(3);
  });
  it('preserves a valid fallback with no layout', () => {
    expect(readingLineOwner([], 520, 8)).toBe(8);
  });
});
