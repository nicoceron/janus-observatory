import * as THREE from 'three';
import type { EarthBrief } from '../earth';
import { satelliteCount } from '../encoding';
import { local } from '../kit';
import { onOrbit, orbitMatrix, type LayerBuilder } from '../model';
import { tree } from '../parts';

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
  forest: {
    count: 300,
    tones: {
      forest: '#2a8a4c',
      jungle: '#1f7d45',
      upland: '#6fae55',
      lowland: '#63b34f',
      tundra: '#5a8a5a',
    },
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
    grove(world.layer('grove', 'surface', { landmark: 'grove' }), world.on(valley), 0.14, random);

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
      habitat(ring, onOrbit(1.42, (i / habitats) * Math.PI * 2), 0.12);
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
      drones.sheen.gem(m, 0.006, 0.02, '#eef1f4', 3);
      if (i % 4 === 0) drones.glow.box(m, 0.004, 0.004, 0.004, '#9fe0ff');
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
