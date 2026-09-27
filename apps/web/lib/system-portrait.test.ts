import { describe, expect, it } from 'vitest';
import { allScenarioProfiles } from './canonical-core';
import { systemPortrait } from './system-portrait';

describe('published system portraits', () => {
  it('distinguishes lunar refuge, terraforming, orbital activity and the two Earth-centered cases', () => {
    const portraits = Object.fromEntries(
      allScenarioProfiles.map((profile) => [profile.id, systemPortrait(profile)]),
    );
    expect(portraits.S4.art.bodies).toEqual([]);
    expect(portraits.S7.art.bodies).toEqual([]);
    expect(portraits.S8.art.bodies).toEqual([{ body: 'Moon', activity: 'surface' }]);
    expect(portraits.S2.art.bodies.map((item) => item.body)).toEqual(['Moon', 'Mars']);
    expect(portraits.S5.art.bodies).toContainEqual({ body: 'Mars', activity: 'surface' });
    expect(portraits.S6.art.bodies.map((item) => item.body)).toEqual(['Moon', 'Mars', 'Venus']);
    expect(portraits.S9.art.bodies).toContainEqual({ body: 'Moon', activity: 'orbital' });
    expect(portraits.S9.art.features).toContain('solar');
    expect(portraits.S10.art.features).not.toContain('solar');
  });
  it('includes only positive published evidence and keeps exact locators outside the client art payload', () => {
    for (const profile of allScenarioProfiles) {
      const portrait = systemPortrait(profile);
      for (const location of portrait.locations) {
        expect(location.sourceRefs.length).toBeGreaterThan(0);
        expect(
          profile.planetary.some(
            (row) => row.body === location.body && row.value !== null && row.value > 0,
          ),
        ).toBe(true);
        expect(
          location.sourceRefs.every(
            (ref) =>
              ref.sourceVersion === 'arXiv:2409.00067v3' &&
              ref.locator.table === 'Table 6' &&
              ref.locator.column === profile.id,
          ),
        ).toBe(true);
      }
      for (const feature of portrait.extended)
        expect(
          feature.sourceRefs.every(
            (ref) => ref.locator.table === 'Table 8' && ref.locator.column === profile.id,
          ),
        ).toBe(true);
      expect(JSON.stringify(portrait.art)).not.toContain('sourceRefs');
      expect(JSON.stringify(portrait.art)).not.toContain('value');
    }
  });
});
