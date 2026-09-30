import * as THREE from 'three';
import { claim, type EarthBrief } from '../earth';
import { coveredFaces, decades, hazeStrength, lightShare, satelliteCount } from '../encoding';
import { local } from '../kit';
import type { Face } from '../globe';
import type { LayerBuilder } from '../model';
import { chaoticSwarm } from '../orbits';
import { mast, rocks } from '../parts';

/**
 * S2 · Wild West. "Competition for scarce resources is entrenched. The technosphere and
 * biosphere remain in fragile dependency amid climate stress, inequality, and unrest."
 */
const companies = ['#d0493a', '#3a68d0', '#e0a52e', '#2e9e6e', '#9a4ad0', '#e0689a'];

export function enclave(
  layer: LayerBuilder,
  m: THREE.Matrix4,
  s: number,
  colour: string,
  lit: number,
  random: () => number,
) {
  layer.solid.prism(m, 0.5 * s, 0.5 * s, 0.03 * s, 8, '#8c8780', '#77736d', Math.PI / 8);
  // Perimeter wall with corner guard towers.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const m2 = local(m, Math.cos(a) * 0.5 * s, 0, Math.sin(a) * 0.5 * s, -a + Math.PI / 2);
    layer.solid.box(m2, 0.4 * s, 0.09 * s, 0.035 * s, '#6f6a63');
    if (i % 2 === 0) layer.solid.box(m2, 0.07 * s, 0.14 * s, 0.07 * s, '#5c5852');
  }
  const towers: [number, number, number][] = [
    [0, 0, 1.25],
    [0.22, 0.12, 0.7],
    [-0.2, 0.16, 0.55],
    [-0.08, -0.24, 0.8],
    [0.2, -0.18, 0.5],
  ];
  for (const [x, z, h] of towers) {
    const t = local(m, x * s, 0.03 * s, z * s, random() * 0.3);
    layer.sheen.box(t, 0.12 * s, h * s, 0.12 * s, colour, '#2d3238');
    if (random() < lit)
      layer.glow.box(
        local(t, 0, h * s * 0.55, 0.061 * s),
        0.08 * s,
        h * s * 0.3,
        0.002 * s,
        '#ffe3a0',
      );
  }
  layer.sheen.gem(local(m, 0, 1.28 * s, 0), 0.07 * s, 0.25 * s, colour);
}

export function pitMine(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.solid.prism(m, 0.55 * s, 0.5 * s, 0.05 * s, 9, '#a06a42', '#7a4e32');
  layer.solid.prism(
    local(m, 0, 0.05 * s, 0),
    0.42 * s,
    0.38 * s,
    0.012 * s,
    9,
    '#7a4e32',
    '#643f29',
  );
  layer.solid.prism(
    local(m, 0, 0.062 * s, 0),
    0.3 * s,
    0.26 * s,
    0.01 * s,
    9,
    '#643f29',
    '#4e3122',
  );
  layer.solid.prism(local(m, 0, 0.072 * s, 0), 0.16 * s, 0.14 * s, 0.004 * s, 9, '#2f3c3f');
  layer.solid.prism(local(m, 0.7 * s, 0, 0.1 * s), 0.25 * s, 0, 0.22 * s, 6, '#b27a4d');
  layer.solid.box(
    local(m, 0.35 * s, 0.05 * s, -0.3 * s, 0.4),
    0.14 * s,
    0.07 * s,
    0.08 * s,
    '#e0b030',
    '#c79a28',
  );
}

export function offshoreRig(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ])
    layer.solid.prism(
      local(m, x * 0.2 * s, 0, z * 0.2 * s),
      0.035 * s,
      0.035 * s,
      0.35 * s,
      5,
      '#8f8a82',
    );
  layer.solid.box(local(m, 0, 0.35 * s, 0), 0.6 * s, 0.07 * s, 0.6 * s, '#cc5a33', '#6c6c6c');
  layer.solid.box(
    local(m, -0.12 * s, 0.42 * s, -0.1 * s),
    0.25 * s,
    0.14 * s,
    0.22 * s,
    '#e6e0d4',
    '#bbb4a6',
  );
  mast(layer.solid, local(m, 0.15 * s, 0.42 * s, 0.15 * s), 0.55 * s, '#d9c24a');
  layer.solid.prism(
    local(m, -0.25 * s, 0.42 * s, 0.25 * s, 0, 1, [0.5, 0]),
    0.018 * s,
    0.018 * s,
    0.4 * s,
    4,
    '#6a6a6a',
  );
  layer.glow.gem(
    local(m, -0.25 * s, 0.42 * s, 0.25 * s, 0, 1, [0.5, 0]).multiply(
      new THREE.Matrix4().makeTranslation(0, 0.4 * s, 0),
    ),
    0.05 * s,
    0.16 * s,
    '#ff8a2a',
    5,
  );
}

export const s2: EarthBrief = {
  id: 'S2',
  seed: 202,
  facing: 22,
  tilt: -0.28,
  pitch: 0.25,
  relief: 0.06,
  climate: { sea: 0.08, iceLat: 81, aridity: 0.36, greenery: -0.3 },
  palette: {
    deep: '#22475a',
    ocean: '#2c5c6a',
    shallows: '#4a7f78',
    shore: '#c9a370',
    lowland: '#b39a5c',
    forest: '#6a7a3e',
    jungle: '#58733a',
    upland: '#b88857',
    mountain: '#976746',
    peak: '#d6c1a3',
    desert: '#d4975a',
    tundra: '#a4987a',
    ice: '#e6eaea',
    seaice: '#cdd9dc',
  },
  clouds: { count: 18, tone: '#d9b683', speed: 0.02, size: 0.07, flat: 0.28 },
  forest: { count: 50, tones: { forest: '#5e6f36', jungle: '#4f6a34' } },
  atmosphere: (signals) => ({
    rim: '#e7b27a',
    rimStrength: 1,
    haze: '#a57a4c',
    hazeOpacity:
      hazeStrength(
        signals.bodies.Earth.industrial_pollution,
        signals.bodies.Earth.contaminated_aerosol,
      ) * 0.2,
    height: 1.035,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const { faces, random } = world;
    const lit = lightShare(earth.artificial_illumination);
    const land = faces.filter((f) => f.land && f.biome !== 'ice');

    // Monoculture: the agricultural-pollution decade sets how much green land is ploughed flat.
    const plough = Math.round(land.length * decades(earth.agricultural_pollution, 0.1, 100) * 0.35);
    for (const face of claim(faces, plough, (f) =>
      f.land && ['lowland', 'forest', 'jungle', 'shore'].includes(f.biome) ? random() : null,
    )) {
      face.used = true;
      face.tone = random() < 0.5 ? '#d8c25c' : '#b9b04a';
      const rows = world.aligned(face);
      for (let r = -1; r <= 1; r++)
        if (world.thin(0.8))
          world.ground.solid.box(
            local(rows, 0, 0, r * face.size * 0.14),
            face.size * 0.5,
            face.size * 0.02,
            face.size * 0.05,
            '#9a9a3a',
          );
    }

    // Surface modification: a few rival enclaves and many mines.
    const target = coveredFaces(earth.surface_modification, faces.length);
    const seats = world.scatter(
      land.filter((f) => f.elevation < 0.45),
      companies.length,
      28,
    );
    const owned: Face[] = [];
    seats.forEach((seat, i) => {
      const colour = companies[i];
      const holding = world
        .around(seat, 9)
        .filter((f) => f.land && !f.used)
        .slice(0, Math.max(3, Math.round((target * 0.45) / seats.length)));
      for (const face of holding) {
        face.used = true;
        face.tone = '#8a857d';
        owned.push(face);
        if (face === seat) continue;
        for (let k = 0; k < (world.quality.density < 0.6 ? 1 : 2); k++) {
          const t = world.within(face, random() * 6);
          const h = face.size * random.range(0.2, 0.6);
          world.ground.sheen.box(t, face.size * 0.16, h, face.size * 0.16, colour, '#2d3238');
          if (random() < lit)
            world.ground.glow.box(
              local(t, 0, h * 0.5, face.size * 0.051),
              face.size * 0.07,
              h * 0.3,
              0.001,
              '#ffe3a0',
            );
        }
      }
      const layer =
        i === 0 ? world.layer('enclave', 'surface', { landmark: 'enclave' }) : world.ground;
      enclave(layer, world.on(seat, random() * 6), i === 0 ? 0.11 : 0.085, colour, lit, random);
    });

    const mines = claim(faces, Math.max(1, target - owned.length), (f) =>
      f.land && ['desert', 'upland', 'mountain', 'lowland'].includes(f.biome)
        ? random() + (f.biome === 'desert' ? 0.4 : 0)
        : null,
    );
    mines.forEach((face, i) => {
      face.used = true;
      face.tone = '#8d5b39';
      const layer =
        i === 0 ? world.layer('pit-mine', 'surface', { landmark: 'pit-mine' }) : world.ground;
      if (i === 0 || world.thin(0.6))
        pitMine(layer, world.on(face, random() * 6), i === 0 ? 0.08 : 0.05);
      if (world.thin(0.2)) mast(world.ground.solid, world.within(face), face.size * 0.4, '#5a4a3a');
    });

    const shelf = faces.filter((f) => !f.land && f.biome === 'shallows' && !f.used);
    world.scatter(shelf, 10, 14).forEach((face, i) => {
      face.used = true;
      const layer =
        i === 0 ? world.layer('platform', 'surface', { landmark: 'platform' }) : world.ground;
      offshoreRig(layer, world.on(face, random() * 6, 1, 0), i === 0 ? 0.075 : 0.05);
    });
    for (const face of world.scatter(
      land.filter((f) => f.biome === 'desert' && !f.used),
      16,
      6,
    ))
      rocks(world.ground.solid, world.on(face), face.size * 0.12, '#b98450', random, 2);

    chaoticSwarm(world, satelliteCount(earth.satellite_belt), [1.1, 1.3], {
      size: 0.009,
      body: '#a7a39d',
      wings: companies,
      light: '#ffd28a',
      lightShare: 0.2,
      broken: 0.08,
    });
  },
};
