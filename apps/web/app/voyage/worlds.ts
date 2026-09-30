/** Original miniature art direction, not scientific measurements or geographic reconstructions. */
export type WorldArt = {
  id: string;
  color: string;
  ocean: string;
  land: string;
  highland: string;
  shore: string;
  cloud: number;
  form:
    | 'origin'
    | 'ecumenopolis'
    | 'extraction'
    | 'arcadia'
    | 'wilderness'
    | 'symbiosis'
    | 'engineered'
    | 'reclaimed'
    | 'fractured'
    | 'machine-swarm'
    | 'duality';
  seed: number;
  seaLevel: number;
  relief: number;
  displayScale: number;
  tilt: number;
  turn: number;
  caption: string;
};

export const worlds: WorldArt[] = [
  {
    id: 'S1',
    form: 'ecumenopolis',
    color: '#e6ac7d',
    ocean: '#29576d',
    land: '#71807d',
    highland: '#9aa49b',
    shore: '#a59f8a',
    cloud: 0,
    seed: 381,
    seaLevel: -0.35,
    relief: 0.055,
    displayScale: 0.87,
    tilt: -0.12,
    turn: 0.04,
    caption: 'A monitored Earth. An expanding technosphere.',
  },
  {
    id: 'S2',
    form: 'extraction',
    color: '#e6c698',
    ocean: '#925839',
    land: '#ce985b',
    highland: '#e6bc80',
    shore: '#b8785d',
    cloud: 0,
    seed: 739,
    seaLevel: -0.6,
    relief: 0.1,
    displayScale: 0.92,
    tilt: 0.16,
    turn: -0.1,
    caption: 'Resource frontiers. A fragile planetary balance.',
  },
  {
    id: 'S3',
    form: 'arcadia',
    color: '#e2dcaa',
    ocean: '#268b9e',
    land: '#93bf78',
    highland: '#ccda8d',
    shore: '#c9c9a0',
    cloud: 3,
    seed: 125,
    seaLevel: -0.13,
    relief: 0.045,
    displayScale: 0.85,
    tilt: -0.19,
    turn: 0.16,
    caption: 'Abundance, distributed power, and a home among the stars.',
  },
  {
    id: 'S4',
    form: 'wilderness',
    color: '#b9cfa0',
    ocean: '#237e9b',
    land: '#549967',
    highland: '#95bb76',
    shore: '#b9caa2',
    cloud: 3,
    seed: 993,
    seaLevel: -0.17,
    relief: 0.07,
    displayScale: 0.93,
    tilt: 0.15,
    turn: -0.12,
    caption: 'Human life returns to the rhythms of the biosphere.',
  },
  {
    id: 'S5',
    form: 'symbiosis',
    color: '#a5e1d0',
    ocean: '#6d9c9e',
    land: '#b5d0b3',
    highland: '#d2dec3',
    shore: '#88b7ad',
    cloud: 0,
    seed: 417,
    seaLevel: -0.38,
    relief: 0.05,
    displayScale: 0.84,
    tilt: -0.1,
    turn: 0.06,
    caption: 'Biology becomes a design space. Mars becomes a home.',
  },
  {
    id: 'S6',
    form: 'engineered',
    color: '#d0bded',
    ocean: '#7e718f',
    land: '#9a8aa9',
    highland: '#b8aac8',
    shore: '#8d799f',
    cloud: 0,
    seed: 601,
    seaLevel: -0.5,
    relief: 0.02,
    displayScale: 0.93,
    tilt: -0.25,
    turn: 0.1,
    caption: 'A precisely engineered world with little room for error.',
  },
  {
    id: 'S7',
    form: 'reclaimed',
    color: '#c8d6ac',
    ocean: '#6b8780',
    land: '#9caa74',
    highland: '#c9c59a',
    shore: '#b8b689',
    cloud: 1,
    seed: 218,
    seaLevel: -0.35,
    relief: 0.055,
    displayScale: 0.9,
    tilt: 0.12,
    turn: -0.06,
    caption: 'After collapse, a quieter technology takes root.',
  },
  {
    id: 'S8',
    form: 'fractured',
    color: '#d79d85',
    ocean: '#65485e',
    land: '#ba8878',
    highland: '#d8b39a',
    shore: '#936a6b',
    cloud: 0,
    seed: 852,
    seaLevel: -0.28,
    relief: 0.065,
    displayScale: 0.97,
    tilt: -0.24,
    turn: 0.04,
    caption: 'Cycles of collapse. Knowledge slipping out of reach.',
  },
  {
    id: 'S9',
    form: 'machine-swarm',
    color: '#9bc9e3',
    ocean: '#276e9b',
    land: '#97bf8b',
    highland: '#c0cfba',
    shore: '#a8c5c3',
    cloud: 2,
    seed: 563,
    seaLevel: -0.02,
    relief: 0.05,
    displayScale: 0.83,
    tilt: 0.24,
    turn: 0.12,
    caption: 'A quiet Earth. A machine civilization beyond it.',
  },
  {
    id: 'S10',
    form: 'duality',
    color: '#e0ccb0',
    ocean: '#3b8799',
    land: '#a0bf78',
    highland: '#d1c9a2',
    shore: '#bcc9a7',
    cloud: 2,
    seed: 946,
    seaLevel: -0.1,
    relief: 0.045,
    displayScale: 0.88,
    tilt: -0.15,
    turn: -0.12,
    caption: 'Earth is restored. Autonomous systems keep going.',
  },
];

export const chapters = [
  { id: 'first-light', label: 'First light', index: 0 },
  { id: 'possibilities', label: 'Ten possible worlds', index: 1 },
  ...worlds.map((world, i) => ({ id: world.id.toLowerCase(), label: world.id, index: i + 2 })),
  { id: 'observer', label: 'The other side', index: 12 },
  { id: 'invisible', label: 'Hidden in plain sight', index: 13 },
  { id: 'signals', label: 'Ways of seeing', index: 14 },
  { id: 'endurance', label: 'Civilizations breathe', index: 15 },
  { id: 'beyond', label: 'Keep looking', index: 16 },
];
