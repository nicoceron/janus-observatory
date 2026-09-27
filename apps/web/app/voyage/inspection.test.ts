import { describe, expect, it } from 'vitest';
import { allScenarioProfiles } from '../../lib/canonical-core';
import { systemPortrait } from '../../lib/system-portrait';
import { companionStudy, selectionDescription, selectionName } from './inspection';

describe('source-selected companion studies', () => {
  it('keeps Venus surface, atmosphere and orbit studies distinct', () => {
    const expectations = [
      [0, 'orbital-habitat'],
      [4, 'aerostat'],
      [5, 'venus-facility'],
      [8, 'venus-facility'],
      [9, 'aerostat'],
    ] as const;
    for (const [world, study] of expectations) {
      const system = systemPortrait(allScenarioProfiles[world]).art;
      expect(companionStudy(world, 'Venus', system)).toBe(study);
      expect(selectionName(study)).not.toBe(study);
    }
    const s6 = systemPortrait(allScenarioProfiles[5]).art;
    expect(s6.bodies).toContainEqual({ body: 'Venus', activity: 'surface' });
    expect(selectionDescription(5, 'Venus', s6)).toContain('surface activity');
    expect(selectionDescription(5, 'Venus', s6)).not.toMatch(/buoyant|suspended/);
  });

  it('does not manufacture settlements for locations absent from the selected source footprint', () => {
    for (const world of [3, 6]) {
      const system = systemPortrait(allScenarioProfiles[world]).art;
      for (const body of ['Moon', 'Mars', 'Venus'])
        expect(companionStudy(world, body, system)).toBeNull();
    }
    const s8 = systemPortrait(allScenarioProfiles[7]).art;
    expect(companionStudy(7, 'Moon', s8)).toBe('lunar-base');
    expect(companionStudy(7, 'Mars', s8)).toBeNull();
    const s9 = systemPortrait(allScenarioProfiles[8]).art;
    expect(companionStudy(8, 'Moon', s9)).toBe('machine-station');
    expect(companionStudy(8, 'Mars', s9)).toBe('machine-facility');
    expect(companionStudy(8, 'Venus', s9)).toBe('venus-facility');
  });
});
