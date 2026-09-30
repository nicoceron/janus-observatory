import * as THREE from 'three';
import { claim, type EarthBrief } from '../earth';
import { coveredFaces, decades, lightShare, satelliteCount } from '../encoding';
import { local } from '../kit';
import { onOrbit, orbitMatrix, type LayerBuilder } from '../model';
import { tent, tree } from '../parts';

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
  forest: {
    count: 300,
    tones: {
      forest: '#2f6a33',
      jungle: '#255d30',
      upland: '#557a3e',
      tundra: '#476e46',
      lowland: '#6f8f3e',
    },
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
    const land = faces.filter(
      (f) => f.land && ['lowland', 'forest', 'tundra', 'upland', 'shore'].includes(f.biome),
    );

    // Small subsistence plots near water, from the agricultural-pollution decade.
    const plots = Math.round(land.length * decades(earth.agricultural_pollution, 0.1, 100) * 0.12);
    for (const face of claim(faces, plots, (f) =>
      f.land && f.coastal && f.biome === 'lowland' ? random() : null,
    )) {
      face.tone = random() < 0.5 ? '#b9b866' : '#c6ae6a';
    }

    // Camps drift together, east and back, with a slow seasonal rhythm.
    const band = world.layer('camps', 'surface', {
      motion: { kind: 'sway', amplitude: 0.1, period: 70 },
    });
    const lit = lightShare(earth.artificial_illumination);
    world
      .scatter(
        land.filter((f) => f.elevation < 0.4),
        18,
        13,
      )
      .forEach((face, i) => {
        const layer =
          i === 0
            ? world.layer('camp', 'surface', {
                landmark: 'camp',
                motion: { kind: 'sway', amplitude: 0.1, period: 70 },
              })
            : band;
        camp(
          layer,
          world.on(face, random() * 6),
          i === 0 ? 0.1 : 0.075,
          random,
          random() < lit * 1.4,
        );
      });

    const ruin = world.faceAt(8, 30);
    ruin.used = true;
    relicTower(
      world.layer('relic-tower', 'surface', { landmark: 'relic-tower' }),
      world.on(ruin),
      0.2,
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
        0.075,
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
