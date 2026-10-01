import * as THREE from 'three';
import type { EarthBrief } from '../earth';
import { satelliteCount } from '../encoding';
import { local } from '../kit';
import { onOrbit, orbitMatrix, type LayerBuilder } from '../model';
import type { Tone } from '../kit';
import { U } from '../props/library';
import { makeRoute } from '../scene/collect';
import { harbourLoops, roads } from '../scene/network';
import { citizens, earthFlora } from '../scene/presets';
import { farmland, harbour } from '../scene/sites';
import { arc } from '../scene/surface';
import { buildTown, type TownStyle } from '../scene/towns';

/**
 * S9 · Deus Ex Machina. "A nonbiological posthuman civilization emerges as sentient AI, leaves
 * Earth, builds megastructures across the Solar System… Net-zero technological gifts remain on
 * Earth to support a post-scarcity human economy."
 */
export function gift(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.solid.prism(m, 0.3 * s, 0.28 * s, 0.03 * s, 6, '#d9dcd6');
  layer.sheen.gem(local(m, 0, 0.03 * s, 0, 0.3), 0.14 * s, 0.9 * s, '#bfe9ff', 5, 0.3);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    layer.sheen.gem(
      local(m, Math.cos(a) * 0.2 * s, 0.03 * s, Math.sin(a) * 0.2 * s, a, 1, [
        Math.sin(a) * 0.25,
        Math.cos(a) * 0.25,
      ]),
      0.06 * s,
      0.35 * s,
      '#d7c9ff',
      4,
      0.3,
    );
  }
}

export function machineNode(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.sheen.gem(m, 0.35 * s, 0.9 * s, '#1f2230', 3, 0.5);
  layer.sheen.gem(
    local(m, 0, 0.45 * s, 0, Math.PI / 3, 1, [Math.PI, 0]),
    0.35 * s,
    0.9 * s,
    '#262a3b',
    3,
    0.5,
  );
  layer.glow.torus(
    local(m, 0, 0.45 * s, 0, 0, 1, [Math.PI / 2, 0]),
    0.5 * s,
    0.015 * s,
    '#6ff6ff',
    18,
    3,
  );
  layer.glow.gem(local(m, 0, 0.3 * s, 0), 0.06 * s, 0.3 * s, '#a78bff', 4);
}

export const s9: EarthBrief = {
  id: 'S9',
  seed: 909,
  facing: -18,
  tilt: 0.34,
  pitch: 0.12,
  relief: 0.06,
  climate: { sea: 0, iceLat: 69, aridity: 0, greenery: 0.25 },
  palette: {
    deep: '#164f7e',
    ocean: '#1f6fa6',
    shallows: '#45aac6',
    shore: '#e6d9ac',
    lowland: '#86be62',
    forest: '#2f7f45',
    jungle: '#236f3e',
    upland: '#a9c47c',
    mountain: '#958b7b',
    peak: '#fdfdfb',
    desert: '#e0c48a',
    tundra: '#a3b594',
    ice: '#f5f9fb',
    seaice: '#dfeef5',
  },
  clouds: { count: 32, tone: '#ffffff', speed: 0.012 },
  flora: earthFlora(
    {
      broad: ['#2c7a42', '#358a48', '#3f9a4d', '#216b3b'],
      conifer: ['#24603a', '#2a6a3e'],
      scrub: ['#86be62', '#a9c47c'],
      flowers: ['#ffffff', '#f6d36a', '#c46ad0', '#f0a8c8'],
    },
    1.6,
  ),
  fauna: {
    herds: [
      { kind: 'bison', biomes: ['lowland', 'tundra'], count: 16, size: [6, 12], roam: true },
      { kind: 'deer', biomes: ['forest', 'upland', 'jungle'], count: 26, size: [3, 7] },
      {
        kind: 'horse',
        biomes: ['lowland'],
        count: 8,
        size: [4, 9],
        roam: true,
        tints: ['#7a4a2a', '#d8c39a', '#3a2a20'],
      },
    ],
    flocks: { count: 26 },
    whales: 10,
    fish: { count: 20, tints: ['#c9d6dc', '#f2a03a', '#4fc0d0'] },
  },
  atmosphere: () => ({
    rim: '#8fd0ff',
    rimStrength: 1.05,
    haze: '#ffffff',
    hazeOpacity: 0,
    height: 1.035,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const { faces, random } = world;
    const linen: Tone[] = ['#f2efe6', '#d8e6d0', '#e8dcc4', '#c9d6e8', '#e6d0dc'];
    // No Table 6 surface value: people live lightly, without lights, roads or engines.
    const hamlet: TownStyle = {
      layout: 'camp',
      radius: 0.026,
      plaza: { radius: 2.2 * U, tone: '#c9dcb0', centre: [['crystal', 1, [0.9, 1.1]]] },
      lot: { spacing: 2 * U },
      core: [
        ['eco-dome', 3, [1, 1.1], ['#e8dcc4', '#d8e6d0']],
        ['greenhouse-dark', 1, [0.9, 1]],
      ],
      edge: [
        ['eco-dome', 2, [0.9, 1.1], ['#e8dcc4']],
        ['cottage-dark', 2, [1, 1.1], ['#efe6d2']],
        ['well', 0.5, [1, 1.2]],
        ['bench', 0.5, [1, 1.1]],
      ],
      people: { standing: 10, walking: 4, ...citizens, tints: linen },
      trees: {
        count: 10,
        kinds: ['oak', 'flowers', 'cypress'],
        tints: ['#3f8f4a', '#f0a8c8'],
        size: [1, 1.4],
      },
    };
    const land = faces.filter(
      (f) => f.land && ['lowland', 'forest', 'upland', 'shore'].includes(f.biome),
    );
    const towns = world
      .scatter(
        land.filter((f) => f.elevation < 0.4),
        16,
        16,
      )
      .map((face) => buildTown(world, face.up, hamlet));
    for (const town of towns)
      farmland(
        world,
        town.centre,
        town.radius * 2,
        ['#a8c87a', '#c9d68a'],
        [['vine', 1, [1.3, 1.3], ['#5f9a4a']]],
        0.35,
      );
    for (const [a, b] of roads(world, towns, {
      width: 0.5 * U,
      tone: '#c9b994',
      neighbours: 1,
      reach: 0.4,
    }))
      if (world.quality.life)
        world.traffic.add(
          'walker-1',
          makeRoute(arc(a.centre, b.centre, 0.004).map((d) => world.surface.point(d, 0.0003))),
          { count: 2, speed: 0.001, tints: linen, random },
        );
    const shores = towns
      .map((t) => harbour(world, t.centre, { boats: ['canoe'] }))
      .filter((p): p is THREE.Vector3 => !!p);
    harbourLoops(world, shores, { kinds: ['sailboat', 'canoe'], per: 1, speed: 0.0025 });

    // The gifts: quiet crystals, one of them the explorer's study.
    world
      .scatter(
        land.filter((f) => !f.used),
        7,
        28,
      )
      .forEach((face, i) => {
        face.used = true;
        gift(
          i === 0 ? world.layer('gift', 'surface', { landmark: 'gift' }) : world.ground,
          world.on(face, random() * 6),
          i === 0 ? 0.035 : 0.025,
        );
      });

    // Sparse machine nodes high above, on one inclined ring.
    const nodes = world.layer('machine-node', 'orbit', {
      landmark: 'machine-node',
      matrix: orbitMatrix(0.5, 0.8),
      motion: { kind: 'spin', speed: 0.02 },
    });
    const count = satelliteCount(earth.satellite_belt);
    world
      .layer('halo', 'orbit', { matrix: orbitMatrix(0.5, 0.8) })
      .glow.torus(new THREE.Matrix4(), 1.42, 0.0022, '#6ff6ff', 128, 3);
    for (let i = 0; i < count; i++) {
      const hero = i % Math.max(1, Math.round(count / 6)) === 0;
      machineNode(nodes, onOrbit(1.42, (i / count) * Math.PI * 2), hero ? 0.05 : 0.022);
    }
  },
};
