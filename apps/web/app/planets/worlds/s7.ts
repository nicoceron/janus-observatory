import * as THREE from 'three';
import { claim, type EarthBrief } from '../earth';
import { decades, lightShare, satelliteCount } from '../encoding';
import { local } from '../kit';
import type { Face } from '../globe';
import { onOrbit, orbitMatrix, type LayerBuilder } from '../model';
import { house, mast, tree, windmill, windmillSails } from '../parts';

/**
 * S7 · Restoration. "Collapse and the loss of advanced technologies catalyze alignment with nature.
 * Simple technologies are integrated with planetary cycles, production is local, and knowledge
 * moves through regional networks."
 */
export function village(layer: LayerBuilder, m: THREE.Matrix4, s: number, random: () => number) {
  const homes = 4 + Math.floor(random() * 3);
  for (let i = 0; i < homes; i++) {
    const a = (i / homes) * Math.PI * 2 + random() * 0.5;
    const r = (0.18 + random() * 0.2) * s;
    house(
      layer.solid,
      local(m, Math.cos(a) * r, 0, Math.sin(a) * r, -a + random() * 0.4),
      0.14 * s,
      0.08 * s,
      0.1 * s,
      '#efe6d2',
      '#c7653d',
    );
  }
  for (let i = 0; i < 3; i++)
    tree(
      layer.solid,
      local(m, (random() - 0.5) * 0.7 * s, 0, (random() - 0.5) * 0.7 * s),
      'round',
      '#4f8f3e',
      0.14 * s,
    );
}

export function radioMast(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.solid.box(m, 0.22 * s, 0.1 * s, 0.16 * s, '#efe6d2', '#8a6a4a');
  mast(layer.solid, local(m, 0.2 * s, 0, 0), s, '#b7b2a6');
  layer.glow.box(local(m, 0.2 * s, s, 0), 0.03 * s, 0.03 * s, 0.03 * s, '#ff6a4a');
  layer.solid.beam(
    new THREE.Vector3(0.2 * s, 0.9 * s, 0).applyMatrix4(m),
    new THREE.Vector3(0.6 * s, 0, 0.1 * s).applyMatrix4(m),
    0.004 * s,
    '#8d887c',
  );
}

export function terraces(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  const tones = ['#b9c96a', '#9fbd5c', '#cfcf78', '#a8c464'];
  for (let i = 0; i < 4; i++) {
    const r = (0.5 - i * 0.11) * s;
    layer.solid.prism(local(m, 0, i * 0.045 * s, 0), r, r, 0.045 * s, 10, '#8a7458', tones[i]);
  }
  tree(layer.solid, local(m, 0, 0.18 * s, 0), 'round', '#4f8f3e', 0.14 * s);
}

export const s7: EarthBrief = {
  id: 'S7',
  seed: 707,
  facing: 18,
  tilt: -0.34,
  pitch: 0.34,
  relief: 0.06,
  climate: { sea: 0, iceLat: 68, aridity: -0.1, greenery: 0.25 },
  palette: {
    deep: '#1a5f86',
    ocean: '#247ea3',
    shallows: '#58b8bc',
    shore: '#e2d4a2',
    lowland: '#95c56c',
    forest: '#4c8f48',
    jungle: '#3c8043',
    upland: '#b7c97d',
    mountain: '#9d9483',
    peak: '#fbfaf5',
    desert: '#dcc58d',
    tundra: '#a6b58e',
    ice: '#f3f7f9',
    seaice: '#dbe9ef',
  },
  clouds: { count: 32, tone: '#ffffff', speed: 0.013 },
  forest: {
    count: 260,
    tones: { forest: '#467f3f', jungle: '#3a743b', upland: '#6f9a4f', lowland: '#6aa04d' },
  },
  atmosphere: () => ({
    rim: '#9fd6ff',
    rimStrength: 1,
    haze: '#ffffff',
    hazeOpacity: 0,
    height: 1.035,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const { faces, random } = world;
    const land = faces.filter(
      (f) => f.land && ['lowland', 'forest', 'upland', 'shore', 'jungle'].includes(f.biome),
    );
    const lit = lightShare(earth.artificial_illumination);

    // Regions, each with its own villages, paths and one radio mast. No links between regions.
    const regions = world.scatter(land, 8, 30);
    const path = world.layer('paths', 'surface');
    regions.forEach((centre, r) => {
      const villages = world.scatter(
        world.around(centre, 12).filter((f) => land.includes(f)),
        5,
        5,
      );
      const hub = villages[0] ?? centre;
      villages.forEach((face, i) => {
        face.used = true;
        face.tone = '#a9c87a';
        village(world.ground, world.on(face, random() * 6), 0.075, random);
        if (i > 0) footpath(path, hub, face);
        if (random() < lit)
          world.ground.glow.box(
            world.within(face),
            face.size * 0.03,
            face.size * 0.03,
            face.size * 0.03,
            '#ffd28a',
          );
      });
      if (!villages.length) return;
      const tower =
        r === 0 ? world.layer('radio-mast', 'surface', { landmark: 'radio-mast' }) : world.ground;
      radioMast(tower, world.within(hub), r === 0 ? 0.075 : 0.055);
      const mill = world.around(hub, 6).find((f) => land.includes(f) && !f.used);
      if (mill) {
        mill.used = true;
        const at = world.on(mill, random() * 6);
        if (r === 0) {
          const layer = world.layer('windmill', 'surface', { landmark: 'windmill' });
          windmill(layer.solid, at, 0.1, '#efe6d2', '#8a5a3a', false);
          const hub = world.layer('windmill-sails', 'surface', {
            landmark: 'windmill',
            matrix: local(at, 0, 0.078, 0.022).multiply(
              new THREE.Matrix4().makeRotationX(Math.PI / 2),
            ),
            motion: { kind: 'spin', speed: 0.8 },
          });
          windmillSails(hub.solid, new THREE.Matrix4().makeRotationX(-Math.PI / 2), 0.1, '#e9dcc0');
        } else windmill(world.ground.solid, at, 0.05, '#efe6d2', '#8a5a3a');
      }
    });

    const fields = Math.round(land.length * decades(earth.agricultural_pollution, 0.1, 100) * 0.3);
    claim(faces, fields, (f) =>
      land.includes(f)
        ? 1 - Math.min(...regions.map((c) => 1 - c.up.dot(f.up))) * 8 + random() * 0.2
        : null,
    ).forEach((face, i) => {
      face.used = true;
      face.tone = i % 2 ? '#c8cf6f' : '#a6c160';
      if (i === 0)
        terraces(
          world.layer('terraces', 'surface', { landmark: 'terraces' }),
          world.on(face),
          face.size * 0.5,
        );
    });

    const relic = world.layer('relic-satellite', 'orbit', {
      matrix: orbitMatrix(-1.0, 2.1),
      motion: { kind: 'spin', speed: 0.025 },
    });
    for (let i = 0; i < satelliteCount(earth.satellite_belt); i++) {
      const m = onOrbit(1.26, i * 2.1 + 2).multiply(new THREE.Matrix4().makeRotationZ(1.1));
      relic.solid.box(m, 0.012, 0.016, 0.012, '#7b7670');
      relic.solid.panel(
        local(m, 0.028, 0.008, 0, 0, 1, [1.2, 0.4]),
        0.011,
        0.036,
        '#3a4150',
        '#6b6560',
      );
    }
  },
};

/** A footpath of flat stones along the great circle between two village faces. */
function footpath(layer: LayerBuilder, from: Face, to: Face) {
  const steps = Math.max(2, Math.round(from.up.angleTo(to.up) / 0.012));
  for (let i = 1; i < steps; i++) {
    const up = from.up
      .clone()
      .lerp(to.up, i / steps)
      .normalize();
    const radius =
      THREE.MathUtils.lerp(from.centre.length(), to.centre.length(), i / steps) + 0.003;
    const along = to.up.clone().sub(from.up).normalize();
    const m = new THREE.Matrix4()
      .lookAt(new THREE.Vector3(), along, up)
      .setPosition(up.clone().multiplyScalar(radius));
    layer.solid.panel(m, 0.005, 0.008, '#d8c89a');
  }
}
