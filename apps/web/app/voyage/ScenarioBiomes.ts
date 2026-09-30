import { landmarkCoordinates } from './landmark-plan';
import { roadClearance } from './activity-corridor';
import * as THREE from 'three';
import { Sculpture } from './sculpture';
import { scenarioObject, type ObjectKind } from './ScenarioObjects';
import type { Ground } from './planet-surface';
import type { WorldArt } from './worlds';

/** Art direction only: these object families do not encode quantities or settlement counts. */
export const objectFamilies: Record<Exclude<WorldArt['form'], 'origin'>, ObjectKind[]> = {
  ecumenopolis: ['checkpoint', 'tenement', 'watchtower', 'depot'],
  extraction: ['hauler', 'derrick', 'conveyor', 'reservoir'],
  arcadia: ['courtyard', 'pavilion', 'terrace', 'glasshouse'],
  wilderness: ['camp', 'rack', 'store', 'totem'],
  symbiosis: ['growth-pod', 'bio-arch', 'synthesis', 'petal-house'],
  engineered: ['reactor', 'radiator', 'manifold', 'control'],
  reclaimed: ['watermill', 'workshop', 'seed-bank', 'windmill'],
  fractured: ['bunker', 'salvage', 'broken-dish', 'pylon'],
  'machine-swarm': ['gift'],
  duality: ['canopy', 'windmill', 'store'],
};

function vegetation(
  s: Sculpture,
  m: THREE.Matrix4,
  h: number,
  variant: number,
  form: WorldArt['form'],
) {
  const green = form === 'reclaimed' ? '#91a969' : form === 'arcadia' ? '#8bb885' : '#62a775';
  const b = variant % 5;
  const wood = form === 'arcadia' ? '#8b785d' : '#866346';
  s.bar([0, 0, 0], [h * 0.055, h * 0.62, 0], 0.012, wood, m);
  if (b === 0) {
    for (let i = 0; i < 3; i++)
      s.cone(
        h * (0.33 - i * 0.065),
        h * 0.51,
        i % 2 ? '#85b781' : green,
        [0, h * (0.42 + i * 0.22), 0],
        m,
        5,
      );
  } else if (b === 1) {
    for (const side of [-1, 1]) {
      s.bar([0, h * 0.4, 0], [side * h * 0.32, h * 0.76, 0], 0.007, wood, m);
      s.ico(
        h * 0.39,
        side < 0 ? green : '#a4c588',
        [side * h * 0.22, h * 0.79, 0],
        [1.2, 0.45, 0.85],
        m,
      );
    }
  } else if (b === 2) {
    s.ico(h * 0.31, green, [h * 0.055, h * 0.87, 0], [0.63, 1.7, 0.72], m, 1);
    s.ico(h * 0.2, '#b8cd96', [-h * 0.17, h * 0.67, 0.02], [0.8, 1.2, 0.75], m);
  } else if (b === 3) {
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      s.add(
        new THREE.OctahedronGeometry(h * 0.31),
        i % 2 ? '#9cbe7d' : green,
        [Math.cos(a) * h * 0.2, h * 0.7, Math.sin(a) * h * 0.2],
        [0.2 * Math.sin(a), a, -0.45 * Math.cos(a)],
        [0.45, 0.4, 1.5],
        m,
      );
    }
  } else {
    s.ico(h * 0.36, form === 'arcadia' ? '#d2b09c' : green, [0, h * 0.75, 0], [1, 1.2, 0.85], m);
    for (const side of [-1, 1])
      s.ico(h * 0.23, '#b5c790', [side * h * 0.26, h * 0.62, 0.01], [0.9, 1.4, 0.8], m);
  }
}

function groundPose(g: Ground, lon: number, lat: number, scale: number) {
  for (const offset of [0, 7, -7, 14, -14, 21, -21]) {
    const direction = g.direction(lon + offset, lat + offset * 0.25);
    if (g.project(direction, 0).length() >= scale * 0.99)
      return g
        .pose(lon + offset, lat + offset * 0.25)
        .scale(new THREE.Vector3(scale, scale, scale));
  }
  return null;
}

/** Irregular patches and distinct assemblies replace the repeating latitude/longitude prop grid. */
export function addScenarioBiomes(
  s: Sculpture,
  g: Ground,
  art: WorldArt,
  scale: number,
  mobile: boolean,
) {
  if (art.form === 'origin') return;
  if (art.form === 'engineered') {
    return;
  }
  const family = objectFamilies[art.form];
  const quiet = ['machine-swarm', 'duality'].includes(art.form);
  const focalSites = landmarkCoordinates(art.form);
  if (art.form === 'reclaimed') {
    const garden = groundPose(g, -5, 21, scale);
    if (garden) {
      for (let bed = 0; bed < 3; bed++) {
        const z = (bed - 1) * 0.085;
        s.box([0.21 - bed * 0.022, 0.022, 0.058], '#9b8a65', [bed * 0.018, 0.02, z], garden);
        s.box([0.19 - bed * 0.022, 0.012, 0.042], '#76995c', [bed * 0.018, 0.038, z], garden);
        for (let plant = 0; plant < 3 - bed; plant++)
          s.ico(
            0.022,
            bed % 2 ? '#c4c984' : '#a7bc70',
            [-0.06 + plant * 0.058, 0.062, z],
            [1, 1.4, 0.6],
            garden,
          );
      }
      s.bar([-0.16, 0.029, -0.11], [-0.16, 0.029, 0.11], 0.014, '#84aead', garden);
    }
  }
  const count = quiet ? 169 : 83;
  const clear = roadClearance(art, mobile);
  for (let i = 0; i < count; i++) {
    if (mobile && i % 4 === 0) continue;
    const lat = THREE.MathUtils.radToDeg(Math.asin(1 - (2 * (i + 0.5)) / count));
    const lon = ((i * 137.508 + art.seed * 0.71) % 360) - 180;
    if (Math.abs(lat) > 67) continue;
    if (!quiet && lat > 15 && Math.abs(lon) < 53) continue;
    if (art.form === 'fractured' && Math.abs(lon) < 17) continue;
    if (focalSites.some(([x, y]) => Math.hypot((x - lon) * 0.8, y - lat) < 19)) continue;
    if (Math.sin(lon * 0.095 + art.seed) + Math.cos(lat * 0.15) < -0.8) continue;
    if (g.project(g.direction(lon, lat), 0).length() < scale * 0.99) continue;
    if (!clear(g.project(g.direction(lon, lat), 0))) continue;
    const m = g.pose(lon, lat).scale(new THREE.Vector3(scale, scale, scale));
    m.multiply(new THREE.Matrix4().makeRotationY(Math.sin(i * 1.87) * 1.1));
    const variant = Math.floor(i / 4) + (i % 7);
    if (quiet || art.form === 'wilderness' || art.form === 'arcadia' || art.form === 'reclaimed') {
      if (!quiet && i % (art.form === 'wilderness' ? 11 : 5) === 0) {
        m.scale(new THREE.Vector3(0.68, 0.63 + (i % 3) * 0.1, 0.7));
        scenarioObject(s, m, family[variant % family.length], variant);
      } else vegetation(s, m, 0.13 + (i % 5) * 0.024, variant, art.form);
    } else if (art.form === 'symbiosis' && i % 3 !== 0) {
      const h = 0.13 + (i % 3) * 0.04;
      s.bar([0, 0, 0], [0.02, h, 0], 0.013, '#669c88', m);
      s.ico(0.07, i % 2 ? '#b89bbd' : '#99c8ba', [0.02, h, 0], [0.7, 1.2, 0.8], m);
      s.add(
        new THREE.OctahedronGeometry(0.056),
        '#c9d7a2',
        [-0.04, h * 0.57, 0.025],
        [0, 0, -0.75],
        [0.45, 1.6, 0.6],
        m,
      );
    } else if (art.form === 'fractured' && i % 3 !== 0) {
      s.ico(0.075, '#ac8a7c', [0, 0.02, 0], [1.2, 0.45, 0.8], m);
      if (i % 2) s.box([0.09, 0.02, 0.046], '#9b8d84', [0.035, 0.045, 0], m, [0, i * 0.6, -0.1]);
    } else {
      if (i % 3 !== 0) {
        if (art.form === 'ecumenopolis') {
          // Low-rise urban fabric between the towers; a city world has no loose boulders.
          const tall = 0.045 + (i % 4) * 0.014,
            low = 0.03 + ((i + 1) % 3) * 0.011;
          s.box(
            [0.085, tall, 0.07],
            ['#b8ad97', '#a39785', '#c7bda6'][i % 3],
            [-0.02, tall / 2, 0],
            m,
          );
          s.box([0.06, low, 0.075], '#8e8a7e', [0.045, low / 2, 0.012], m);
        } else s.ico(0.064, art.highland, [0, 0.018, 0], [1.3, 0.55, 0.85], m);
        continue;
      }
      const k = 0.56 + (i % 4) * 0.06;
      m.scale(new THREE.Vector3(k, k * (0.86 + (i % 3) * 0.16), k));
      scenarioObject(
        s,
        m,
        family[variant % family.length] === 'hauler' ? 'depot' : family[variant % family.length],
        variant,
      );
    }
  }
}
