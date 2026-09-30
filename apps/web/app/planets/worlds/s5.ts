import * as THREE from 'three';
import { claim, type EarthBrief } from '../earth';
import { coveredFaces, lightShare, satelliteCount } from '../encoding';
import { local } from '../kit';
import { fibonacci, type LayerBuilder } from '../model';
import { orderedSwarm } from '../orbits';

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

    const land = modified.filter((f) => f.land);
    const centre = world.faceAt(28, 112);
    world.scatter(land, Math.round(70 * world.quality.density), 7).forEach((face, i) => {
      const tone = cellTones[(i * 7) % cellTones.length];
      const layer =
        i === 0 ? world.layer('garden-cell', 'surface', { landmark: 'garden-cell' }) : world.ground;
      if (i === 0 || i % 3 === 0)
        gardenCell(layer, world.on(face, random() * 6), i === 0 ? 0.08 : 0.06, tone);
      else bloomSpire(world.ground, world.on(face, random() * 6), random.range(0.06, 0.1), tone);
    });
    const spire = world.layer('bloom-spire', 'surface', { landmark: 'bloom-spire' });
    bloomSpire(spire, world.on(centre), 0.3, '#d35fc4');
    const pods =
      world.around(centre, 14).find((f) => f.land && f !== centre && !f.used) ??
      centre.neighbours.map((n) => faces[n])[0];
    seedPods(world.layer('seed-pods', 'surface', { landmark: 'seed-pods' }), world.on(pods), 0.12);

    // Luminous reefs: light scattered across engineered seas, scaled by the illumination decade.
    for (const face of modified.filter((f) => !f.land))
      if (random() < lit * 0.16 * world.quality.density) {
        const m = world.on(face, random() * 6, 1, 0);
        world.ground.solid.prism(
          m,
          face.size * 0.16,
          face.size * 0.15,
          face.size * 0.03,
          6,
          '#efe6f5',
          '#7fe0d0',
        );
        world.ground.glow.prism(
          local(m, 0, face.size * 0.03, 0),
          face.size * 0.06,
          face.size * 0.06,
          face.size * 0.01,
          6,
          random.pick(glowTones),
        );
      }
    for (const face of land)
      if (random() < lit * 0.35 * world.quality.density)
        world.ground.glow.gem(
          world.within(face),
          face.size * 0.03,
          face.size * 0.08,
          random.pick(glowTones),
          4,
        );

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
