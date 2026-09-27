import type { MapPoint } from './planet-surface';
import type { WorldArt } from './worlds';
export const presentEarth: WorldArt = {
  id: 'Earth',
  form: 'origin',
  color: '#b4d4e1',
  ocean: '#2086aa',
  land: '#9ec876',
  highland: '#ccd98c',
  shore: '#d7d99b',
  cloud: 7,
  tilt: -0.2,
  turn: 0.1,
  seed: 1048,
  seaLevel: -0.02,
  relief: 0.055,
  displayScale: 1,
  caption: 'The one world we know. An illustrative starting point.',
};

/** Authored stream stays west of the inland airfield and reaches the southern coast. */
export const originRiver: MapPoint[] = [
  [40, 53],
  [30, 40],
  [24, 28],
  [22, 14],
  [30, 2],
  [39, -10],
];
