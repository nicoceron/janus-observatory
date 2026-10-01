import * as THREE from 'three';
import { type EarthBrief } from '../earth';
import { coveredFaces, lightShare, satelliteCount } from '../encoding';
import { local } from '../kit';
import { onOrbit, orbitMatrix, type LayerBuilder } from '../model';
import { tent, tree } from '../parts';
import type { Tone } from '../kit';
import { U } from '../props/library';
import { makeRoute } from '../scene/collect';
import { harbourLoops, roads } from '../scene/network';
import { citizens, earthFlora } from '../scene/presets';
import { farmland, harbour, setPieces, sprinkle } from '../scene/sites';
import { arc, offset } from '../scene/surface';
import { buildTown, type TownStyle } from '../scene/towns';

/**
 * S4 · Living with the Land. "After the peak of high technology, people live by subsistence,
 * simple tools, and artisanal crafts… settlements migrate with seasonal and planetary cycles."
 */
const hides = ['#c4955f', '#a7714a', '#d8b98a', '#8f6844'];

export function camp(
  layer: LayerBuilder,
  m: THREE.Matrix4,
  s: number,
  random: () => number,
  fire: boolean,
) {
  const count = 3 + Math.floor(random() * 3);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + random() * 0.4;
    tent(
      layer.solid,
      local(m, Math.cos(a) * 0.3 * s, 0, Math.sin(a) * 0.3 * s),
      0.26 * s,
      hides[i % hides.length],
    );
  }
  layer.solid.prism(m, 0.08 * s, 0.07 * s, 0.015 * s, 6, '#5d4a3a');
  if (fire) layer.glow.gem(local(m, 0, 0.015 * s, 0), 0.045 * s, 0.1 * s, '#ff9a3a', 4);
  layer.cloud.blob(local(m, 0.03 * s, 0.22 * s, 0), 0.05 * s, '#c9c6c0', 0.3, 7);
  layer.solid.box(local(m, -0.18 * s, 0, 0.05 * s, 0.4), 0.1 * s, 0.06 * s, 0.02 * s, '#7a5a3a');
}

export function relicTower(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  const lean = local(m, 0, 0, 0, 0.3, 1, [0.12, 0.08]);
  layer.solid.box(lean, 0.3 * s, 0.45 * s, 0.3 * s, '#8b8d88', '#4f7d3a');
  const upper = local(lean, 0.02 * s, 0.45 * s, 0, 0.2, 1, [0.1, -0.06]);
  layer.solid.box(upper, 0.26 * s, 0.35 * s, 0.26 * s, '#9a9c96', '#5b8a43');
  const broken = local(upper, -0.04 * s, 0.35 * s, 0.02 * s, 0.4, 1, [-0.2, 0.15]);
  layer.solid.box(broken, 0.18 * s, 0.14 * s, 0.2 * s, '#a4a59f', '#6a9a4a');
  for (const [x, y, z] of [
    [0.15, 0.2, 0.1],
    [-0.16, 0.5, -0.05],
    [0.12, 0.66, -0.13],
  ])
    layer.solid.blob(
      local(lean, x * s, y * s, z * s),
      0.09 * s,
      '#4f8a3c',
      0.35,
      Math.round(y * 100),
    );
  tree(layer.solid, local(broken, 0, 0.14 * s, 0), 'round', '#3f7f37', 0.22 * s);
  for (let i = 0; i < 5; i++)
    layer.solid.blob(
      local(m, (i - 2) * 0.13 * s, 0, (i % 2 ? 0.3 : -0.28) * s),
      0.06 * s,
      '#8d8e88',
      0.4,
      i + 3,
    );
}

export function stoneCircle(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.solid.prism(m, 0.5 * s, 0.5 * s, 0.01 * s, 12, '#9fae62');
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    layer.solid.box(
      local(m, Math.cos(a) * 0.38 * s, 0.01 * s, Math.sin(a) * 0.38 * s, -a),
      0.07 * s,
      (0.18 + (i % 3) * 0.04) * s,
      0.05 * s,
      '#9b978c',
      '#b4b0a4',
    );
  }
  layer.solid.box(local(m, 0, 0.01 * s, 0), 0.14 * s, 0.05 * s, 0.1 * s, '#88857c');
}

export const s4: EarthBrief = {
  id: 'S4',
  seed: 404,
  facing: 24,
  tilt: 0.36,
  pitch: 0.1,
  relief: 0.06,
  climate: { sea: 0, iceLat: 64, aridity: -0.08, greenery: 0.32 },
  palette: {
    deep: '#194e6a',
    ocean: '#236b86',
    shallows: '#3f99a0',
    shore: '#d8c695',
    lowland: '#a8b45c',
    forest: '#356f37',
    jungle: '#2a5f33',
    upland: '#8e9f5e',
    mountain: '#897b67',
    peak: '#f3f1ea',
    desert: '#d2af71',
    tundra: '#93a07f',
    ice: '#f2f6f8',
    seaice: '#d8e6ee',
  },
  clouds: { count: 30, tone: '#ffffff', speed: 0.012 },
  flora: earthFlora(
    {
      broad: ['#2f6a33', '#3a7a3a', '#467f3c', '#255d30'],
      conifer: ['#24502f', '#2a5a33'],
      scrub: ['#8fa05f', '#a6b35c', '#6f8f3e'],
      flowers: ['#f6d36a', '#ffffff', '#c46ad0', '#f0a8c8'],
    },
    1.5,
  ),
  fauna: {
    herds: [
      { kind: 'bison', biomes: ['lowland', 'tundra'], count: 16, size: [6, 12], roam: true },
      { kind: 'deer', biomes: ['forest', 'upland', 'tundra'], count: 22, size: [3, 7] },
      {
        kind: 'horse',
        biomes: ['lowland'],
        count: 8,
        size: [4, 8],
        roam: true,
        tints: ['#7a4a2a', '#d8c39a', '#3a2a20'],
      },
    ],
    flocks: { count: 22 },
    whales: 8,
    fish: { count: 16, tints: ['#c9d6dc', '#f2a03a'] },
  },
  atmosphere: () => ({
    rim: '#9fd2ff',
    rimStrength: 1,
    haze: '#ffffff',
    hazeOpacity: 0,
    height: 1.035,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const { faces, random } = world;
    // Set pieces: titans of the lost age, fallen and grown over by the returning forest.
    setPieces(world, [['titan-wreck', 1, [1, 1.15], ['#7a6a52', '#6a7a5a', '#8a7a62']]], 3, {
      spacing: 45,
      eligible: (f) => ['forest', 'jungle', 'upland', 'lowland'].includes(f.biome),
    });
    const lit = lightShare(earth.artificial_illumination);
    const hides: Tone[] = ['#c4955f', '#a7714a', '#d8b98a', '#8f6844', '#e8dcc4'];
    const cloth: Tone[] = ['#b3824f', '#8f6a44', '#c9a06a', '#7a5a3a', '#d8c39a', '#a8744a'];

    // Seasonal camps: tents, yurts and huts in rings around a fire, a totem at the edge.
    const campStyle: TownStyle = {
      layout: 'camp',
      radius: 0.065,
      plaza: { radius: 1.6 * U, tone: '#8a7a5a', centre: [['campfire', 1, [1.4, 1.6]]] },
      lot: { spacing: 2 * U },
      core: [
        ['tent', 3, [1, 1.2], hides],
        ['yurt', 1, [0.9, 1.1], hides],
      ],
      edge: [
        ['tent', 3, [1, 1.2], hides],
        ['hut', 2, [0.9, 1.1], ['#b38a5a', '#9a7a4a']],
        ['totem', 0.4, [1, 1.2]],
        ['haystack', 0.3, [0.6, 0.8]],
      ],
      people: {
        standing: 5,
        walking: 2,
        kinds: ['robed', 'robed', 'porter', ...citizens.kinds],
        walkers: ['robed-walk', 'porter'],
        tints: cloth,
      },
      trees: { count: 3, kinds: ['oak-small', 'bush'], size: [1, 1.3] },
    };
    const land = faces.filter(
      (f) => f.land && ['lowland', 'forest', 'tundra', 'upland', 'shore'].includes(f.biome),
    );
    const sites = world.scatter(
      land.filter((f) => f.elevation < 0.4),
      9,
      21,
    );
    const camps = sites.map((face) => buildTown(world, face.up, campStyle));
    camp(
      world.layer('camp', 'surface', {
        landmark: 'camp',
        motion: { kind: 'sway', amplitude: 0.02, period: 70 },
      }),
      world.on(sites[0], random() * 6),
      0.09,
      random,
      random() < lit * 1.4,
    );
    // Horses graze beside the camps; small plots of food grow near water.
    for (const town of camps) {
      sprinkle(
        world,
        offset(town.centre, random() * 6, town.radius * 1.6),
        2 * U,
        [['horse', 1, [1, 1.1], ['#7a4a2a', '#3a2a20', '#d8c39a']]],
        2,
      );
      if (random() < 0.5)
        farmland(
          world,
          town.centre,
          town.radius * 2.2,
          ['#b9b866', '#c6ae6a'],
          [['crop', 1, [1.2, 1.2], ['#a8b45c']]],
          0.3,
        );
    }

    // Migration: footpaths between neighbouring camps carry walkers and pack animals.
    for (const [a, b] of roads(world, camps, {
      width: 0.5 * U,
      tone: '#b8a37a',
      neighbours: 1,
      reach: 0.4,
    }))
      if (world.quality.life) {
        const path = arc(a.centre, b.centre, 0.004).map((dir) => world.surface.point(dir, 0.0004));
        world.traffic.add('porter', makeRoute(path), {
          count: 1,
          speed: 0.003,
          tints: cloth,
          random,
        });
        world.traffic.add('horse', makeRoute(path), {
          count: 1,
          speed: 0.003,
          tints: ['#7a4a2a', '#3a2a20'],
          random,
        });
      }

    // Canoes along the coast near shore camps.
    const shores = camps
      .map((t) => harbour(world, t.centre, {}))
      .filter((p): p is THREE.Vector3 => !!p);
    harbourLoops(world, shores, { kinds: ['canoe'], per: 1, speed: 0.004, size: 1.1 });

    // Ruins of the former high-technology age, reclaimed by forest.
    const forest = faces.filter(
      (f) => f.land && !f.used && ['forest', 'jungle', 'upland'].includes(f.biome),
    );
    for (const face of world.scatter(forest, 6, 22)) {
      sprinkle(
        world,
        face.up,
        3 * U,
        [
          ['ruin-wall', 2, [1, 1.3], ['#7a8a6a', '#8a8d84']],
          ['ruin-tower', 1, [0.8, 1.1], ['#7d8a70', '#8a8d84']],
          ['broken-pylon', 0.6, [0.8, 1]],
          ['robot-wreck', 1.2, [1, 1.3], ['#7a6a52', '#6a7a5a']],
        ],
        2,
      );
      sprinkle(
        world,
        face.up,
        4 * U,
        [
          ['oak', 1, [1.1, 1.5], ['#3a7a3a']],
          ['bush', 1, [1, 1.4], ['#4f8a3a']],
        ],
        3,
      );
    }
    const ruin = world.faceAt(8, 30);
    ruin.used = true;
    relicTower(
      world.layer('relic-tower', 'surface', { landmark: 'relic-tower' }),
      world.on(ruin),
      0.18,
    );

    // The published surface modification is tiny: a few ritual grounds.
    const circles = world.scatter(
      land.filter((f) => !f.used),
      coveredFaces(earth.surface_modification, faces.length),
      25,
    );
    circles.forEach((face, i) => {
      face.used = true;
      stoneCircle(
        i === 0
          ? world.layer('stone-circle', 'surface', { landmark: 'stone-circle' })
          : world.ground,
        world.on(face),
        0.08,
      );
      if (world.quality.life)
        for (let k = 0; k < 3; k++)
          world.props.add(
            'robed',
            world.surface.point(offset(face.up, (k / 3) * Math.PI * 2, 2.4 * U), 0),
            face.up.clone().sub(offset(face.up, (k / 3) * Math.PI * 2, 2.4 * U)),
            1,
            world.random.pick(cloth),
          );
    });

    // One derelict satellite: the belt value is a small fraction of today's.
    const relic = world.layer('relic-satellite', 'orbit', {
      matrix: orbitMatrix(1.2, 0.5),
      motion: { kind: 'spin', speed: 0.03 },
    });
    for (let i = 0; i < satelliteCount(earth.satellite_belt); i++) {
      const m = onOrbit(1.24, i * 2.4 + 1).multiply(new THREE.Matrix4().makeRotationX(0.8));
      relic.solid.box(m, 0.014, 0.018, 0.014, '#7b7670');
      relic.solid.panel(
        local(m, 0.03, 0.01, 0, 0, 1, [0.4, 1.3]),
        0.012,
        0.04,
        '#3a4150',
        '#6b6560',
      );
    }
  },
};
