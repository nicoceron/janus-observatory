import * as THREE from 'three';
import { Sculpture, type Vec } from './sculpture';
import { curveTube, loft, panel, porthole } from './modeling';
import { vehicle } from './LifeModels';
import type { WorldArt } from './worlds';
const chalk = '#dedbd0',
  ink = '#3a5366',
  ochre = '#c4a277';
function pressureModule(s: Sculpture, m: THREE.Matrix4, length = 0.28, color = chalk) {
  s.add(
    loft(
      [
        [-length / 2 - 0.025, 0.024, 0.065, 0.105],
        [-length / 2, 0.068, 0.027, 0.145],
        [length / 2, 0.068, 0.027, 0.145],
        [length / 2 + 0.025, 0.024, 0.065, 0.105],
      ],
      12,
    ),
    color,
    undefined,
    undefined,
    undefined,
    m,
  );
  for (const z of [-length * 0.35, length * 0.35]) {
    s.add(
      new THREE.TorusGeometry(0.063, 0.006, 5, 12),
      ochre,
      [0, 0.086, z],
      [0, 0, 0],
      [1, 0.94, 1],
      m,
    );
    for (const x of [-0.055, 0.055]) s.box([0.02, 0.04, 0.033], ink, [x, 0.027, z], m);
  }
  for (const z of [-length * 0.27, 0, length * 0.27])
    for (const side of [-1, 1])
      s.box([0.008, 0.034, 0.035], '#3b6575', [side * 0.065, 0.097, z], m);
  porthole(s, m, [0, 0.086, length / 2 + 0.027], 0.022);
  s.box([0.045, 0.012, 0.04], ochre, [0, 0.047, length / 2 + 0.046], m);
  for (let i = 0; i < 3; i++)
    s.box([0.045, 0.009, 0.024], chalk, [0, 0.035 - i * 0.009, length / 2 + 0.06 + i * 0.019], m);
}
function node(m: THREE.Matrix4, p: Vec, rot = 0, scale = 1) {
  return m
    .clone()
    .multiply(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...p),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)),
        new THREE.Vector3(scale, scale, scale),
      ),
    );
}
function dish(s: Sculpture, m: THREE.Matrix4, p: Vec) {
  const d = node(m, p);
  s.bar([0, 0, 0], [0, 0.16, 0], 0.008, ink, d);
  s.add(
    new THREE.SphereGeometry(0.067, 14, 5, 0, Math.PI * 2, 0, Math.PI * 0.48),
    chalk,
    [0, 0.17, 0],
    [-0.5, 0, 0.3],
    [1, 0.38, 1],
    d,
  );
  s.bar([0, 0.17, 0], [0, 0.213, -0.016], 0.0035, ochre, d);
}
/** Connected pressure architecture, separate utility yard, airlocks, radiators and rover access. */
export function lunarBase(
  s: Sculpture,
  m: THREE.Matrix4,
  art: WorldArt,
  body: 'Moon' | 'Mars' = 'Moon',
) {
  const shelter = art.form === 'fractured',
    industrial = art.form === 'extraction',
    bio = art.form === 'symbiosis',
    civic = art.form === 'arcadia' || art.form === 'duality';
  const color = body === 'Mars' ? '#ddd2b7' : chalk;
  s.cylinder(0.23, 0.25, 0.014, '#777e7c', [0, 0.002, 0], m, 12);
  const sites: Vec[] = [
    [-0.14, 0, -0.018],
    [0.125, 0, 0.018],
    [0.013, 0, -0.226],
  ];
  sites.forEach((p, i) => {
    const unit = node(m, p, i === 2 ? Math.PI / 2 : 0, i === 2 ? 0.74 : 1);
    pressureModule(s, unit, i === 0 ? 0.3 : 0.22, color);
    if (shelter) {
      s.ico(0.13, '#8d9490', [p[0], 0.04, p[2] - 0.03], [1.1, 0.68, 1.55], m, 1);
      s.box([0.083, 0.072, 0.021], '#baa990', [p[0], 0.05, p[2] + 0.176], m);
      s.box([0.051, 0.051, 0.024], '#343f49', [p[0], 0.044, p[2] + 0.186], m);
    }
  });
  for (const x of [-0.072, 0.058]) s.bar([x, 0.077, 0.014], [0, 0.077, 0.014], 0.027, color, m);
  s.bar([0, 0.077, 0.014], [0, 0.077, -0.195], 0.027, color, m);
  s.cylinder(0.063, 0.066, 0.104, color, [0, 0.066, 0.014], m, 10);
  s.add(
    new THREE.SphereGeometry(0.064, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    civic || bio ? '#8aafa9' : ochre,
    [0, 0.118, 0.014],
    undefined,
    [1, 0.64, 1],
    m,
  );
  s.box([0.115, 0.013, 0.088], '#a4aa9f', [0.105, 0.012, 0.185], m);
  for (const x of [0.075, 0.132]) s.bar([x, 0.033, 0.142], [x, 0.033, 0.219], 0.003, ochre, m);
  for (let i = 0; i < 3; i++) {
    const p: Vec = [-0.31 + i * 0.135, 0.06, 0.248];
    panel(s, m, 0.12, 0.115, p);
    s.bar([p[0], 0.006, p[2]], [p[0], 0.06, p[2]], 0.0045, ink, m);
  }
  for (const x of [0.274, 0.304, 0.334])
    s.box([0.009, 0.112, 0.122], ink, [x, 0.058, -0.117], m, [0, 0, 0.15]);
  curveTube(
    s,
    [
      [0.126, 0.028, -0.02],
      [0.21, 0.028, -0.012],
      [0.27, 0.02, -0.1],
    ],
    0.008,
    ochre,
    m,
  );
  for (const x of [0.24, 0.303]) {
    s.cylinder(0.025, 0.025, 0.091, color, [x, 0.051, 0.06], m, 10);
    s.add(
      new THREE.SphereGeometry(0.025, 8, 4),
      ochre,
      [x, 0.098, 0.06],
      undefined,
      [1, 0.5, 1],
      m,
    );
  }
  dish(s, m, [-0.23, 0, -0.18]);
  if (art.form === 'ecumenopolis') {
    s.cylinder(0.048, 0.069, 0.13, color, [0, 0.197, 0.014], m, 8);
    s.cylinder(0.059, 0.059, 0.024, ink, [0, 0.243, 0.014], m, 8);
    s.cylinder(0.066, 0.057, 0.018, ochre, [0, 0.267, 0.014], m, 8);
    s.bar([0.038, 0.25, 0.014], [0.038, 0.343, 0.014], 0.004, ink, m);
  }
  if (art.form === 'engineered')
    for (let i = 0; i < 5; i++) {
      s.box(
        [0.008, 0.126, 0.14],
        i % 2 ? '#aaabb4' : ink,
        [-0.22 + i * 0.047, 0.092, -0.34],
        m,
        [0.18, 0, 0.1],
      );
      s.bar([-0.22 + i * 0.047, 0.029, -0.34], [0.04, 0.029, -0.195], 0.004, ochre, m);
    }
  if (bio) {
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      curveTube(
        s,
        [
          [Math.cos(a) * 0.07, 0.118, Math.sin(a) * 0.07 + 0.014],
          [Math.cos(a) * 0.07, 0.23, Math.sin(a) * 0.07 + 0.014],
          [0, 0.28, 0.014],
        ],
        0.006,
        '#c5d3ad',
        m,
      );
    }
    s.ico(0.055, '#a4c9b0', [0, 0.202, 0.014], [0.78, 1.35, 0.78], m, 1);
  }
  if (industrial) {
    const a = node(m, [0.06, 0, -0.36]);
    for (const x of [-0.074, 0.074])
      for (const z of [-0.046, 0.046]) s.bar([x, 0, z], [x * 0.4, 0.2, z * 0.4], 0.005, ochre, a);
    s.bar([-0.055, 0.195, 0], [0.16, 0.195, 0], 0.009, color, a);
    s.bar([0.14, 0.195, 0], [0.14, 0.08, 0], 0.0025, ink, a);
    s.box([0.094, 0.048, 0.06], '#b98754', [0.14, 0.06, 0], a);
    s.box([0.31, 0.017, 0.065], ink, [0.07, 0.023, -0.067], a);
    for (let i = 0; i < 7; i++)
      s.box([0.008, 0.024, 0.067], ochre, [-0.06 + i * 0.043, 0.027, -0.067], a);
  }
  if (bio || civic) {
    const greenhouse = node(m, [-0.34, 0, -0.012], 0.3, 0.8);
    pressureModule(s, greenhouse, 0.19, '#92b7a2');
    for (let i = 0; i < 4; i++)
      s.add(
        new THREE.TorusGeometry(0.065, 0.004, 4, 10, Math.PI),
        chalk,
        [0, 0.065, -0.084 + i * 0.055],
        [0, 0, 0],
        undefined,
        greenhouse,
      );
  }
  if (!shelter) {
    const rover = new Sculpture();
    vehicle(rover, 'service-rover');
    s.add(rover.finish(), null, [0.017, 0.01, 0.294], [0, 0.42, 0], [0.43, 0.43, 0.43], m);
  } else
    for (let i = 0; i < 5; i++)
      s.ico(0.052, '#777d80', [-0.28 + i * 0.11, 0.025, -0.265], [1, 0.55, 0.8], m);
}

/** Suspended gondolas and an aerodynamic lifting envelope replace cities on arbitrary stalks. */
export function aerostat(s: Sculpture, m: THREE.Matrix4, variant = 0) {
  s.add(
    loft(
      [
        [-0.29, 0.003, 0.18, 0.19],
        [-0.21, 0.083, 0.13, 0.24],
        [-0.1, 0.105, 0.11, 0.276],
        [0.12, 0.098, 0.118, 0.269],
        [0.25, 0.053, 0.147, 0.228],
        [0.3, 0.001, 0.182, 0.19],
      ],
      12,
    ),
    '#e4d6b4',
    undefined,
    undefined,
    undefined,
    m,
  );
  for (const side of [-1, 1]) {
    curveTube(
      s,
      [
        [side * 0.013, 0.19, -0.28],
        [side * 0.102, 0.19, -0.07],
        [side * 0.096, 0.19, 0.13],
        [side * 0.01, 0.19, 0.283],
      ],
      0.0035,
      ochre,
      m,
    );
    s.bar([side * 0.07, 0.13, -0.13], [side * 0.044, 0.047, -0.1], 0.0025, ink, m);
    s.bar([side * 0.078, 0.13, 0.12], [side * 0.044, 0.047, 0.11], 0.0025, ink, m);
  }
  s.add(
    loft([
      [-0.13, 0.029, 0.025, 0.039],
      [-0.092, 0.052, 0.02, 0.069],
      [0.092, 0.052, 0.02, 0.069],
      [0.14, 0.017, 0.027, 0.034],
    ]),
    variant ? '#bcb0b9' : '#aac2bc',
    undefined,
    undefined,
    undefined,
    m,
  );
  for (let i = 0; i < 5; i++) s.box([0.106, 0.018, 0.008], ink, [0, 0.05, -0.082 + i * 0.04], m);
  s.box([0.13, 0.013, 0.19], '#e0cba5', [0, 0.071, 0], m);
  for (const side of [-1, 1]) panel(s, m, 0.095, 0.124, [side * 0.098, 0.082, 0.025], side * 0.12);
  s.add(
    loft([
      [-0.04, 0.002, 0, 0.07],
      [0.09, 0.002, 0, 0.055],
    ]),
    '#927f8d',
    [0, 0.206, 0.21],
    undefined,
    undefined,
    m,
  );
}
