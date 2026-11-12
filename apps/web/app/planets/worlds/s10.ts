import * as THREE from 'three';
import type { EarthBrief } from '../earth';
import { satelliteCount } from '../encoding';
import { onOrbit, orbitMatrix, type LayerBuilder } from '../model';
import type { Tone } from '../kit';
import { U } from '../props/library';
import { harbourLoops, roads } from '../scene/network';
import { citizens, earthFlora } from '../scene/presets';
import { farmland, harbour, setPieces, sprinkle } from '../scene/sites';
import { offset } from '../scene/surface';
import { buildTown, type TownStyle } from '../scene/towns';

/**
 * S10 · Out of Eden. "A post-scarcity commonwealth originates on Earth before a schism separates
 * technological proponents and opponents. Earth is restored under growth limits while autonomous
 * systems expand through orbital and deep space."
 */
/** A habitat cylinder; `far` draws the light model used for the rest of a ring of twelve. */
export function habitat(layer: LayerBuilder, m: THREE.Matrix4, s: number, far = false) {
  layer.kit(far ? 'habitat-far' : 'lm-habitat', m, s / 10);
}

export function lightSail(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.kit('lm-light-sail', m, s / 10);
}

export function grove(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.kit('lm-grove', m, s / 10);
}

export const s10: EarthBrief = {
  id: 'S10',
  seed: 1010,
  facing: 125,
  tilt: -0.34,
  pitch: 0.05,
  relief: 0.058,
  climate: { sea: 0, iceLat: 67, aridity: -0.2, greenery: 0.35 },
  palette: {
    deep: '#135c8c',
    ocean: '#1b7fb4',
    shallows: '#4cc1cf',
    shore: '#f0e2b6',
    lowland: '#8fd062',
    forest: '#2c8c4f',
    jungle: '#1f7f47',
    upland: '#bcd67e',
    mountain: '#a09a8c',
    peak: '#ffffff',
    desert: '#ead39a',
    tundra: '#b0c79a',
    ice: '#f6fafc',
    seaice: '#e0f0f6',
  },
  clouds: { count: 30, tone: '#ffffff', speed: 0.012 },
  flora: earthFlora(
    {
      broad: ['#2a8a4c', '#3a9a50', '#46a85a', '#1f7d45'],
      conifer: ['#24703f', '#2a7a44'],
      scrub: ['#8fd062', '#a6d870'],
      flowers: ['#f0a8c8', '#f6d36a', '#ffffff', '#ff8a5a', '#c46ad0'],
    },
    1.7,
  ),
  fauna: {
    herds: [
      { kind: 'deer', biomes: ['forest', 'upland', 'jungle'], count: 24, size: [3, 7] },
      { kind: 'bison', biomes: ['lowland', 'tundra'], count: 12, size: [6, 11], roam: true },
      {
        kind: 'horse',
        biomes: ['lowland'],
        count: 8,
        size: [3, 7],
        roam: true,
        tints: ['#7a4a2a', '#efe8dc'],
      },
    ],
    flocks: { count: 24, tints: ['#ffffff', '#f6d36a'] },
    whales: 9,
    fish: { count: 18, tints: ['#f2a03a', '#4fc0d0'] },
  },
  atmosphere: () => ({
    rim: '#9fe0ff',
    rimStrength: 1.1,
    haze: '#ffffff',
    hazeOpacity: 0,
    height: 1.035,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const { faces, random } = world;
    // Set piece: a seed ark readied for the autonomous expansion beyond Earth.
    setPieces(world, [['seed-ark', 1, [1.3, 1.35]]], 1, {
      spacing: 60,
      escort: ['gardener-bot', 1, [1, 1], ['#7fbf5a']],
      escorts: 2,
    });
    // Flowering meadows: the restored garden, with no surface technosignature drawn.
    for (const face of faces)
      if (face.land && ['lowland', 'forest', 'upland'].includes(face.biome) && random() < 0.07)
        face.tone = random() < 0.55 ? '#f0a8c8' : '#f6d36a';
    const valley = world.faceAt(-24, 146);
    valley.used = true;
    grove(world.layer('grove', 'surface', { landmark: 'grove' }), world.on(valley), 0.12);

    // Those who stayed: small timber villages under growth limits, horse carts and footpaths.
    const wool: Tone[] = ['#b3824f', '#8f9a6a', '#d8c39a', '#6a7a8a', '#c9a06a'];
    const steading: TownStyle = {
      layout: 'radial',
      radius: 0.075,
      streets: 3,
      street: { width: 1 * U, tone: '#c9b994' },
      plaza: {
        radius: 2 * U,
        tone: '#d8c8a0',
        centre: [
          ['well', 1, [1.2, 1.4]],
          ['totem', 1, [1, 1.2]],
        ],
      },
      lot: { spacing: 2.4 * U },
      core: [
        ['longhouse', 2, [0.9, 1]],
        ['eco-dome', 2, [1, 1.1]],
        ['market', 0.5, [1, 1.1], ['#e0a830', '#7fbf5a']],
      ],
      edge: [
        ['yurt', 2, [1, 1.1]],
        ['eco-dome', 2, [0.9, 1]],
        ['barn-dark', 1, [0.9, 1]],
        ['haystack', 1, [0.9, 1.2]],
      ],
      people: {
        standing: 5,
        walking: 2,
        ...citizens,
        kinds: [...citizens.kinds, 'robed', 'gardener-bot'],
        tints: wool,
      },
      cars: { count: 1, kinds: ['cart', 'bicycle'], tints: ['#9a7a5a'], speed: 0.002 },
      trees: { count: 5, kinds: ['oak', 'flowers', 'birch'], size: [1, 1.5] },
    };
    const land = faces.filter(
      (f) => f.land && ['lowland', 'forest', 'upland', 'shore'].includes(f.biome),
    );
    const towns = world
      .scatter(
        land.filter((f) => f.elevation < 0.4 && !f.used),
        8,
        22,
      )
      .map((face) => buildTown(world, face.up, steading));
    for (const town of towns) {
      farmland(
        world,
        town.centre,
        town.radius * 2.2,
        ['#c9d68a', '#d8c878', '#a8c87a'],
        [
          ['crop', 1, [1.3, 1.3], ['#d8c35a']],
          ['vine', 1, [1.3, 1.3], ['#6aa04a']],
        ],
        0.4,
      );
      sprinkle(
        world,
        offset(town.centre, random() * 6, town.radius * 1.6),
        3 * U,
        [
          ['sheep', 2, [1, 1.2]],
          ['cow', 1, [1, 1.1], ['#efe8dc']],
        ],
        3,
      );
    }
    roads(world, towns, {
      width: 0.8 * U,
      tone: '#c9b994',
      neighbours: 1,
      reach: 0.55,
      traffic: { kinds: ['cart', 'robed-walk'], per: 1, speed: 0.002, tints: wool },
    });
    const shores = towns
      .map((t) => harbour(world, t.centre, { boats: ['sailboat'] }))
      .filter((p): p is THREE.Vector3 => !!p);
    harbourLoops(world, shores, { kinds: ['sailboat', 'canoe', 'fishing'], per: 1, speed: 0.0025 });

    // The schism made visible: a ring of habitats on one rail, apart from the garden below.
    const count = satelliteCount(earth.satellite_belt);
    const ringMatrix = orbitMatrix(0.32, 0.4);
    const rail = world.layer('rail', 'orbit', { matrix: ringMatrix });
    rail.sheen.torus(new THREE.Matrix4(), 1.42, 0.004, '#d9dde2', 96, 3);
    const ring = world.layer('habitat-ring', 'orbit', {
      landmark: 'habitat-ring',
      matrix: ringMatrix,
      motion: { kind: 'spin', speed: 0.035 },
    });
    const habitats = 12;
    for (let i = 0; i < habitats; i++)
      habitat(ring, onOrbit(1.42, (i / habitats) * Math.PI * 2), 0.12, i > 0);
    const drones = world.layer('autonomy', 'orbit', {
      matrix: ringMatrix,
      motion: { kind: 'spin', speed: 0.05 },
    });
    for (let i = 0; i < Math.max(0, count - habitats); i++) {
      const m = onOrbit(
        1.36 + (i % 3) * 0.04,
        (i / (count - habitats)) * Math.PI * 2 + 0.13,
        ((i % 5) - 2) * 0.015,
      );
      drones.kit(drones.lean ? 'sat-speck' : 'sat-mini', m, 0.011, {
        tint: '#eef1f4',
        lights: i % 4 === 0,
      });
    }
    const sail = world.layer('departure', 'orbit', {
      landmark: 'departure',
      matrix: orbitMatrix(-0.5, 2.4),
      motion: { kind: 'spin', speed: 0.02 },
    });
    lightSail(
      sail,
      onOrbit(1.55, 0.6).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)),
      0.12,
    );
  },
};
