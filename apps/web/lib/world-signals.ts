import type { ScenarioProfile } from './canonical-core';

export const signalBodies = ['Earth', 'Moon', 'Mars', 'Venus'] as const;
export type SignalBody = (typeof signalBodies)[number];
export const bodySignalIds = [
  'industrial_pollution',
  'agricultural_pollution',
  'artificial_illumination',
  'surface_modification',
  'satellite_belt',
  'contaminated_aerosol',
] as const;
export type BodySignalId = (typeof bodySignalIds)[number];

/** A null keeps Table 6's dash: no reported magnitude. It is never zero and never proof of absence. */
export type BodySignals = Record<BodySignalId, number | null>;

/**
 * The compact slice of canonical Tables 6, 8 and 9 that the low-poly worlds encode visually.
 * Values are copied from generated runtime data; the art never invents a magnitude.
 */
export type WorldSignals = {
  id: string;
  bodies: Record<SignalBody, BodySignals>;
  system: string[];
  growth: 'stable' | 'oscillatory' | 'growing' | 'reference';
};

const emptyBody = (): BodySignals =>
  Object.fromEntries(bodySignalIds.map((id) => [id, null])) as BodySignals;

export function worldSignals(profile: ScenarioProfile): WorldSignals {
  const bodies = Object.fromEntries(signalBodies.map((body) => [body, emptyBody()])) as Record<
    SignalBody,
    BodySignals
  >;
  for (const row of profile.planetary) {
    if (!(signalBodies as readonly string[]).includes(row.body)) continue;
    if (!(bodySignalIds as readonly string[]).includes(row.signatureId)) continue;
    bodies[row.body as SignalBody][row.signatureId as BodySignalId] = row.value;
  }
  return {
    id: profile.id,
    bodies,
    system: profile.system.map((row) => row.id),
    growth: profile.growth.growthState,
  };
}

/**
 * Present-day Earth is the unit of every "relative to Earth 2024" column, so those cells are 1 by
 * definition. Table 6 reports no 2024 surface-modification fraction, which therefore stays null.
 */
export const presentSignals: WorldSignals = {
  id: 'present',
  bodies: {
    ...(Object.fromEntries(signalBodies.map((body) => [body, emptyBody()])) as Record<
      SignalBody,
      BodySignals
    >),
    Earth: {
      industrial_pollution: 1,
      agricultural_pollution: 1,
      artificial_illumination: 1,
      surface_modification: null,
      satellite_belt: 1,
      contaminated_aerosol: 1,
    },
  },
  system: [],
  growth: 'reference',
};
