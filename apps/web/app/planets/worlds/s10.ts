import * as THREE from 'three';
import type { EarthBrief } from '../earth';
import { satelliteCount } from '../encoding';
import { local } from '../kit';
import { onOrbit, orbitMatrix, type LayerBuilder } from '../model';
import { tree } from '../parts';
import type { Tone } from '../kit';
import { U } from '../props/library';
import { harbourLoops, roads } from '../scene/network';
import { citizens, earthFlora } from '../scene/presets';
import { farmland, harbour, sprinkle } from '../scene/sites';
import { offset } from '../scene/surface';
import { buildTown, type TownStyle } from '../scene/towns';

/**
 * S10 · Out of Eden. "A post-scarcity commonwealth originates on Earth before a schism separates
 * technological proponents and opponents. Earth is restored under growth limits while autonomous
 * systems expand through orbital and deep space."
 */
export function habitat(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  const axis = m
    .clone()
    .multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2))
    .multiply(new THREE.Matrix4().makeTranslation(0, -0.5 * s, 0));
  layer.sheen.prism(axis, 0.16 * s, 0.16 * s, s, 10, '#eef1f4');
  for (const y of [0.25, 0.5, 0.75])
    layer.solid.prism(
      local(axis, 0, (y - 0.03) * s, 0),
      0.165 * s,
      0.165 * s,
      0.06 * s,
      10,
      '#6fcf7a',
    );
  layer.glow.prism(local(axis, 0, s, 0), 0.1 * s, 0.1 * s, 0.01 * s, 10, '#fff1c4');
  layer.glow.prism(local(axis, 0, -0.01 * s, 0), 0.1 * s, 0.1 * s, 0.01 * s, 10, '#fff1c4');
  for (const side of [-1, 1])
    layer.sheen.panel(
      local(m, 0, 0, side * 0.34 * s, 0, 1, [0.2 * side, 0]),
      0.8 * s,
      0.3 * s,
      '#d6b34f',
      '#eef1f4',
    );
}

export function lightSail(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.sheen.prism(m, 0.03 * s, 0.015 * s, 0.5 * s, 6, '#eef1f4');
  layer.glow.gem(local(m, 0, -0.08 * s, 0), 0.03 * s, 0.1 * s, '#9fe0ff', 4);
  const sail = local(m, 0, 0.55 * s, 0, 0.785, 1, [0.35, 0]);
  layer.sheen.panel(sail, 0.8 * s, 0.8 * s, '#e8c86a', '#c9a24a');
  for (const [x, z] of [
    [-0.4, -0.4],
    [0.4, -0.4],
    [0.4, 0.4],
    [-0.4, 0.4],
  ])
    layer.sheen.beam(
      new THREE.Vector3(0, 0.5 * s, 0).applyMatrix4(m),
      new THREE.Vector3(x * s, 0, z * s).applyMatrix4(sail),
      0.004 * s,
      '#c9cdd2',
    );
}

export function grove(layer: LayerBuilder, m: THREE.Matrix4, s: number, random: () => number) {
  layer.solid.prism(m, 0.5 * s, 0.48 * s, 0.02 * s, 9, '#7fc05a');
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + random();
    const r = (i === 0 ? 0 : 0.28) * s;
    tree(
      layer.solid,
      local(m, Math.cos(a) * r, 0.02 * s, Math.sin(a) * r),
      i === 0 ? 'round' : i % 2 ? 'tall' : 'round',
      i % 3 ? '#2c8c4f' : '#1f7f47',
      (i === 0 ? 0.55 : 0.32) * s,
      '#7a5230',
    );
  }
  for (let i = 0; i < 6; i++)
    layer.solid.blob(
      local(m, (random() - 0.5) * 0.8 * s, 0.03 * s, (random() - 0.5) * 0.8 * s),
      0.04 * s,
      i % 2 ? '#f0a8c8' : '#f6d36a',
      0.3,
      i + 21,
    );
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
      { kind: 'horse', biomes: ['lowland'], count: 8, size: [3, 7], roam: true, tints: ['#7a4a2a', '#efe8dc'] },
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
    // Flowering meadows: the restored garden, with no surface technosignature drawn.
    for (const face of faces)
      if (face.land && ['lowland', 'forest', 'upland'].includes(face.biome) && random() < 0.07)
        face.tone = random() < 0.55 ? '#f0a8c8' : '#f6d36a';
    const valley = world.faceAt(-24, 146);
    valley.used = true;
    grove(world.layer('grove', 'surface', { landmark: 'grove' }), world.on(valley), 0.05, random);

    // Those who stayed: small timber villages under growth limits, horse carts and footpaths.
    const wool: Tone[] = ['#b3824f', '#8f9a6a', '#d8c39a', '#6a7a8a', '#c9a06a'];
    const steading: TownStyle = {
      layout: 'radial',
      radius: 0.03,
      streets: 3,
      street: { width: 1 * U, tone: '#c9b994' },
      plaza: { radius: 2 * U, tone: '#d8c8a0', centre: [['well', 1, [1.2, 1.4]], ['totem', 1, [1, 1.2]]] },
      lot: { spacing: 2.4 * U },
      core: [['longhouse', 2, [0.9, 1]], ['eco-dome', 2, [1, 1.1]], ['market', 0.5, [1, 1.1], ['#e0a830', '#7fbf5a']]],
      edge: [['yurt', 2, [1, 1.1]], ['eco-dome', 2, [0.9, 1]], ['barn-dark', 1, [0.9, 1]], ['haystack', 1, [0.9, 1.2]]],
      people: { standing: 9, walking: 3, ...citizens, kinds: [...citizens.kinds, 'robed'], tints: wool },
      cars: { count: 1, kinds: ['cart', 'bicycle'], tints: ['#9a7a5a'], speed: 0.002 },
      trees: { count: 12, kinds: ['oak', 'flowers', 'birch'], size: [1, 1.5] },
    };
    const land = faces.filter((f) => f.land && ['lowland', 'forest', 'upland', 'shore'].includes(f.biome));
    const towns = world.scatter(land.filter((f) => f.elevation < 0.4 && !f.used), 18, 14).map((face) => buildTown(world, face.up, steading));
    for (const town of towns) {
      farmland(world, town.centre, town.radius * 2.2, ['#c9d68a', '#d8c878', '#a8c87a'], [['crop', 1, [1.3, 1.3], ['#d8c35a']], ['vine', 1, [1.3, 1.3], ['#6aa04a']]], 0.4);
      sprinkle(world, offset(town.centre, random() * 6, town.radius * 1.6), 0.01, [['sheep', 2, [1, 1.2]], ['cow', 1, [1, 1.1], ['#efe8dc']]], 5);
    }
    roads(world, towns, { width: 0.8 * U, tone: '#c9b994', neighbours: 1, reach: 0.35, traffic: { kinds: ['cart', 'robed-walk'], per: 1, speed: 0.002, tints: wool } });
    const shores = towns.map((t) => harbour(world, t.centre, { boats: ['sailboat'] })).filter((p): p is THREE.Vector3 => !!p);
    harbourLoops(world, shores, { kinds: ['sailboat', 'canoe', 'fishing'], per: 1, speed: 0.0025 });

    // The schism made visible: a ring of habitats on one rail, apart from the garden below.
    const count = satelliteCount(earth.satellite_belt);
    const ringMatrix = orbitMatrix(0.32, 0.4);
    const rail = world.layer('rail', 'orbit', { matrix: ringMatrix });
    rail.sheen.torus(new THREE.Matrix4(), 1.42, 0.004, '#d9dde2', 96, 3);
    const ring = world.layer('habitat-ring', 'orbit', { landmark: 'habitat-ring', matrix: ringMatrix, motion: { kind: 'spin', speed: 0.035 } });
    const habitats = 12;
    for (let i = 0; i < habitats; i++) habitat(ring, onOrbit(1.42, (i / habitats) * Math.PI * 2), 0.12);
    const drones = world.layer('autonomy', 'orbit', { matrix: ringMatrix, motion: { kind: 'spin', speed: 0.05 } });
    for (let i = 0; i < Math.max(0, count - habitats); i++) {
      const m = onOrbit(1.36 + (i % 3) * 0.04, (i / (count - habitats)) * Math.PI * 2 + 0.13, ((i % 5) - 2) * 0.015);
      drones.sheen.gem(m, 0.006, 0.02, '#eef1f4', 3);
      if (i % 4 === 0) drones.glow.box(m, 0.004, 0.004, 0.004, '#9fe0ff');
    }
    const sail = world.layer('departure', 'orbit', { landmark: 'departure', matrix: orbitMatrix(-0.5, 2.4), motion: { kind: 'spin', speed: 0.02 } });
    lightSail(sail, onOrbit(1.55, 0.6).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), 0.12);
  },
};
