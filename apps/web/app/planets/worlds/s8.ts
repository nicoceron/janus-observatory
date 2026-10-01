import * as THREE from 'three';
import { claim, type EarthBrief } from '../earth';
import { coveredFaces, decades, hazeStrength, lightShare, satelliteCount } from '../encoding';
import { local } from '../kit';
import type { LayerBuilder } from '../model';
import { chaoticSwarm } from '../orbits';
import type { Tone } from '../kit';
import { U } from '../props/library';
import { harbourLoops, roads } from '../scene/network';
import { bareFlora, citizens } from '../scene/presets';
import { furrows, harbour, ring, sprinkle } from '../scene/sites';
import { offset, tangents } from '../scene/surface';
import { buildTown, type TownStyle } from '../scene/towns';

/**
 * S8 · Ouroboros. "Oligarchs take power after an AI catastrophe and extract value while
 * anticipating another collapse… elites shelter underground and on the Moon while the wider
 * population waits for stability."
 */
export function silentCore(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.solid.prism(m, 0.55 * s, 0.5 * s, 0.04 * s, 9, '#2d2a2f', '#3a3540');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const shard = local(m, Math.cos(a) * 0.36 * s, 0.03 * s, Math.sin(a) * 0.36 * s, -a, 1, [
      Math.cos(a) * 0.35,
      Math.sin(a) * 0.35,
    ]);
    layer.sheen.gem(shard, 0.06 * s, (0.2 + (i % 3) * 0.08) * s, '#26232c', 4, 0.2);
  }
  const core = local(m, 0, 0.04 * s, 0, 0.3, 1, [0.08, -0.05]);
  layer.sheen.box(core, 0.2 * s, 0.7 * s, 0.2 * s, '#1f1d24', '#2c2933');
  layer.sheen.box(
    local(core, 0.02 * s, 0.7 * s, 0, 0.6, 1, [0.3, 0.2]),
    0.16 * s,
    0.14 * s,
    0.14 * s,
    '#1f1d24',
  );
  for (const y of [0.18, 0.36, 0.52])
    layer.glow.box(
      local(core, 0, y * s, 0.101 * s, 0, 1, [0, 0.4]),
      0.14 * s,
      0.012 * s,
      0.002 * s,
      '#9a6aff',
    );
}

export function bunker(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.solid.prism(m, 0.45 * s, 0.35 * s, 0.12 * s, 6, '#6f6560', '#5f5652');
  layer.sheen.prism(local(m, 0, 0.12 * s, 0), 0.22 * s, 0.2 * s, 0.05 * s, 6, '#4a4e55', '#3b3f45');
  layer.glow.box(local(m, 0, 0.17 * s, 0), 0.2 * s, 0.006 * s, 0.03 * s, '#ffcf7a');
  layer.solid.prism(
    local(m, 0.3 * s, 0.1 * s, 0.1 * s),
    0.012 * s,
    0.008 * s,
    0.45 * s,
    4,
    '#8a8a8a',
  );
  layer.solid.box(local(m, -0.28 * s, 0.1 * s, 0, 0.3), 0.14 * s, 0.1 * s, 0.1 * s, '#5a524d');
}

export function ruin(layer: LayerBuilder, m: THREE.Matrix4, s: number, random: () => number) {
  const tilt: [number, number] = [random() * 0.3 - 0.15, random() * 0.3 - 0.15];
  const t = local(m, 0, 0, 0, random() * 3, 1, tilt);
  const h = (0.5 + random() * 0.5) * s;
  layer.solid.box(t, 0.22 * s, h, 0.22 * s, '#6d6a66', '#57534f');
  layer.solid.box(
    local(t, 0.03 * s, h, 0, 0.4, 1, [0.5, -0.3]),
    0.15 * s,
    0.1 * s,
    0.18 * s,
    '#8a4a32',
  );
  for (let i = 0; i < 4; i++)
    layer.solid.blob(
      local(m, (random() - 0.5) * 0.6 * s, 0, (random() - 0.5) * 0.6 * s),
      0.06 * s,
      i % 2 ? '#6d6a66' : '#8a4a32',
      0.4,
      i + 11,
    );
}

export const s8: EarthBrief = {
  id: 'S8',
  seed: 808,
  facing: -92,
  tilt: -0.32,
  pitch: 0.36,
  relief: 0.06,
  climate: { sea: 0.02, iceLat: 76, aridity: 0.15, greenery: -0.2 },
  palette: {
    deep: '#263a48',
    ocean: '#314b59',
    shallows: '#4d6c73',
    shore: '#8a7f6a',
    lowland: '#8a8466',
    forest: '#5a6a4a',
    jungle: '#50653f',
    upland: '#8a7862',
    mountain: '#6f6560',
    peak: '#c8c2b8',
    desert: '#a88a64',
    tundra: '#8c8a7a',
    ice: '#dfe2e2',
    seaice: '#c2ccd0',
  },
  clouds: { count: 22, tone: '#b9b4ad', speed: 0.012 },
  flora: bareFlora(['#6a7a4a', '#7a7a5a', '#5a6a45'], 1.4),
  fauna: {
    herds: [
      { kind: 'cow', biomes: ['lowland'], count: 6, size: [3, 6], tints: ['#5a3f2c', '#6a6560'] },
      { kind: 'deer', biomes: ['forest'], count: 8, size: [2, 4] },
    ],
    flocks: { count: 6, tints: ['#3a3d44'] },
    whales: 3,
  },
  atmosphere: (signals) => ({
    rim: '#c9a58c',
    rimStrength: 0.9,
    haze: '#7d6454',
    hazeOpacity:
      hazeStrength(
        signals.bodies.Earth.industrial_pollution,
        signals.bodies.Earth.contaminated_aerosol,
      ) * 0.3,
    height: 1.035,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const { faces, random } = world;
    const scar = { lat: 38, lon: -98 };
    const land = faces.filter((f) => f.land && f.biome !== 'ice');
    const lit = lightShare(earth.artificial_illumination);
    const drab: Tone[] = ['#6a6560', '#7a6a55', '#5a5a60', '#8a7a62', '#4a4e55', '#8a4a32'];

    // Scorched ground radiates from the silenced core.
    for (const face of world.around(world.faceAt(scar.lat, scar.lon), 9)) {
      if (!face.land) continue;
      const d = world.distance(face, scar.lat, scar.lon);
      face.tone = d < 0.06 ? '#2d2a2f' : d < 0.11 ? '#3f3638' : '#5a4a42';
      face.used = true;
    }
    const heart = world.faceAt(scar.lat, scar.lon);
    silentCore(
      world.layer('silent-core', 'surface', { landmark: 'silent-core' }),
      world.on(heart),
      0.15,
    );
    sprinkle(
      world,
      heart.up,
      0.16,
      [
        ['robot-wreck', 2, [1, 1.3], ['#5a4a42', '#3f3638']],
        ['mech', 1, [1, 1.1], ['#2d2a2f', '#3f3638']],
        ['scrap', 1, [1, 1.4]],
        ['broken-pylon', 1, [0.8, 1.1]],
      ],
      6,
    );

    // The surface-modification fraction becomes ruins; survivors camp in their shadow.
    const ruins = claim(faces, coveredFaces(earth.surface_modification, faces.length), (f) =>
      f.land && f.biome !== 'ice' ? random() + (f.coastal ? 0.5 : 0) : null,
    );
    const cycle = world.layer('survivors', 'surface', {
      motion: { kind: 'pulse', period: 22, floor: 0.08 },
    });
    const ruinStyle: TownStyle = {
      layout: 'grid',
      radius: 0.13,
      block: 5 * U,
      street: { width: 1.3 * U, tone: '#4a4646' },
      plaza: { radius: 2.6 * U, tone: '#6a6560', centre: [['campfire', 1, [1.4, 1.6]]] },
      lot: { spacing: 2.6 * U },
      core: [
        ['ruin-tower', 3, [0.9, 1.2]],
        ['ruin-wall', 2, [1, 1.3]],
        ['robot-wreck', 1, [1, 1.2], ['#6a5a4a', '#5a4a42']],
        ['scrap', 1, [1, 1.3]],
      ],
      edge: [
        ['ruin-wall', 3, [1, 1.2]],
        ['shanty-dark', 3, [1, 1.1], drab],
        ['tent', 2, [1, 1.1], ['#8a7a62', '#7a6a55']],
        ['scrap', 1, [1, 1.2]],
      ],
      people: {
        standing: 5,
        walking: 2,
        kinds: ['porter', ...citizens.kinds],
        walkers: ['porter', ...citizens.walkers],
        tints: drab,
      },
      cars: { count: 1, kinds: ['cart'], tints: ['#7a6a55'], speed: 0.002 },
      lamps: 'broken-pylon',
    };
    const sites = world.scatter(
      ruins.filter((f) => f.elevation < 0.42),
      6,
      24,
    );
    const towns = sites.map((face) => buildTown(world, face.up, ruinStyle));
    for (const town of towns)
      for (let k = 0; k < 2; k++)
        if (random() < lit * 2.5)
          cycle.glow.gem(
            world.on(
              world.surface.face(offset(town.centre, random() * 6, town.radius * random())),
              0,
              1,
              -0.0005,
            ),
            0.004,
            0.01,
            '#ffb45a',
            4,
          );
    ruins.forEach((face, i) => {
      face.used = true;
      face.tone = '#6a6560';
      if (i === 0)
        ruin(world.layer('ruin', 'surface', { landmark: 'ruin' }), world.on(face), 0.08, random);
      else if (world.thin(0.06))
        sprinkle(
          world,
          face.up,
          face.size * 0.4,
          [
            ['ruin-wall', 3, [1, 1.3]],
            ['ruin-tower', 1, [0.8, 1.1]],
            ['scrap', 1, [1, 1.3]],
          ],
          1,
        );
    });
    roads(world, towns, {
      width: 1.4 * U,
      tone: '#5a524a',
      neighbours: 1,
      reach: 0.5,
      traffic: { kinds: ['cart', 'porter'], per: 1, speed: 0.002, tints: drab },
    });

    const fields = Math.round(land.length * decades(earth.agricultural_pollution, 0.1, 100) * 0.2);
    for (const face of claim(faces, fields, (f) =>
      f.land && ['lowland', 'forest'].includes(f.biome) ? random() : null,
    ))
      furrows(world, face, random() < 0.5 ? '#9a8a5a' : '#8a7f55', tangents(face.up).east);

    // Sealed bunkers in the hills: guards, a perimeter and a dim light. Elites shelter below.
    const hills = land.filter((f) => ['mountain', 'upland'].includes(f.biome) && !f.used);
    world.scatter(hills, 4, 30).forEach((face, i) => {
      face.used = true;
      bunker(
        i === 0 ? world.layer('bunker', 'surface', { landmark: 'bunker' }) : world.ground,
        world.on(face, random() * 6),
        i === 0 ? 0.08 : 0.06,
      );
      ring(world, face.up, 0.075, 'fence', 8, 1.2, '#5a5a60');
      world.props.add(
        'turret',
        world.surface.point(offset(face.up, 3.5, 0.05), -0.0004),
        offset(face.up, 3.5, 0.09).sub(face.up),
        1,
      );
      for (let k = 0; k < 1; k++)
        world.props.add(
          'sentinel',
          world.surface.point(offset(face.up, k * 2, 0.05), 0),
          offset(face.up, k * 2, 0.08).sub(face.up),
          1,
        );
      world.props.add('dish', world.surface.point(offset(face.up, 1, 0.055), -0.0004), null, 1);
    });
    const ports = towns
      .map((t) => harbour(world, t.centre, { boats: ['fishing'] }))
      .filter((p): p is THREE.Vector3 => !!p);
    harbourLoops(world, ports, { kinds: ['fishing', 'canoe'], per: 1, speed: 0.0025, tints: drab });

    chaoticSwarm(
      world,
      satelliteCount(earth.satellite_belt),
      [1.14, 1.32],
      { size: 0.01, body: '#7b7670', wings: ['#3a4150', '#4a4a4a'], broken: 0.4 },
      2,
    );
  },
};
