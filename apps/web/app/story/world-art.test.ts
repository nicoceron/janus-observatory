import { scenarioIds } from '@janus/domain/scenario';
import { describe, expect, it } from 'vitest';

import { worldArtProfiles } from './world-art';

describe('scenario art direction', () => {
  it('gives every Janus scenario an explicit editorial surface treatment', () => {
    const profiles = scenarioIds.map((scenarioId) => worldArtProfiles[scenarioId]);

    expect(profiles.every(Boolean)).toBe(true);
    expect(new Set(profiles.map(({ surface }) => surface)).size).toBe(10);
  });

  it('records art direction as a complete, legible visual target', () => {
    for (const profile of Object.values(worldArtProfiles)) {
      expect(profile.title.length).toBeGreaterThan(4);
      expect(profile.surfaceTint).toMatch(/^#[0-9a-f]{6}$/i);
      expect(profile.atmosphere).toMatch(/^#[0-9a-f]{6}$/i);
      expect(profile.landMix).toBeGreaterThanOrEqual(0);
      expect(profile.landMix).toBeLessThanOrEqual(1);
    }
  });
});
