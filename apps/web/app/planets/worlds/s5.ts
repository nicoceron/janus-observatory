import * as THREE from 'three';
import { claim, type EarthBrief } from '../earth';
import { coveredFaces, lightShare, satelliteCount } from '../encoding';
import { local } from '../kit';
import { fibonacci, type LayerBuilder } from '../model';
import { orderedSwarm } from '../orbits';
import type { Tone } from '../kit';
import { U } from '../props/library';
import { makeRoute } from '../scene/collect';
import { flights, harbourLoops, seaLanes } from '../scene/network';
import { harbour, setPieces } from '../scene/sites';
import { offset } from '../scene/surface';
import { buildTown, type TownStyle } from '../scene/towns';

/**
 * S5 · Transhumanism. "Breakthrough technologies remove resource scarcity on Earth and Mars. The
 * biosphere is reengineered, Mars is terraformed, and biosynthetic enhancement accompanies
 * renewed space exploration."
 */
const cellTones = ['#cc4fbd', '#7d55d8', '#96d64a', '#2fbf9c', '#eab846', '#4aa8e8', '#e87aa0'];
const reefTones = ['#1a8fb0', '#22a7b8', '#138aa0', '#2bb5a8'];
const glowTones = ['#b8fff0', '#ffb8f0', '#e8ffa8'];

export function bloomSpire(layer: LayerBuilder, m: THREE.Matrix4, s: number, tone: string) {
  layer.solid.prism(m, 0.16 * s, 0.07 * s, 0.35 * s, 7, '#efe6f5');
  layer.sheen.dome(local(m, 0, 0.3 * s, 0), 0.2 * s, tone, 7, 2, 1.1);
  layer.solid.prism(local(m, 0, 0.5 * s, 0), 0.06 * s, 0.04 * s, 0.3 * s, 7, '#efe6f5');
  layer.sheen.dome(local(m, 0, 0.76 * s, 0), 0.13 * s, tone, 7, 2, 1.2);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    layer.solid.gem(
      local(m, Math.cos(a) * 0.1 * s, 0.84 * s, Math.sin(a) * 0.1 * s, -a, 1, [0, 0.9]),
      0.05 * s,
      0.26 * s,
      '#f6d9f2',
      3,
    );
  }
  layer.glow.gem(local(m, 0, 0.9 * s, 0), 0.05 * s, 0.2 * s, '#b8fff0', 5);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    layer.sheen.dome(
      local(m, Math.cos(a) * 0.24 * s, 0, Math.sin(a) * 0.24 * s),
      0.08 * s,
      tone,
      6,
      1,
      1.3,
    );
    layer.glow.box(
      local(m, Math.cos(a) * 0.24 * s, 0.1 * s, Math.sin(a) * 0.24 * s),
      0.03 * s,
      0.03 * s,
      0.03 * s,
      '#ffb8f0',
    );
  }
}

export function gardenCell(layer: LayerBuilder, m: THREE.Matrix4, s: number, tone: string) {
  layer.solid.prism(m, 0.5 * s, 0.48 * s, 0.06 * s, 6, '#efe6f5', tone);
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = i === 6 ? 0 : 0.28 * s;
    layer.sheen.gem(
      local(m, Math.cos(a) * r, 0.06 * s, Math.sin(a) * r, a),
      0.07 * s,
      0.22 * s,
      i % 2 ? '#a6e05a' : '#3cc9a8',
      4,
      0.6,
    );
  }
}

export function seedPods(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const pod = local(m, Math.cos(a) * 0.25 * s, 0, Math.sin(a) * 0.25 * s, 0, 1, [
      Math.sin(a) * 0.3,
      Math.cos(a) * 0.3,
    ]);
    layer.solid.prism(pod, 0.03 * s, 0.03 * s, 0.18 * s, 5, '#efe6f5');
    layer.sheen.gem(local(pod, 0, 0.14 * s, 0), 0.1 * s, 0.3 * s, '#d35fc4', 6, 0.5);
    layer.glow.gem(local(pod, 0, 0.2 * s, 0), 0.045 * s, 0.14 * s, '#ffb8f0', 5);
  }
}

export const s5: EarthBrief = {
  id: 'S5',
  seed: 505,
  facing: 110,
  tilt: -0.3,
  pitch: 0.3,
  relief: 0.05,
  climate: { sea: 0, iceLat: 77, aridity: -0.3, greenery: 0.3 },
  palette: {
    deep: '#0f4f78',
    ocean: '#147aa0',
    shallows: '#2cc3c2',
    shore: '#e8d9f0',
    lowland: '#6fd08c',
    forest: '#2fae8a',
    jungle: '#1f9a86',
    upland: '#a7e070',
    mountain: '#9f8fd0',
    peak: '#f4ecff',
    desert: '#e9c6e8',
    tundra: '#9fd8c8',
    ice: '#f0f4ff',
    seaice: '#d4f0f4',
  },
  clouds: { count: 22, tone: '#f6f0ff', speed: 0.016 },
  flora: {
    forest: {
      per: 4,
      picks: [
        ['bio-tree', 3, [1.1, 1.6], ['#c46ad0', '#8a62e0', '#3cc9a8']],
        ['bio-shroom', 2, [1.2, 1.7], ['#6fe0c8', '#d35fc4']],
        ['oak', 1, [1.1, 1.5], ['#2fae8a']],
      ],
    },
    jungle: {
      per: 5,
      picks: [
        ['bio-tree', 3, [1.2, 1.7], ['#d35fc4', '#3cc9a8']],
        ['palm', 2, [1.2, 1.6], ['#1f9a86']],
        ['bio-shroom', 2, [1.2, 1.7], ['#6fe0c8']],
      ],
    },
    lowland: {
      per: 2.5,
      picks: [
        ['flowers', 3, [1.2, 1.6], ['#f0a8c8', '#b8fff0', '#f6d36a', '#c46ad0']],
        ['bio-shroom', 1, [1, 1.4], ['#6fe0c8']],
        ['grass', 2, [1.2, 1.6], ['#a6e05a']],
      ],
    },
    upland: {
      per: 2,
      picks: [
        ['bio-tree', 1, [1, 1.4], ['#8a62e0']],
        ['rocks', 1, [1, 1.5], ['#9f8fd0']],
        ['flowers', 1, [1.2, 1.5], ['#e8d9f0']],
      ],
    },
    shore: {
      per: 1.5,
      picks: [
        ['palm', 2, [1, 1.4], ['#3cc9a8']],
        ['flowers', 1, [1.2, 1.5], ['#f0a8c8']],
      ],
    },
    desert: {
      per: 1,
      picks: [
        ['bio-shroom', 1, [1, 1.4], ['#e9c6e8']],
        ['cactus', 1, [1, 1.3], ['#c46ad0']],
      ],
    },
    tundra: {
      per: 1,
      picks: [
        ['bio-shroom', 1, [0.9, 1.3], ['#9fd8c8']],
        ['shrub', 1, [0.8, 1.2], ['#9fd8c8']],
      ],
    },
    mountain: { per: 0.8, picks: [['rocks', 1, [1.2, 2], ['#9f8fd0']]] },
  },
  fauna: {
    herds: [
      {
        kind: 'deer',
        biomes: ['forest', 'lowland'],
        count: 10,
        size: [3, 5],
        tints: ['#e9e2f5', '#c46ad0'],
      },
    ],
    flocks: { count: 14, tints: ['#f0a8c8', '#b8fff0', '#f6d36a'] },
    whales: 5,
    fish: { count: 20, tints: ['#f07a9a', '#b8fff0', '#f0c75a'] },
  },
  atmosphere: () => ({
    rim: '#9ff0ff',
    rimStrength: 1.25,
    haze: '#ffffff',
    hazeOpacity: 0,
    height: 1.035,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const { faces, random } = world;
    // Set pieces: bio-spires grown from the engineered cells, hung with luminous pods.
    setPieces(world, [['bio-spire', 1, [1.2, 1.35], cellTones]], 4, {
      spacing: 40,
      escort: ['robot', 1, [1, 1], ['#e9e2f5', '#d9f2ec']],
      escorts: 1,
    });
    const lit = lightShare(earth.artificial_illumination);
    // Designed cells: a Voronoi patchwork over the whole sphere, one palette colour per cell.
    const seeds = Array.from({ length: 90 }, (_, i) => fibonacci(90, i, 0.4, random));
    const cellOf = (up: THREE.Vector3) => {
      let best = 0,
        score = -2;
      seeds.forEach((seed, i) => {
        const d = seed.dot(up);
        if (d > score) {
          score = d;
          best = i;
        }
      });
      return best;
    };
    const modified = claim(faces, coveredFaces(earth.surface_modification, faces.length), (f) =>
      f.biome === 'ice' || f.biome === 'peak' ? null : 1 - Math.abs(f.lat) / 90 + random() * 0.05,
    );
    for (const face of modified) {
      const cell = cellOf(face.up);
      face.tone = face.land
        ? cellTones[cell % cellTones.length]
        : reefTones[cell % reefTones.length];
    }

    // Biosynthetic cities: grown towers and pod dwellings along luminous paths.
    const enhanced: Tone[] = ['#e9e2f5', '#d9f2ec', '#f5e2ef', '#e2f0d9'];
    const bio: TownStyle = {
      layout: 'radial',
      radius: 0.13,
      streets: 4,
      street: { width: 1.3 * U, tone: '#9a8ab8' },
      plaza: { radius: 3 * U, tone: '#d9f2ec', centre: [['bio-tree', 1, [1.6, 2]]] },
      lot: { spacing: 2.4 * U },
      core: [
        ['bio-tower', 3, [0.7, 0.9], cellTones],
        ['spire', 1.2, [0.6, 0.75], cellTones],
        ['bio-pod', 2, [1, 1.2], cellTones],
      ],
      edge: [
        ['bio-pod', 4, [0.9, 1.2], cellTones],
        ['dome-house', 1, [1, 1.1], ['#efe6f5', '#d9f2ec']],
        ['pod-house', 1.5, [0.9, 1.1], ['#efe6f5', '#d9f2ec', '#f5e2ef']],
        ['bio-shroom', 1, [1.4, 1.8], ['#6fe0c8', '#d35fc4']],
      ],
      rise: (r) => (r < 0.35 ? 1.1 : 1),
      people: {
        standing: 6,
        walking: 2,
        kinds: ['enhanced', 'enhanced', 'robot'],
        walkers: ['enhanced', 'robot-walk'],
        tints: enhanced,
      },
      trees: {
        count: 8,
        kinds: ['bio-tree', 'bio-shroom', 'flowers'],
        tints: ['#c46ad0', '#6fe0c8', '#f6d36a'],
        size: [1.1, 1.5],
      },
      lamps: 'lamp',
    };
    const land = modified.filter((f) => f.land && f.elevation < 0.45);
    const towns = world
      .scatter(land, Math.round(10 * Math.max(0.5, world.quality.density)), 24)
      .map((face) => buildTown(world, face.up, bio));
    if (world.quality.life)
      for (const town of towns) {
        const loop: THREE.Vector3[] = [];
        for (let i = 0; i < 18; i++)
          loop.push(
            offset(town.centre, (i / 18) * Math.PI * 2, town.radius * 0.9).multiplyScalar(1.13),
          );
        world.traffic.add('glider', makeRoute(loop, true), {
          count: 1,
          speed: 0.006,
          size: 1.5,
          tints: cellTones,
          pingpong: false,
          random,
        });
      }
    flights(
      world,
      towns.map((t) => t.centre),
      { kinds: ['glider'], per: 1, speed: 0.02, size: 1.4, tints: cellTones },
      3,
      0.1,
    );

    const centre = world.faceAt(28, 112);
    centre.used = true;
    bloomSpire(
      world.layer('bloom-spire', 'surface', { landmark: 'bloom-spire' }),
      world.on(centre),
      0.24,
      '#d35fc4',
    );
    const pods =
      world.around(centre, 14).find((f) => f.land && f !== centre && !f.used) ??
      faces[centre.neighbours[0]];
    seedPods(world.layer('seed-pods', 'surface', { landmark: 'seed-pods' }), world.on(pods), 0.1);
    const cell = world.around(centre, 20).find((f) => f.land && !f.used && f !== pods) ?? pods;
    gardenCell(
      world.layer('garden-cell', 'surface', { landmark: 'garden-cell' }),
      world.on(cell, random() * 6),
      0.09,
      '#96d64a',
    );
    for (const face of world.scatter(
      land.filter((f) => !f.used),
      Math.round(10 * world.quality.density),
      18,
    ))
      gardenCell(
        world.ground,
        world.on(face, random() * 6),
        0.06,
        cellTones[cellOf(face.up) % cellTones.length],
      );

    // Luminous reefs: coral, light and skiffs across engineered seas, scaled by illumination.
    const seas = modified.filter((f) => !f.land);
    for (const face of seas) {
      if (random() < lit * 0.02 * world.quality.density) {
        const m = world.on(face, random() * 6, 1, 0);
        world.ground.solid.prism(m, 0.012, 0.011, 0.004, 6, '#efe6f5', '#7fe0d0');
        world.ground.glow.prism(
          local(m, 0, 0.004, 0),
          0.005,
          0.005,
          0.002,
          6,
          random.pick(glowTones),
        );
      }
      if (face.biome === 'shallows' && random() < 0.1 * world.quality.density)
        for (let k = 0; k < 1; k++)
          world.props.add(
            'coral',
            offset(face.up, random() * 6, random() * face.size * 0.3).multiplyScalar(0.9995),
            null,
            1.4,
            random.pick(['#f07a9a', '#f0c75a', '#c46ad0', '#7fe0d0']),
          );
    }
    const shores = towns
      .map((t) => harbour(world, t.centre, { boats: ['bio-skiff'] }))
      .filter((p): p is THREE.Vector3 => !!p);
    harbourLoops(world, shores, { kinds: ['bio-skiff'], per: 1, speed: 0.005, tints: cellTones });
    seaLanes(world, shores, {
      kinds: ['bio-skiff'],
      per: 1,
      speed: 0.006,
      size: 1.4,
      tints: cellTones,
    });
    for (const face of land)
      if (random() < lit * 0.05 * world.quality.density)
        world.ground.glow.gem(world.within(face), 0.005, 0.014, random.pick(glowTones), 4);

    orderedSwarm(
      world,
      satelliteCount(earth.satellite_belt),
      [
        { inclination: 0.35, node: 0.3, speed: 0.05, radius: 1.18 },
        { inclination: -0.35, node: 1.9, speed: -0.05, radius: 1.24 },
      ],
      { size: 0.01, body: '#efe6f5', wings: '#3cc9a8', light: '#ffb8f0' },
    );
  },
};
