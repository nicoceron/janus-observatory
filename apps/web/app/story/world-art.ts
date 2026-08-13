import type { ScenarioId } from '@janus/domain';

export type SurfaceLanguage =
  | 'command-grid'
  | 'patchwork'
  | 'civic-rings'
  | 'rewilded'
  | 'neural'
  | 'fractured'
  | 'restoration'
  | 'cycle-scars'
  | 'machine-shell'
  | 'exodus';

export type OrbitLanguage =
  | 'surveillance'
  | 'debris'
  | 'civic'
  | 'quiet'
  | 'neural-shell'
  | 'fragments'
  | 'seed-arc'
  | 'broken-cycle'
  | 'machine-swarm'
  | 'outbound';

export type WorldArtProfile = {
  id: ScenarioId;
  title: string;
  surface: SurfaceLanguage;
  orbit: OrbitLanguage;
  surfaceTint: string;
  secondary: string;
  atmosphere: string;
  atmosphereOpacity: number;
  roughness: number;
  metalness: number;
  rotation: [number, number, number];
};

// These are explicitly interpretive art-direction profiles. Quantitative light
// levels and the presence of system-scale signatures still come from canonical
// Janus data in EarthStage; this map only prevents ten scenarios from becoming
// ten differently tinted copies of the same planet.
export const worldArtProfiles: Record<ScenarioId, WorldArtProfile> = {
  S1: {
    id: 'S1',
    title: 'The command grid',
    surface: 'command-grid',
    orbit: 'surveillance',
    surfaceTint: '#d08462',
    secondary: '#ffdf8a',
    atmosphere: '#ff7d4f',
    atmosphereOpacity: 0.19,
    roughness: 0.66,
    metalness: 0.09,
    rotation: [0.04, -0.34, -0.2],
  },
  S2: {
    id: 'S2',
    title: 'Patchwork recovery',
    surface: 'patchwork',
    orbit: 'debris',
    surfaceTint: '#c89e64',
    secondary: '#f2d39b',
    atmosphere: '#dca26b',
    atmosphereOpacity: 0.12,
    roughness: 0.92,
    metalness: 0.01,
    rotation: [-0.18, 0.58, 0.08],
  },
  S3: {
    id: 'S3',
    title: 'The civic lattice',
    surface: 'civic-rings',
    orbit: 'civic',
    surfaceTint: '#d7c784',
    secondary: '#fff3b6',
    atmosphere: '#f4d76d',
    atmosphereOpacity: 0.1,
    roughness: 0.76,
    metalness: 0.04,
    rotation: [0.18, 0.18, -0.08],
  },
  S4: {
    id: 'S4',
    title: 'The rewilded world',
    surface: 'rewilded',
    orbit: 'quiet',
    surfaceTint: '#6fae62',
    secondary: '#d4ff8a',
    atmosphere: '#77e0bd',
    atmosphereOpacity: 0.075,
    roughness: 1,
    metalness: 0,
    rotation: [0.12, -1.02, 0.14],
  },
  S5: {
    id: 'S5',
    title: 'The neural biosphere',
    surface: 'neural',
    orbit: 'neural-shell',
    surfaceTint: '#58b693',
    secondary: '#77ffe6',
    atmosphere: '#5ce4a7',
    atmosphereOpacity: 0.12,
    roughness: 0.62,
    metalness: 0.12,
    rotation: [-0.08, 1.18, -0.18],
  },
  S6: {
    id: 'S6',
    title: 'The fractured technosphere',
    surface: 'fractured',
    orbit: 'fragments',
    surfaceTint: '#438e8b',
    secondary: '#ff806d',
    atmosphere: '#46c3bc',
    atmosphereOpacity: 0.15,
    roughness: 0.82,
    metalness: 0.06,
    rotation: [0.28, -1.45, 0.26],
  },
  S7: {
    id: 'S7',
    title: 'Restoration arcs',
    surface: 'restoration',
    orbit: 'seed-arc',
    surfaceTint: '#5aa6b4',
    secondary: '#b6ffd2',
    atmosphere: '#6fc2f0',
    atmosphereOpacity: 0.09,
    roughness: 0.94,
    metalness: 0.01,
    rotation: [-0.24, 0.9, -0.1],
  },
  S8: {
    id: 'S8',
    title: 'Scars of the cycle',
    surface: 'cycle-scars',
    orbit: 'broken-cycle',
    surfaceTint: '#697cb1',
    secondary: '#f4ad64',
    atmosphere: '#8eafff',
    atmosphereOpacity: 0.14,
    roughness: 0.78,
    metalness: 0.08,
    rotation: [0.08, 1.72, 0.2],
  },
  S9: {
    id: 'S9',
    title: 'The machine shell',
    surface: 'machine-shell',
    orbit: 'machine-swarm',
    surfaceTint: '#8178b8',
    secondary: '#f2eaff',
    atmosphere: '#a997ff',
    atmosphereOpacity: 0.065,
    roughness: 0.38,
    metalness: 0.35,
    rotation: [-0.16, -2.0, -0.22],
  },
  S10: {
    id: 'S10',
    title: 'The outbound world',
    surface: 'exodus',
    orbit: 'outbound',
    surfaceTint: '#9b6ba6',
    secondary: '#ffc0f7',
    atmosphere: '#db93ee',
    atmosphereOpacity: 0.08,
    roughness: 0.7,
    metalness: 0.14,
    rotation: [0.22, 2.4, 0.08],
  },
};
