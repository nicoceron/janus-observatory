import type { SourceRef } from '@janus/domain/evidence';
import type { ScenarioProfile } from './canonical-core';

export type CompanionBody = 'Moon' | 'Mars' | 'Venus';
export type SystemFeature = 'asteroids' | 'outer' | 'kuiper' | 'solar';
export type Companion = { body: CompanionBody; activity: 'surface' | 'atmosphere' | 'orbital' };
export type SystemPortrait = { bodies: Companion[]; features: SystemFeature[] };

/** A positive published cell supports inclusion; a blank never proves a world's absence. */
export function systemPortrait(profile: ScenarioProfile) {
  const locations: (Companion & { sourceRefs: SourceRef[] })[] = [];
  for (const body of ['Moon', 'Mars', 'Venus'] as const) {
    const rows = profile.planetary.filter(
      (row) => row.body === body && row.value !== null && row.value > 0,
    );
    if (!rows.length) continue;
    const surface = rows.some((row) =>
      ['surface_modification', 'artificial_illumination'].includes(row.signatureId),
    );
    locations.push({
      body,
      activity: surface
        ? 'surface'
        : rows.some((row) => row.signatureId === 'industrial_pollution')
          ? 'atmosphere'
          : 'orbital',
      sourceRefs: rows.flatMap((row) => row.sourceRefs),
    });
  }
  const extended = (
    [
      ['asteroid_mining', 'asteroids'],
      ['outer_planet_settlements', 'outer'],
      ['kuiper_belt_mining', 'kuiper'],
      ['dyson_sphere', 'solar'],
    ] as const
  ).flatMap(([signature, feature]) => {
    const row = profile.system.find((entry) => entry.id === signature);
    return row ? [{ feature, label: row.label, sourceRefs: row.sourceRefs }] : [];
  });
  return {
    locations,
    extended,
    art: {
      bodies: locations.map(({ body, activity }) => ({ body, activity })),
      features: extended.map(({ feature }) => feature),
    } satisfies SystemPortrait,
  };
}
