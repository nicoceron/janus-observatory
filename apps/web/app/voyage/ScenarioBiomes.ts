import * as THREE from 'three';
import { Sculpture, surface } from './sculpture';
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

function engineeredDistricts(s: Sculpture, art: WorldArt) {
  const kinds = objectFamilies.engineered;
  const sites = [
    [-31, 17],
    [28, -17],
    [-6, -46],
    [58, 14],
    [-71, -18],
    [125, 32],
    [-146, 7],
  ];
  sites.forEach(([lon, lat], i) => {
    const m = surface(lon, lat, 1.083);
    s.cylinder(0.15, 0.17, 0.024, '#6c788d', [0, 0.01, 0], m, 6);
    scenarioObject(s, m, kinds[i % kinds.length], i);
    if (i < 3) {
      const side = m
        .clone()
        .multiply(new THREE.Matrix4().makeTranslation(0.2, 0, -0.065))
        .scale(new THREE.Vector3(0.65, 0.65, 0.65));
      scenarioObject(s, side, kinds[(i + 2) % kinds.length], i + 1);
      s.bar([0, 0.04, 0.13], [0.24, 0.04, 0.13], 0.012, '#c1a271', m);
      s.bar([0.24, 0.04, 0.13], [0.24, 0.04, -0.09], 0.012, '#96b8b9', m);
    }
  });
  // A visibly different pressure core, with offset radiator wings, marks the front shell.
  const core = surface(2, 24, 1.09);
  scenarioObject(s, core.clone().scale(new THREE.Vector3(1.45, 1.45, 1.45)), 'reactor', art.seed);
}

function watercraft(s: Sculpture, g: Ground, scale: number, form: WorldArt['form']) {
  if (!['arcadia', 'wilderness', 'reclaimed', 'duality'].includes(form)) return;
  let count = 0;
  for (let lon = -61; lon < 73 && count < 2; lon += 17) {
    const lat = -18 + count * 27;
    if (g.project(g.direction(lon, lat), 0).length() > scale * 0.97) continue;
    const m = g.pose(lon, lat).scale(new THREE.Vector3(scale, scale, scale));
    if (form === 'wilderness') {
      s.ico(0.1, '#ac8554', [0, 0.008, 0], [0.36, 0.2, 1.5], m);
      s.ico(0.085, '#4d6053', [0, 0.027, 0], [0.3, 0.08, 1.2], m);
      s.bar([-0.06, 0.035, -0.04], [0.07, 0.035, 0.08], 0.004, '#d3bd8f', m);
    } else if (form === 'arcadia') {
      for (const x of [-0.045, 0.045]) s.ico(0.1, '#daceaf', [x, 0.008, 0], [0.2, 0.2, 1.25], m);
      s.box([0.115, 0.025, 0.15], '#719c94', [0, 0.04, 0], m);
      s.ico(0.055, '#a3c7b3', [0, 0.075, -0.01], [0.9, 0.6, 1.5], m);
    } else {
      s.ico(0.1, '#99744e', [0, 0.005, 0], [0.48, 0.23, 1.25], m);
      s.bar([0, 0.02, 0], [0, 0.2, 0], 0.005, '#d1b886', m);
      s.add(
        new THREE.ConeGeometry(0.068, 0.16, 3),
        '#d7d4ae',
        [0, 0.12, 0.025],
        [0, -0.4, 0],
        [0.12, 1, 1],
        m,
      );
    }
    for (const side of [-1, 1])
      s.bar([side * 0.035, 0.009, 0.06], [side * 0.065, 0.009, 0.17], 0.0025, '#9fc6c1', m);
    count++;
  }
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
    engineeredDistricts(s, art);
    return;
  }
  const family = objectFamilies[art.form];
  const quiet = ['machine-swarm', 'duality'].includes(art.form);
  const focalSites =
    art.form === 'reclaimed'
      ? [
          [-13, 5],
          [9, 25],
          [30, -19],
          [-45, 11],
        ]
      : art.form === 'machine-swarm'
        ? [
            [-31, 7],
            [28, -19],
            [3, 43],
          ]
        : art.form === 'duality'
          ? [
              [-35, 15],
              [12, -31],
              [27, 34],
            ]
          : [
              [-30, -16],
              [28, -22],
              [39, 4],
              [-45, 11],
            ];
  focalSites.forEach(([lon, lat], i) => {
    const m = groundPose(g, lon, lat, scale);
    if (!m) return;
    const size = quiet
      ? 0.73
      : art.form === 'reclaimed'
        ? 1.22
        : art.form === 'wilderness'
          ? 1.05
          : 1.08;
    m.scale(new THREE.Vector3(size, size, size));
    scenarioObject(s, m, family[i % family.length], i);
    if (!quiet && i < 2) {
      const satellite = m
        .clone()
        .multiply(new THREE.Matrix4().makeTranslation(-0.2, 0, -0.13))
        .scale(new THREE.Vector3(0.57, 0.57, 0.57));
      scenarioObject(s, satellite, family[(i + 2) % family.length], i + 1);
    }
  });
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
  const count = 119;
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
      const k = 0.56 + (i % 4) * 0.06;
      m.scale(new THREE.Vector3(k, k * (0.86 + (i % 3) * 0.16), k));
      scenarioObject(s, m, family[variant % family.length], variant);
    }
  }
  watercraft(s, g, scale, art.form);
}
