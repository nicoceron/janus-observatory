import { expect, it } from 'vitest';
import { allScenarioProfiles, getScenarioProfile } from './canonical-core';

it('reuses each release-pinned profile across repeated scroll renders', () => {
  for (const profile of allScenarioProfiles) {
    expect(getScenarioProfile(profile.id)).toBe(profile);
    expect(getScenarioProfile(profile.id).observations).toHaveLength(5);
  }
});
