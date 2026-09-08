import * as THREE from 'three';
import { Sculpture, surface, type Vec } from './sculpture';
import { scenarioObject } from './ScenarioObjects';
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
    else if (body === 'Venus')
      color = Math.sin(center.y * 13 + center.x * 3) > 0.2 ? '#e8c181' : '#c39862';
    else if (Math.abs(center.y) > 0.83) color = '#dcd7bd';
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
export function orbitalHabitat(s: Sculpture, parent: THREE.Matrix4, variant = 0) {
  const m = parent;
  s.add(
    new THREE.CylinderGeometry(0.15, 0.15, 0.67, 10, 1, true, 0.4, Math.PI * 1.62),
    white,
    [0, 0, 0],
    [0, 0, Math.PI / 2],
    [1, 1, 1],
    m,
  );
  s.add(
    new THREE.CylinderGeometry(0.11, 0.11, 0.57, 10),
    '#86aa86',
    [0, 0, 0],
    [0, 0, Math.PI / 2],
    [1, 1, 1],
    m,
  );
  for (const side of [-1, 1]) {
    s.add(
      new THREE.TorusGeometry(0.17, 0.025, 5, 12),
      gold,
      [side * 0.31, 0, 0],
      [0, Math.PI / 2, 0],
      [1, 1, 1],
      m,
    );
    s.add(
      new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8),
      steel,
      [side * 0.39, 0, 0],
      [0, 0, Math.PI / 2],
      [1, 1, 1],
      m,
    );
    const span = side < 0 ? 0.29 : 0.22;
    s.box([span, 0.014, 0.19], '#447391', [side * 0.28, -0.25, 0], m);
    s.bar([side * 0.24, -0.11, 0], [side * 0.28, -0.25, 0], 0.012, gold, m);
    for (let i = 0; i < 4; i++)
      s.box([0.003, 0.019, 0.18], '#abc4c1', [side * 0.28 + ((i - 1.5) * span) / 4, -0.25, 0], m);
  }
  for (const z of [-0.12, 0.12]) s.bar([-0.32, 0.08, z], [0.32, 0.08, z], 0.009, white, m);
  s.bar([0, 0.12, 0], [0.08, 0.29, -0.03], 0.007, gold, m);
  s.ico(0.057, white, [0.08, 0.3, -0.03], [1, 0.3, 1], m);
  if (variant) s.ico(0.065, '#a9c0b8', [-0.15, 0.21, 0.01], [1.4, 0.65, 1], m);
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
    if (machine) scenarioObject(s, m, 'control');
    else orbitalHabitat(s, m, 1);
    return s.finish();
  }
  if (companion.body === 'Venus') {
    if (machine) {
      // A large manufactured aperture gives Venus its own silhouette and visual language.
      const aperture = surface(-8, 22, 1.01);
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
        s.box(
          [0.1, 0.035, 0.21],
          '#e0cbaa',
          [Math.sin(a) * 0.37, 0.07, Math.cos(a) * 0.37],
          aperture,
          [0, a, 0],
        );
      }
    }
    for (const [lon, lat, size] of [
      [-43, 53, 0.26],
      [34, -15, 0.22],
      [-40, -25, 0.16],
    ]) {
      const m = surface(lon, lat, 1.01);
      if (!machine) s.ico(size, '#eed29b', [0, 0.04, 0], [1.6, 0.4, 0.7], m);
      if (!machine) {
        s.bar([0, 0.09, 0], [0, 0.32, 0], 0.023, gold, m);
        s.ico(
          size * 0.76,
          art.form === 'engineered' ? '#93adb2' : '#ded5b5',
          [0, 0.35, 0],
          [1.3, 0.32, 0.85],
          m,
        );
        s.cylinder(size * 0.6, size * 0.7, 0.045, steel, [0, 0.27, 0], m, 8);
      } else scenarioObject(s, m, lat > 0 ? 'radiator' : 'control', 1);
    }
  } else {
    const sites = [
      [-23, 19],
      [27, -16],
      [-39, -26],
      [17, 43],
    ];
    sites.slice(0, art.form === 'fractured' ? 2 : 4).forEach(([lon, lat], i) => {
      const size = art.form === 'fractured' ? 1.65 : art.form === 'symbiosis' ? 1.4 : 1.2;
      const m = surface(lon, lat, 0.98).scale(new THREE.Vector3(size, size, size));
      if (machine)
        scenarioObject(s, m, (['reactor', 'radiator', 'manifold', 'control'] as const)[i]);
      else if (art.form === 'fractured') scenarioObject(s, m, 'bunker', i);
      else if (art.form === 'symbiosis') scenarioObject(s, m, i % 2 ? 'bio-arch' : 'growth-pod', i);
      else if (art.form === 'engineered') scenarioObject(s, m, i % 2 ? 'reactor' : 'manifold', i);
      else if (art.form === 'extraction') scenarioObject(s, m, i % 2 ? 'derrick' : 'depot', i);
      else if (art.form === 'ecumenopolis')
        scenarioObject(s, m, i % 2 ? 'watchtower' : 'tenement', i);
      else {
        s.ico(
          0.14,
          art.form === 'duality' ? '#d5dab6' : '#b4d3b9',
          [0, 0.11, 0],
          [1.25, 0.8, 1],
          m,
          1,
        );
        s.cylinder(0.12, 0.14, 0.04, white, [0, 0.02, 0], m, 8);
        s.box([0.2, 0.012, 0.12], '#557f99', [0.23, 0.03, 0], m);
      }
      if (i < 2) s.bar([0, 0.025, 0.08], [0.26, 0.025, 0.18], 0.014, gold, m);
    });
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
    s.ico(
      0.55,
      art.form === 'symbiosis' ? '#adbcc9' : '#b3c4c1',
      [0, 0, 0],
      [1, 0.9, 1],
      undefined,
      2,
    );
    s.add(new THREE.RingGeometry(0.69, 0.98, 24), '#b7a993', [0, 0, 0], [1.05, 0.25, -0.25]);
    s.add(new THREE.RingGeometry(1.01, 1.06, 24), '#818d90', [0, 0, 0], [1.05, 0.25, -0.25]);
    s.ico(0.2, '#d4d1b8', [-0.77, 0.55, 0.2], [1, 1, 1], undefined, 1);
    const m = new THREE.Matrix4()
      .makeTranslation(-0.77, 0.73, 0.2)
      .scale(new THREE.Vector3(0.6, 0.6, 0.6));
    scenarioObject(
      s,
      m,
      art.form === 'ecumenopolis'
        ? 'tenement'
        : art.form === 'machine-swarm'
          ? 'control'
          : 'growth-pod',
    );
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
  } else {
    for (let i = 0; i < 4; i++) {
      const pos: Vec = [(i - 1.5) * 0.37, Math.sin(i * 2.4) * 0.2, Math.cos(i * 1.7) * 0.15];
      s.ico(0.22 - i * 0.021, i % 2 ? '#a48969' : '#b7a68b', pos, [1.2, 0.8, 1], undefined, 1);
      if (i === 1) {
        const m = new THREE.Matrix4()
          .makeTranslation(pos[0], pos[1] + 0.15, pos[2])
          .scale(new THREE.Vector3(0.8, 0.8, 0.8));
        scenarioObject(
          s,
          m,
          art.form === 'extraction'
            ? 'derrick'
            : art.form === 'machine-swarm'
              ? 'manifold'
              : 'control',
        );
      }
    }
  }
  return s.finish();
}
