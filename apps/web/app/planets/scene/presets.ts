import type { Tone } from '../kit';
import { U } from '../props/library';
import { citizenKinds, walkerKinds } from '../props/people';
import type { Flora } from './wilds';
import type { TownStyle } from './towns';

/** Foliage tints per world: [forest, jungle, conifer, scrub, flowers]. */
export type Leaves = { broad: Tone[]; conifer: Tone[]; scrub: Tone[]; flowers: Tone[] };

/** Temperate-to-tropical Earth vegetation, thinned or thickened by `lush`. */
export function earthFlora(leaves: Leaves, lush = 1): Flora {
  const { broad, conifer, scrub, flowers } = leaves;
  return {
    forest: {
      per: 4.5 * lush,
      picks: [
        ['oak', 4, [1.1, 1.7], broad],
        ['oak-small', 2, [1.0, 1.4], broad],
        ['birch', 1.5, [1.0, 1.5], broad],
        ['pine', 2, [1.1, 1.6], conifer],
        ['bush', 1.5, [0.9, 1.3], scrub],
        ['flowers', 0.6, [1, 1.4], flowers],
      ],
    },
    jungle: {
      per: 6 * lush,
      picks: [
        ['palm', 3, [1.1, 1.6], broad],
        ['oak', 3, [1.3, 1.9], broad],
        ['cypress', 1, [1.1, 1.5], broad],
        ['bush', 3, [1.0, 1.5], broad],
      ],
    },
    upland: {
      per: 3 * lush,
      picks: [
        ['pine', 3, [1.0, 1.5], conifer],
        ['pine-tall', 2, [1.0, 1.4], conifer],
        ['rocks', 1, [1.0, 1.6]],
        ['shrub', 1, [1, 1.4], scrub],
      ],
    },
    tundra: {
      per: 1.6 * lush,
      picks: [
        ['spruce', 3, [0.9, 1.3], conifer],
        ['rocks', 1.5, [1, 1.6]],
        ['shrub', 1.5, [0.8, 1.2], scrub],
      ],
    },
    lowland: {
      per: 2.4 * lush,
      picks: [
        ['grass', 4, [1.2, 1.8], scrub],
        ['bush', 2, [0.9, 1.3], scrub],
        ['oak-small', 1.5, [1.0, 1.5], broad],
        ['flowers', 1.5, [1.1, 1.5], flowers],
      ],
    },
    shore: {
      per: 1.2 * lush,
      picks: [
        ['palm', 2, [1.0, 1.5], broad],
        ['grass', 2, [1.2, 1.6], scrub],
        ['reeds', 1, [1, 1.4]],
      ],
    },
    desert: {
      per: 0.9,
      picks: [
        ['cactus', 1.5, [0.9, 1.4]],
        ['rocks', 2, [1, 1.8]],
        ['shrub', 2, [0.8, 1.2], ['#9a8f5a']],
        ['dead-tree', 0.6, [0.9, 1.3]],
      ],
    },
    mountain: { per: 1.4, picks: [['rocks', 2, [1.2, 2]], ['boulder', 1.5, [1.2, 2]], ['pine', 1, [0.9, 1.2], conifer]] },
    peak: { per: 0.5, picks: [['boulder', 1, [1.2, 2], ['#e8eaec']]] },
    ice: { per: 0.3, picks: [['ice-block', 1, [1.5, 2.5]]] },
  };
}

/** A depleted biosphere: dead trees, scrub and bare rock. */
export function bareFlora(scrub: Tone[], lush = 1): Flora {
  return {
    forest: { per: 1.6 * lush, picks: [['dead-tree', 3, [1, 1.5]], ['shrub', 2, [0.8, 1.2], scrub], ['oak-small', 1, [0.9, 1.2], scrub]] },
    jungle: { per: 2 * lush, picks: [['dead-tree', 2, [1, 1.5]], ['bush', 2, [0.9, 1.3], scrub]] },
    lowland: { per: 1 * lush, picks: [['shrub', 3, [0.8, 1.2], scrub], ['stump', 1, [1, 1.3]], ['grass', 2, [1, 1.4], scrub]] },
    upland: { per: 1 * lush, picks: [['rocks', 2, [1, 1.6]], ['dead-tree', 1, [0.9, 1.3]]] },
    tundra: { per: 0.6, picks: [['rocks', 1, [1, 1.5]], ['shrub', 1, [0.8, 1.1], scrub]] },
    desert: { per: 0.8, picks: [['rocks', 2, [1, 1.8]], ['dead-tree', 1, [0.9, 1.3]]] },
    shore: { per: 0.5, picks: [['reeds', 1, [1, 1.3], scrub], ['rocks', 1, [1, 1.4]]] },
    mountain: { per: 1.2, picks: [['rocks', 2, [1.2, 2]], ['boulder', 1, [1.2, 2]]] },
  };
}

export const casual: Tone[] = ['#4f7fbf', '#c4452f', '#e0a830', '#2e9e6e', '#8a62e0', '#f2efe6', '#3a3d44', '#e07aa0'];
export const earthy: Tone[] = ['#8a6a44', '#b3824f', '#6a7a4a', '#a8744a', '#d8c39a', '#5a4a3a'];
export const carColours: Tone[] = ['#c4452f', '#3d6fb5', '#e6e8ea', '#2a2d33', '#e0a830', '#2e9e6e', '#8a8f96'];

export const citizens = { kinds: citizenKinds, walkers: walkerKinds };

/** A modern city with a rising core, mixed edge, traffic, lamps, parks and a plaza. */
export function cityStyle(radius = 0.075): TownStyle {
  return {
    layout: 'grid',
    radius,
    block: 11 * U,
    street: { width: 1.7 * U, tone: '#4a4d54' },
    plaza: { radius: 3 * U, tone: '#c9c3b5', centre: [['fountain', 1, [1.4, 1.8]], ['statue', 1, [1.4, 1.8]]] },
    lot: { spacing: 2.6 * U },
    core: [
      ['skyscraper', 3, [0.9, 1.3]],
      ['tower', 3, [0.8, 1.2], ['#c9ccd2', '#e3dccf', '#b9c4cf']],
      ['apartment', 2, [1, 1.3], ['#d9d4c8', '#c9a88a', '#b9c4cf']],
      ['hall', 0.4, [1, 1.2]],
    ],
    edge: [
      ['house', 3, [1, 1.2], ['#efe4cf', '#e3d0b0', '#f2efe8', '#d9c3a0']],
      ['house-slate', 2, [1, 1.2], ['#e3e6e8', '#f2e6d0']],
      ['apartment', 1.5, [0.8, 1.1], ['#d9d4c8', '#c9cdd2']],
      ['house-flat', 1, [1, 1.2]],
      ['warehouse', 0.6, [0.9, 1.1]],
      ['factory', 0.4, [0.9, 1.1]],
    ],
    rise: (r) => (r < 0.25 ? 1.2 : r < 0.5 ? 1.05 : 1),
    people: { standing: 16, walking: 3, ...citizens, tints: casual },
    cars: { count: 3, kinds: ['car', 'car', 'taxi', 'van', 'bus'], tints: carColours },
    trees: { count: 14, kinds: ['oak', 'oak-small', 'birch'], size: [1, 1.4] },
    lamps: 'lamp',
  };
}

/** A farming village: a lane or three, houses, barns, silos and haystacks. */
export function villageStyle(radius = 0.04, roofs: 'mixed' | 'cottage' = 'mixed'): TownStyle {
  return {
    layout: 'radial',
    radius,
    streets: 3,
    street: { width: 1.2 * U, tone: '#a89a7a' },
    plaza: { radius: 2 * U, tone: '#c9b994', centre: [['well', 1, [1.3, 1.6]]] },
    lot: { spacing: 2.4 * U },
    core: roofs === 'cottage' ? [['cottage-dark', 3, [1, 1.2]], ['house-dark', 1, [1, 1.1]], ['market', 1, [1, 1.2]]] : [['house', 3, [1, 1.2]], ['house-brown', 2, [1, 1.1]], ['hall', 0.4, [0.8, 0.9]]],
    edge: roofs === 'cottage'
      ? [['cottage-dark', 3, [1, 1.2]], ['barn-dark', 1.5, [1, 1.2]], ['haystack', 1, [1, 1.4]], ['windmill', 0.5, [0.9, 1.1]]]
      : [['house-brown', 2, [1, 1.2]], ['barn', 1.5, [1, 1.2]], ['silo', 1, [0.9, 1.1]], ['haystack', 1, [1, 1.4]]],
    people: { standing: 6, walking: 2, ...citizens, tints: earthy },
    trees: { count: 8, kinds: ['oak', 'oak-small'], size: [1.1, 1.5] },
  };
}

export { citizenKinds, walkerKinds };
