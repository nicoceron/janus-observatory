import * as THREE from 'three';
import { Sculpture, surface } from './sculpture';
import { scenarioObject } from './ScenarioObjects';
import { lunarBase, aerostat } from './HabitatModels';
import { machineStation } from './MachineModels';
import { panel, curveTube, membrane } from './modeling';
import type { Companion, SystemFeature } from '../../lib/system-portrait';
import type { WorldArt } from './worlds';

const white = '#e9ddc1',
  steel = '#55758b',
  gold = '#cfb281';

function coloredBody(art: WorldArt, body: Companion['body'], mobile: boolean) {
  const geometry = new THREE.IcosahedronGeometry(1, mobile ? 4 : 6);
  const p = geometry.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const n = new THREE.Vector3(),
    center = new THREE.Vector3();
  const craters = [
    [-0.31, 0.55, 0.77],
    [0.52, 0.08, 0.85],
    [-0.5, -0.43, 0.75],
    [0.28, -0.72, 0.64],
  ].map((v) => new THREE.Vector3(...v).normalize());
  const engineered = art.form === 'machine-swarm';
  for (let i = 0; i < p.count; i++) {
    n.fromBufferAttribute(p, i).normalize();
    let radius = 1;
    if (body === 'Moon')
      for (let c = 0; c < craters.length; c++) {
        const d = n.distanceTo(craters[c]),
          w = 0.2 + c * 0.017;
        radius -= 0.09 * Math.exp(-Math.pow(d / (w * 0.65), 4));
        radius += 0.028 * Math.exp(-Math.pow((d - w) / 0.07, 2));
      }
    if (body === 'Mars' && Math.abs(n.y + n.x * 0.18) < 0.09 && n.z > 0.2) radius -= 0.065;
    p.setXYZ(i, n.x * radius, n.y * radius, n.z * radius);
  }
  for (let i = 0; i < p.count; i += 3) {
    center.set(0, 0, 0);
    for (let k = 0; k < 3; k++) center.add(n.fromBufferAttribute(p, i + k));
    center.normalize();
    const patch = Math.sin(center.x * 7 + 0.6) * Math.cos(center.y * 5 - center.z * 4);
    let color: string;
    if (engineered && body === 'Venus')
      color = patch > 0.2 ? '#d7baa3' : patch < -0.35 ? '#867586' : '#b0949d';
    else if (engineered && body === 'Mars')
      color = patch > 0.2 ? '#99a5a6' : patch < -0.35 ? '#526477' : '#73838b';
    else if (body === 'Moon')
      color = patch > 0.25 ? '#c5c5b6' : patch < -0.3 ? '#7c91a2' : '#a3b1b4';
    else if (body === 'Venus') {
      // A pale, nearly featureless cloud deck with soft sideways chevrons, not gas-giant belts.
      const streak = Math.sin((center.y + Math.abs(center.x - 0.1) * 0.55) * 9 + center.z * 1.6);
      color = streak > 0.55 ? '#f1e3bf' : streak < -0.7 ? '#d2b98a' : '#e4d2a4';
    } else if (Math.abs(center.y) > 0.83) color = '#dcd7bd';
    else if (art.form === 'symbiosis' && patch > 0.06) color = patch > 0.45 ? '#71b6b1' : '#93ae7b';
    else if (art.form === 'engineered' && patch > 0.25) color = '#7d9e8d';
    else color = patch > 0.25 ? '#e3ad78' : patch < -0.27 ? '#a45f47' : '#c98560';
    const rgb = new THREE.Color(color);
    for (let k = 0; k < 3; k++) rgb.toArray(colors, (i + k) * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** A pressure habitat assembled from a spine, exposed green interior and unequal service wings. */
export function orbitalHabitat(s: Sculpture, m: THREE.Matrix4, variant = 0) {
  // Architectural cutaway: the missing wall reveals longitudinal parks and service decks.
  for (const [r, color] of [
    [0.16, white],
    [0.151, '#6e9d81'],
  ] as const)
    s.add(
      new THREE.CylinderGeometry(r, r, 0.68, 20, 1, true, 0.62, Math.PI * 1.56),
      color,
      [0, 0, 0],
      [0, 0, Math.PI / 2],
      undefined,
      m,
    );
  for (const x of [-0.35, 0.35]) {
    s.add(
      new THREE.TorusGeometry(0.166, 0.014, 5, 20),
      gold,
      [x, 0, 0],
      [0, Math.PI / 2, 0],
      undefined,
      m,
    );
    s.add(
      new THREE.CylinderGeometry(0.138, 0.138, 0.014, 16),
      steel,
      [x, 0, 0],
      [0, 0, Math.PI / 2],
      undefined,
      m,
    );
    s.add(
      new THREE.CylinderGeometry(0.051, 0.065, 0.1, 12),
      white,
      [x * 1.24, 0, 0],
      [0, 0, Math.PI / 2],
      undefined,
      m,
    );
    s.add(
      new THREE.TorusGeometry(0.052, 0.006, 5, 12),
      gold,
      [x * 1.38, 0, 0],
      [0, Math.PI / 2, 0],
      undefined,
      m,
    );
  }
  for (const z of [-0.081, 0.081]) {
    s.box([0.63, 0.012, 0.048], '#b6c395', [0, -0.101, z], m);
    s.bar([-0.32, -0.085, z], [0.32, -0.085, z], 0.003, white, m);
    for (let i = 0; i < 5; i++) {
      s.box(
        [0.063, 0.019, 0.03],
        i % 2 ? '#a5b47e' : '#729567',
        [-0.255 + i * 0.125, -0.079, z],
        m,
      );
      if (i % 2) {
        s.box([0.035, 0.03, 0.026], white, [-0.255 + i * 0.125, -0.057, z], m);
        s.box([0.027, 0.013, 0.028], steel, [-0.255 + i * 0.125, -0.035, z], m);
      } else s.ico(0.016, '#a8bd89', [-0.255 + i * 0.125, -0.055, z], [1, 1.45, 1], m, 1);
    }
  }
  s.box([0.6, 0.012, 0.041], '#77abb3', [0, -0.13, 0], m);
  for (const z of [-0.143, 0.143]) s.bar([-0.35, 0.033, z], [0.35, 0.033, z], 0.006, white, m);
  for (const x of [-0.22, 0, 0.22])
    s.add(
      new THREE.TorusGeometry(0.17, 0.006, 4, 20, Math.PI * 1.6),
      white,
      [x, 0, 0],
      [0, Math.PI / 2, 0.38],
      undefined,
      m,
    );
  for (const side of [-1, 1]) {
    s.bar([side * 0.24, -0.07, 0], [side * 0.25, -0.3, -0.03], 0.008, gold, m);
    panel(s, m, side < 0 ? 0.29 : 0.21, 0.21, [side * 0.24, -0.3, -0.03], side * 0.12);
    s.bar([side * 0.28, 0.1, -0.02], [side * 0.29, 0.27, -0.04], 0.006, white, m);
    s.box([0.12, 0.007, 0.14], steel, [side * 0.29, 0.27, -0.04], m);
  }
  s.bar([0, 0.13, -0.07], [0.035, 0.245, -0.1], 0.004, gold, m);
  s.ico(0.031, white, [0.035, 0.25, -0.1], [1, 0.35, 1], m, 1);
  if (variant) s.box([0.11, 0.026, 0.044], gold, [0.19, 0.15, -0.064], m);
}

/** S6's source-selected Venus surface activity: anchored equipment, insulated links and heat rejection. */
export function venusSurfaceFacility(s: Sculpture, m: THREE.Matrix4) {
  const ceramic = '#d8c8a5',
    insulation = '#b9895b',
    dark = '#465866';
  s.box([0.67, 0.055, 0.44], dark, [0, 0.047, 0], m);
  for (const x of [-0.27, 0.27])
    for (const z of [-0.16, 0.16]) {
      s.cylinder(0.027, 0.054, 0.055, insulation, [x, 0.0275, z], m, 6);
      s.bar([x, 0.02, z], [x * 0.74, 0.11, z * 0.7], 0.012, ceramic, m);
    }
  // A squat shielded process vessel and a narrow service tower have different jobs and profiles.
  s.cylinder(0.103, 0.124, 0.21, ceramic, [-0.065, 0.19, 0.01], m, 10);
  s.ico(0.105, ceramic, [-0.065, 0.303, 0.01], [1, 0.37, 1], m, 1);
  for (const y of [0.12, 0.2, 0.278])
    s.cylinder(0.126, 0.126, 0.012, insulation, [-0.065, y, 0.01], m, 10);
  s.cylinder(0.048, 0.062, 0.3, ceramic, [0.205, 0.23, -0.095], m, 8);
  s.cylinder(0.062, 0.069, 0.019, insulation, [0.205, 0.377, -0.095], m, 8);
  s.ico(0.049, ceramic, [0.205, 0.39, -0.095], [1, 0.35, 1], m, 1);
  s.box([0.15, 0.075, 0.15], insulation, [0.18, 0.118, 0.09], m);
  s.box([0.098, 0.042, 0.02], dark, [0.18, 0.119, 0.173], m);
  s.bar([0.025, 0.18, 0.035], [0.16, 0.18, 0.035], 0.026, ceramic, m);
  s.bar([0.16, 0.18, 0.035], [0.16, 0.15, 0.035], 0.026, ceramic, m);
  s.bar([0.16, 0.18, 0.035], [0.205, 0.18, -0.095], 0.017, insulation, m);
  // A supported, offset thermal bank leaves the maintenance face and access ramp unobstructed.
  for (const z of [-0.115, 0.115]) {
    s.bar([-0.26, 0.071, z], [-0.265, 0.23, z], 0.01, dark, m);
    s.bar([-0.2, 0.074, z], [-0.265, 0.23, z], 0.008, insulation, m);
  }
  s.box([0.03, 0.195, 0.31], dark, [-0.269, 0.229, 0], m);
  for (let i = 0; i < 6; i++)
    s.box([0.059, 0.014, 0.29], ceramic, [-0.275, 0.148 + i * 0.032, 0], m);
  s.bar([-0.173, 0.15, 0.07], [-0.24, 0.15, 0.07], 0.013, insulation, m);
  s.box([0.115, 0.014, 0.13], dark, [0.18, 0.038, 0.264], m, [0.35, 0, 0]);
  s.bar([0.126, 0.08, 0.204], [0.126, 0.027, 0.324], 0.004, ceramic, m);
  s.bar([0.234, 0.08, 0.204], [0.234, 0.027, 0.324], 0.004, ceramic, m);
}

export function venusMachineAperture(s: Sculpture, aperture: THREE.Matrix4) {
  s.cylinder(0.3, 0.36, 0.085, '#695969', [0, 0.025, 0], aperture, 10);
  s.add(
    new THREE.TorusGeometry(0.29, 0.05, 4, 10),
    gold,
    [0, 0.09, 0],
    [Math.PI / 2, 0, 0],
    [1, 1, 1],
    aperture,
  );
  s.ico(0.16, '#9dc5c4', [0, 0.095, 0], [1, 0.35, 1], aperture, 1);
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    s.box([0.1, 0.035, 0.21], '#e0cbaa', [Math.sin(a) * 0.37, 0.07, Math.cos(a) * 0.37], aperture, [
      0,
      a,
      0,
    ]);
  }
}

export function buildCompanionGeometry(art: WorldArt, companion: Companion, mobile: boolean) {
  const s = new Sculpture();
  s.add(coloredBody(art, companion.body, mobile), null);
  const machine = art.form === 'machine-swarm';
  if (companion.body === 'Moon') {
    for (const [lon, lat, r] of [
      [-22, 35, 0.18],
      [31, 4, 0.17],
      [-37, -30, 0.12],
      [18, -48, 0.14],
    ]) {
      const m = surface(lon, lat, 0.982);
      s.add(
        new THREE.TorusGeometry(r, 0.022, 3, 9),
        '#c2c3b3',
        [0, 0, 0],
        [Math.PI / 2, 0, 0],
        [1, 0.6, 1],
        m,
      );
    }
  }
  if (companion.activity === 'orbital') {
    const m = new THREE.Matrix4()
      .makeTranslation(0.65, 0.77, 0.6)
      .scale(new THREE.Vector3(0.6, 0.6, 0.6));
    if (machine) machineStation(s, m);
    else orbitalHabitat(s, m, 1);
    return s.finish();
  }
  if (companion.body === 'Venus') {
    if (machine) {
      // A large manufactured aperture gives Venus its own silhouette and visual language.
      const aperture = surface(-8, 22, 1.01);
      venusMachineAperture(s, aperture);
    }
    if (!machine && companion.activity === 'surface') {
      venusSurfaceFacility(s, surface(-15, 22, 1.012).scale(new THREE.Vector3(1.18, 1.18, 1.18)));
      scenarioObject(s, surface(42, -21, 1.012), 'radiator');
    } else if (!machine) {
      [
        [-25, 25, 0.86],
        [42, -24, 0.65],
      ].forEach(([lon, lat, size], i) =>
        aerostat(s, surface(lon, lat, 1.075).scale(new THREE.Vector3(size, size, size)), i),
      );
    } else
      for (const [lon, lat] of [
        [-44, 42],
        [39, -22],
      ])
        scenarioObject(s, surface(lon, lat, 1.02), 'radiator');
  } else {
    if (machine) {
      [
        [-23, 19],
        [27, -16],
        [-39, -26],
        [17, 43],
      ].forEach(([lon, lat], i) =>
        scenarioObject(
          s,
          surface(lon, lat, 1.01).scale(new THREE.Vector3(1.7, 1.7, 1.7)),
          (['reactor', 'radiator', 'manifold', 'control'] as const)[i],
        ),
      );
    } else {
      lunarBase(
        s,
        surface(-10, 18, 1.016).scale(new THREE.Vector3(1.32, 1.32, 1.32)),
        art,
        companion.body,
      );
      if (companion.body === 'Mars' && art.form === 'symbiosis') {
        for (const [lon, lat] of [
          [-39, -27],
          [42, 30],
          [43, -21],
        ])
          scenarioObject(
            s,
            surface(lon, lat, 1.015).scale(new THREE.Vector3(1.8, 1.8, 1.8)),
            'growth-pod',
          );
      }
    }
  }
  return s.finish();
}

export function buildSystemFeatureGeometry(art: WorldArt, feature: SystemFeature) {
  const s = new Sculpture();
  if (feature === 'solar') {
    s.ico(0.47, '#f5c86a', [0, 0, 0], [1, 1, 1], undefined, 2);
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9,
        r = 1.02;
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.7, Math.sin(a) * 0.43),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, -0.3, a)),
        new THREE.Vector3(1, 1, 1),
      );
      if (i % 3 === 0) {
        s.add(
          new THREE.OctahedronGeometry(0.27),
          '#dfd9b7',
          [0, 0, 0],
          [0, 0, 0],
          [0.65, 1.7, 0.1],
          m,
        );
        s.bar([0, -0.32, 0.02], [0, 0.32, 0.02], 0.011, gold, m);
      } else {
        for (const side of [-1, 1])
          s.box([0.12, 0.33, 0.016], i % 2 ? '#67899b' : '#b9c7c3', [side * 0.073, 0, 0], m);
        s.box([0.03, 0.36, 0.03], gold, [0, 0, 0.02], m);
      }
      s.ico(0.04, steel, [0, 0, 0.04], [1, 1, 1], m);
      if (i % 3 === 0)
        s.add(
          membrane(
            [
              [-0.13, 0.18, 0],
              [0, 0.24, 0.018],
              [0.13, 0.18, 0],
            ],
            0,
            0.02,
          ),
          '#d1c797',
          [0, 0, 0.026],
          [Math.PI / 2, 0, 0],
          undefined,
          m,
        );
      else
        for (let line = 0; line < 4; line++)
          s.box([0.25, 0.002, 0.019], '#9eafa9', [0, -0.12 + line * 0.08, 0.013], m);
    }
    for (let i = 0; i < 2; i++)
      s.add(
        new THREE.TorusGeometry(1.02, 0.009, 3, 40, Math.PI * 1.65),
        '#b9b88e',
        [0, 0, 0],
        [0.55 + i * 0.9, 0.1, -0.4],
        [1, 1, 1],
      );
  } else if (feature === 'outer') {
    // An inhabited icy foreground moon, with a distinct ringed giant behind it.
    const giant = new THREE.IcosahedronGeometry(0.39, 5),
      positions = giant.attributes.position,
      colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i += 3) {
      const y = (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3;
      const band = Math.sin(y * 47);
      const color = new THREE.Color(band > 0.3 ? '#c4aa8c' : band < -0.3 ? '#8d9ca6' : '#d5c4a3');
      for (let j = 0; j < 3; j++) color.toArray(colors, (i + j) * 3);
    }
    giant.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    s.add(giant, null, [0.53, 0.35, -0.31]);
    for (let i = 0; i < 5; i++)
      s.add(
        new THREE.RingGeometry(0.47 + i * 0.043, 0.503 + i * 0.043, 64),
        '#a89c92',
        [0.53, 0.35, -0.31],
        [1.08, 0.18, -0.28],
      );
    s.ico(0.48, '#afc3c5', [-0.37, -0.12, 0.17], [1, 0.94, 1], undefined, 4);
    s.ico(0.16, '#d5ddcf', [-0.46, 0.206, 0.394], [1.6, 0.39, 0.8], undefined, 1);
    curveTube(
      s,
      [
        [-0.76, -0.09, 0.29],
        [-0.55, -0.07, 0.55],
        [-0.4, 0.03, 0.62],
        [-0.26, 0.18, 0.5],
      ],
      0.007,
      '#668d9e',
    );
    const settlement = surface(-17, 23, 0.48)
      .premultiply(new THREE.Matrix4().makeTranslation(-0.37, -0.12, 0.17))
      .scale(new THREE.Vector3(0.53, 0.53, 0.53));
    if (art.form === 'machine-swarm') machineStation(s, settlement, true);
    else lunarBase(s, settlement, art);
  } else if (feature === 'kuiper') {
    // One fractured ice body, a drilling collar and unequal outriggers; distinct from a rock belt.
    s.ico(0.43, '#b3d3db', [-0.08, 0, 0], [1.25, 0.83, 1], undefined, 0);
    s.ico(0.25, '#779fb5', [0.15, -0.12, 0.13], [0.65, 1.3, 0.82]);
    s.ico(0.16, '#d7e5db', [-0.53, 0.22, -0.04], [0.85, 1.3, 0.7]);
    s.ico(0.11, '#8ea8c7', [0.5, 0.29, -0.18], [1.2, 0.6, 1]);
    const m = new THREE.Matrix4().makeTranslation(-0.03, 0.27, 0.06);
    s.cylinder(0.15, 0.18, 0.07, steel, [0, 0, 0], m, 8);
    s.bar([0, -0.15, 0], [0, 0.18, 0], 0.033, gold, m);
    for (const side of [-1, 1]) {
      s.bar([side * 0.09, 0, 0], [side * 0.35, 0.19, 0], 0.017, white, m);
      s.box([side < 0 ? 0.18 : 0.12, 0.025, 0.23], '#467b97', [side * 0.35, 0.19, 0], m);
    }
    s.bar([-0.34, 0.04, 0.31], [0.08, -0.16, 0.32], 0.026, '#567eaa');
    s.box([0.3, 0.018, 0.12], steel, [-0.04, 0.027, 0.08], m);
    for (let i = 0; i < 3; i++) {
      const x = -0.13 + i * 0.09;
      s.cylinder(0.026, 0.034, 0.083, '#c6d2d0', [x, 0.078, 0.08], m, 10);
      s.bar([x, 0.04, 0.08], [x, -0.06, 0.08], 0.008, gold, m);
    }
    curveTube(
      s,
      [
        [-0.25, 0.02, 0.36],
        [-0.1, 0.13, 0.39],
        [0.05, 0.05, 0.4],
        [0.2, -0.03, 0.29],
      ],
      0.006,
      '#d7e3d8',
    );
    for (const side of [-1, 1])
      s.bar([side * 0.12, 0.27, 0.1], [side * 0.34, 0.11, 0.15], 0.008, gold);
    s.add(
      new THREE.TorusGeometry(0.09, 0.01, 5, 14),
      white,
      [-0.035, 0.41, 0.06],
      [Math.PI / 2, 0, 0],
    );
  } else {
    s.ico(0.51, '#9d8870', [-0.13, 0, 0], [1.15, 0.72, 1], undefined, 2);
    s.ico(0.22, '#715e52', [-0.39, -0.15, 0.29], [0.8, 0.63, 1.3], undefined, 1);
    s.ico(0.13, '#bcaa8a', [0.49, 0.28, -0.31], [1.1, 0.8, 1], undefined, 1);
    curveTube(
      s,
      [
        [-0.63, 0.06, 0.17],
        [-0.46, 0.22, 0.22],
        [-0.21, 0.34, 0.2],
        [0.04, 0.3, 0.27],
        [0.27, 0.1, 0.22],
      ],
      0.01,
      '#c5b791',
    );
    const mine = new THREE.Matrix4()
      .makeTranslation(-0.14, 0.315, 0.045)
      .scale(new THREE.Vector3(0.82, 0.82, 0.82));
    machineStation(s, mine, true);
    for (const x of [-0.26, -0.12, 0.02]) {
      s.cylinder(0.035, 0.037, 0.09, '#c5b893', [x, 0.33, 0.233], undefined, 10);
      s.bar([x, 0.32, 0.25], [x + 0.05, 0.21, 0.37], 0.005, gold);
    }
    panel(s, new THREE.Matrix4(), 0.2, 0.21, [0.23, 0.22, -0.12], -0.37);
    s.bar([0.2, 0.11, -0.1], [0.23, 0.22, -0.12], 0.01, steel);
    const tug = new THREE.Matrix4()
      .makeTranslation(0.47, -0.24, 0.22)
      .scale(new THREE.Vector3(0.46, 0.46, 0.46));
    machineStation(s, tug);
    curveTube(
      s,
      [
        [0.17, -0.05, 0.27],
        [0.32, -0.22, 0.27],
        [0.47, -0.24, 0.22],
      ],
      0.003,
      white,
    );
  }
  return s.finish();
}
