import type { ScenarioId } from '@janus/domain';

export type WorldArtProfile = {
  title: string;
  surface: string;
  surfaceTint: string;
  atmosphere: string;
  landMix: number;
};

// Editorial material treatments, not measured future maps. See the versioned
// narrative/art boundary in docs/CINEMATIC_ASSET_DIRECTION.md. All scenes retain
// registered Solar System Scope geography, one solar direction, and canonical light gating.
// S9 and S10 intentionally remain visually quiet: instrumentation is separate.
export const worldArtProfiles: Record<ScenarioId, WorldArtProfile> = {
  S1: {
    title: 'An expanding technosphere',
    surface: 'urban-scarcity',
    surfaceTint: '#c4a58d',
    atmosphere: '#b58156',
    landMix: 0.64,
  },
  S2: {
    title: 'Uneven resource pressure',
    surface: 'contested-landscape',
    surfaceTint: '#c2b094',
    atmosphere: '#b99571',
    landMix: 0.43,
  },
  S3: {
    title: 'Earth as a settled hub',
    surface: 'settled-biosphere',
    surfaceTint: '#b5c3ae',
    atmosphere: '#a9a598',
    landMix: 0.24,
  },
  S4: {
    title: 'Living with natural cycles',
    surface: 'bioregional-world',
    surfaceTint: '#9fbea0',
    atmosphere: '#799aa6',
    landMix: 0.5,
  },
  S5: {
    title: 'A reengineered biosphere',
    surface: 'biosynthetic-mosaic',
    surfaceTint: '#97b9a6',
    atmosphere: '#8aa4af',
    landMix: 0.56,
  },
  S6: {
    title: 'Calibrated life support',
    surface: 'engineered-landscape',
    surfaceTint: '#b7ad98',
    atmosphere: '#b3a18b',
    landMix: 0.46,
  },
  S7: {
    title: 'A regional restoration',
    surface: 'regional-restoration',
    surfaceTint: '#abc49d',
    atmosphere: '#819cab',
    landMix: 0.35,
  },
  S8: {
    title: 'Uneven continuity',
    surface: 'uneven-continuity',
    surfaceTint: '#b3a58c',
    atmosphere: '#a29487',
    landMix: 0.34,
  },
  S9: {
    title: 'A quiet Earth, an active system',
    surface: 'quiet-home-world',
    surfaceTint: '#b4c8af',
    atmosphere: '#809cad',
    landMix: 0.12,
  },
  S10: {
    title: 'A restored point of departure',
    surface: 'restored-home-world',
    surfaceTint: '#b3c9b1',
    atmosphere: '#809cad',
    landMix: 0.18,
  },
};
