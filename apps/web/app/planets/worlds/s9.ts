import * as THREE from 'three';
import type { EarthBrief } from '../earth';
import { satelliteCount } from '../encoding';
import { local } from '../kit';
import { onOrbit, orbitMatrix, type LayerBuilder } from '../model';

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
  forest: {
    count: 260,
    tones: {
      forest: '#2c7a42',
      jungle: '#216b3b',
      upland: '#5f8f4e',
      lowland: '#5e9f4a',
      tundra: '#557a55',
    },
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
    // No Table 6 surface value: the ground stays wild. The gifts are few, small and dark at night.
    const land = faces.filter(
      (f) => f.land && ['lowland', 'forest', 'upland', 'shore'].includes(f.biome),
    );
    world.scatter(land, 7, 28).forEach((face, i) => {
      face.used = true;
      gift(
        i === 0 ? world.layer('gift', 'surface', { landmark: 'gift' }) : world.ground,
        world.on(face, random() * 6),
        i === 0 ? 0.1 : 0.07,
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
