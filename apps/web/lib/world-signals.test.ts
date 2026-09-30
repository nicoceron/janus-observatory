import { describe, expect, it } from 'vitest';
import { allScenarioProfiles, planetaryDataset, systemDataset } from './canonical-core';
import { bodySignalIds, presentSignals, signalBodies, worldSignals } from './world-signals';

describe('world signals', () => {
  it('copies every Table 6 cell exactly and keeps dashes as null', () => {
    for (const profile of allScenarioProfiles) {
      const signals = worldSignals(profile);
      for (const row of planetaryDataset.rows)
        expect(
          signals.bodies[row.body as (typeof signalBodies)[number]][
            row.signatureId as (typeof bodySignalIds)[number]
          ],
        ).toBe(row.values[profile.id]);
    }
    const s9 = worldSignals(allScenarioProfiles[8]);
    expect(s9.bodies.Earth.surface_modification).toBeNull();
    expect(s9.bodies.Earth.artificial_illumination).toBeNull();
    expect(s9.bodies.Mars.surface_modification).toBe(1);
  });

  it('lists Table 8 system signatures and the Table 9 growth state', () => {
    for (const profile of allScenarioProfiles) {
      const signals = worldSignals(profile);
      expect(signals.system).toEqual(
        systemDataset.rows
          .filter((row) => row.presentIn.includes(profile.id))
          .map((row) => row.signatureId),
      );
      expect(signals.growth).toBe(profile.growth.growthState);
    }
  });

  it('uses today’s Earth only as the unit of the relative columns', () => {
    expect(presentSignals.bodies.Earth.artificial_illumination).toBe(1);
    expect(presentSignals.bodies.Earth.satellite_belt).toBe(1);
    expect(presentSignals.bodies.Earth.surface_modification).toBeNull();
    for (const body of ['Moon', 'Mars', 'Venus'] as const)
      expect(Object.values(presentSignals.bodies[body]).every((value) => value === null)).toBe(
        true,
      );
  });
});
