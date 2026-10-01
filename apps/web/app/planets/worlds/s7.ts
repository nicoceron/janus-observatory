import * as THREE from 'three';
import { claim, type EarthBrief } from '../earth';
import { decades, lightShare, satelliteCount } from '../encoding';
import { local } from '../kit';
import { onOrbit, orbitMatrix, type LayerBuilder } from '../model';
import { house, mast, tree, windmill, windmillSails } from '../parts';
import type { Tone } from '../kit';
import { U } from '../props/library';
import { harbourLoops, roads } from '../scene/network';
import { citizens, earthFlora, villageStyle } from '../scene/presets';
import { farmland, furrows, harbour, sprinkle } from '../scene/sites';
import { offset, tangents } from '../scene/surface';
import { buildTown, type Town } from '../scene/towns';

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
  flora: earthFlora(
    {
      broad: ['#467f3f', '#4f8f48', '#5a9a4a', '#3a743b'],
      conifer: ['#2f6a3a', '#35603a'],
      scrub: ['#8cbf6a', '#a6c160'],
      flowers: ['#f6d36a', '#ffffff', '#f0a8c8', '#c46ad0'],
    },
    1.3,
  ),
  fauna: {
    herds: [
      { kind: 'deer', biomes: ['forest', 'upland'], count: 16, size: [3, 6] },
      { kind: 'sheep', biomes: ['lowland', 'upland'], count: 12, size: [5, 9] },
      { kind: 'horse', biomes: ['lowland'], count: 6, size: [3, 5], tints: ['#7a4a2a', '#d8c39a'] },
    ],
    flocks: { count: 18 },
    whales: 6,
    fish: { count: 12, tints: ['#c9d6dc', '#f2a03a'] },
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
    const homespun: Tone[] = [
      '#8a6a44',
      '#b3824f',
      '#6a7a4a',
      '#d8c39a',
      '#7d8f6a',
      '#c9a06a',
      '#4f6f8a',
    ];

    // Regions, each with its own villages, lanes and one radio mast. No links between regions.
    const village = villageStyle(0.04, 'cottage');
    village.people = {
      standing: 10,
      walking: 4,
      ...citizens,
      kinds: [...citizens.kinds, 'porter'],
      tints: homespun,
    };
    village.cars = {
      count: 1,
      kinds: ['cart', 'bicycle'],
      tints: ['#9a7a5a', '#3d6fb5'],
      speed: 0.002,
    };
    village.trees = {
      count: 12,
      kinds: ['oak', 'oak-small', 'cypress', 'flowers'],
      size: [1, 1.4],
    };
    const regions = world.scatter(land, 8, 30);
    const towns: Town[] = [];
    regions.forEach((centre, r) => {
      const sites = world.scatter(
        world.around(centre, 12).filter((f) => land.includes(f) && f.elevation < 0.42),
        5,
        5,
      );
      const local_: Town[] = sites.map((face) => buildTown(world, face.up, village));
      towns.push(...local_);
      // Lanes within the region only: knowledge and trade move regionally.
      roads(world, local_, {
        width: 1.1 * U,
        tone: '#b8a37a',
        neighbours: 2,
        reach: 0.3,
        traffic: {
          kinds: ['cart', 'cart', 'bicycle'],
          per: 1,
          speed: 0.003,
          tints: ['#9a7a5a', '#7a5a3a'],
        },
      });
      for (const town of local_) {
        farmland(
          world,
          town.centre,
          town.radius * 2.2,
          ['#c8cf6f', '#a6c160', '#d8c878', '#b9a65a'],
          [
            ['crop', 2, [1.3, 1.3], ['#d8c35a']],
            ['vine', 1, [1.3, 1.3], ['#6aa04a']],
          ],
          0.55,
        );
        sprinkle(
          world,
          offset(town.centre, random() * 6, town.radius * 1.5),
          0.01,
          [
            ['sheep', 3, [1, 1.2]],
            ['cow', 1, [1, 1.1], ['#efe8dc', '#5a3f2c']],
          ],
          6,
        );
        if (random() < lit * 2)
          world.ground.glow.box(
            world.on(world.surface.face(town.centre), 0, 1, -0.001),
            0.0015,
            0.0015,
            0.0015,
            '#ffd28a',
          );
      }
      const hub = sites[0];
      if (!hub) return;
      const tower =
        r === 0 ? world.layer('radio-mast', 'surface', { landmark: 'radio-mast' }) : world.ground;
      radioMast(
        tower,
        world
          .on(hub, random() * 6, 1, -0.0004)
          .multiply(new THREE.Matrix4().makeTranslation(0.012, 0, 0.012)),
        r === 0 ? 0.03 : 0.024,
      );
      const mill = world.around(hub, 6).find((f) => land.includes(f) && !f.used) ?? hub;
      if (r === 0) {
        mill.used = true;
        const s = 0.035;
        const at = world.on(mill, random() * 6);
        const layer = world.layer('windmill', 'surface', { landmark: 'windmill' });
        windmill(layer.solid, at, s, '#efe6d2', '#8a5a3a', false);
        const sails = world.layer('windmill-sails', 'surface', {
          landmark: 'windmill',
          matrix: local(at, 0, s * 0.78, s * 0.22).multiply(
            new THREE.Matrix4().makeRotationX(Math.PI / 2),
          ),
          motion: { kind: 'spin', speed: 0.8 },
        });
        windmillSails(sails.solid, new THREE.Matrix4().makeRotationX(-Math.PI / 2), s, '#e9dcc0');
      }
    });

    const fields = Math.round(land.length * decades(earth.agricultural_pollution, 0.1, 100) * 0.15);
    claim(faces, fields, (f) =>
      land.includes(f) && !f.used
        ? -Math.min(...regions.map((c) => 1 - c.up.dot(f.up))) * 8 + random() * 0.2
        : null,
    ).forEach((face, i) => {
      furrows(world, face, i % 2 ? '#c8cf6f' : '#a6c160', tangents(face.up).north);
      if (i === 0)
        terraces(
          world.layer('terraces', 'surface', { landmark: 'terraces' }),
          world.on(face),
          0.025,
        );
    });

    const ports = towns
      .map((t) => harbour(world, t.centre, { boats: ['sailboat', 'fishing'] }))
      .filter((p): p is THREE.Vector3 => !!p);
    harbourLoops(world, ports, { kinds: ['sailboat', 'fishing', 'canoe'], per: 2, speed: 0.003 });

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
