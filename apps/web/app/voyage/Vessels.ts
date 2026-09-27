import * as THREE from 'three';
import { Sculpture } from './sculpture';
import { curveTube, loft, panel } from './modeling';

export type VesselKind = 'cutter' | 'ferry' | 'canoe' | 'research-skiff' | 'sail-barge';
const identity = new THREE.Matrix4();

function sail(s: Sculpture, height: number, foot: number, z: number, color: string, jib = false) {
  const vertices: number[] = [];
  const point = (u: number, v: number) => [
    Math.sin(u * Math.PI) * Math.sin(v * Math.PI * 0.8) * 0.033,
    0.09 + v * height,
    z + (jib ? 1 : -1) * u * foot * (1 - v * 0.92),
  ];
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 5; j++) {
      for (const [u, v] of [
        [i / 6, j / 5],
        [(i + 1) / 6, j / 5],
        [i / 6, (j + 1) / 5],
        [i / 6, (j + 1) / 5],
        [(i + 1) / 6, j / 5],
        [(i + 1) / 6, (j + 1) / 5],
      ])
        vertices.push(...point(u, v));
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  s.add(g, color);
  for (const f of [0.24, 0.49, 0.74])
    curveTube(
      s,
      Array.from({ length: 6 }, (_, i) => point(i / 5, f) as [number, number, number]),
      0.0011,
      '#cbbf9d',
    );
}

/** Real hull stations, inset decks, cabin joinery, cambered cloth and tensioned standing rigging. */
export function vessel(s: Sculpture, kind: VesselKind, equipment = true) {
  if (kind === 'sail-barge') {
    s.add(
      loft([
        [-0.24, 0.065, -0.018, 0.053],
        [-0.17, 0.095, -0.055, 0.048],
        [0.14, 0.095, -0.055, 0.048],
        [0.23, 0.068, -0.013, 0.061],
      ]),
      '#667c70',
    );
    s.box([0.161, 0.012, 0.383], '#af9467', [0, 0.046, 0]);
    for (const side of [-1, 1]) s.box([0.008, 0.034, 0.39], '#d0bf92', [side * 0.084, 0.064, 0]);
    for (let i = 0; i < 6; i++) {
      const x = ((i % 2) - 0.5) * 0.072,
        z = Math.floor(i / 2) * 0.07 - 0.025;
      s.box([0.059, 0.05, 0.055], '#9d794e', [x, 0.077, z]);
      for (const dx of [-0.022, 0.022]) s.box([0.006, 0.054, 0.058], '#d4b477', [x + dx, 0.078, z]);
      s.ico(0.012, '#c3a561', [x, 0.111, z], [1, 1, 1]);
    }
    s.bar([-0.025, 0.05, -0.125], [-0.025, 0.37, -0.125], 0.005, '#90653f');
    s.bar([-0.025, 0.33, -0.22], [-0.025, 0.36, 0.035], 0.0035, '#aa8c54');
    s.bar([-0.025, 0.14, -0.215], [-0.025, 0.125, 0.09], 0.0035, '#aa8c54');
    const vertices: number[] = [];
    const point = (u: number, v: number) => [
      -0.025 + Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.035,
      0.14 + v * 0.205,
      -0.22 + u * (0.3 - v * 0.045),
    ];
    for (let i = 0; i < 7; i++)
      for (let j = 0; j < 5; j++)
        for (const [u, v] of [
          [i / 7, j / 5],
          [(i + 1) / 7, j / 5],
          [i / 7, (j + 1) / 5],
          [i / 7, (j + 1) / 5],
          [(i + 1) / 7, j / 5],
          [(i + 1) / 7, (j + 1) / 5],
        ])
          vertices.push(...point(u, v));
    const cloth = new THREE.BufferGeometry();
    cloth.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    s.add(cloth, '#dac18d');
    s.bar([-0.025, 0.366, -0.125], [0.078, 0.06, 0.147], 0.0018, '#c5bf9e');
    s.bar([0.03, 0.059, 0.194], [0.03, 0.083, 0.263], 0.004, '#664f38');
    s.box([0.012, 0.062, 0.054], '#7c6040', [0.03, 0.025, 0.252]);
    return;
  }
  const canoe = kind === 'canoe',
    ferry = kind === 'ferry',
    research = kind === 'research-skiff';
  const hull = (x: number, w: number) => {
    s.add(
      loft([
        [-0.19, 0.006, 0.02, 0.056],
        [-0.15, w * 0.67, -0.01, 0.048],
        [-0.09, w, -0.036, 0.043],
        [0.035, w, -0.04, 0.045],
        [0.13, w * 0.83, -0.015, 0.049],
        [0.17, w * 0.52, 0.008, 0.055],
      ]),
      canoe ? '#815434' : '#244d62',
      [x, 0, 0],
    );
    s.add(
      loft([
        [-0.176, 0.003, 0.05, 0.053],
        [-0.12, w * 0.72, 0.039, 0.049],
        [0.02, w * 0.83, 0.034, 0.048],
        [0.13, w * 0.61, 0.046, 0.053],
        [0.15, w * 0.36, 0.049, 0.053],
      ]),
      '#c59c66',
      [x, 0, 0],
    );
    for (const side of [-1, 1])
      curveTube(
        s,
        [
          [x + side * 0.008, 0.057, -0.18],
          [x + side * w * 0.94, 0.049, -0.08],
          [x + side * w * 0.94, 0.052, 0.045],
          [x + side * w * 0.54, 0.058, 0.16],
        ],
        0.0045,
        '#eee1ba',
      );
  };
  if (ferry) for (const x of [-0.057, 0.057]) hull(x, 0.028);
  else hull(0, canoe ? 0.04 : 0.064);
  if (canoe) {
    s.add(
      loft([
        [-0.13, 0.008, 0.053, 0.055],
        [-0.08, 0.027, 0.035, 0.05],
        [0.07, 0.027, 0.035, 0.05],
        [0.13, 0.01, 0.053, 0.055],
      ]),
      '#403e32',
    );
    for (const z of [-0.075, 0.015, 0.09]) s.box([0.07, 0.008, 0.022], '#d9b989', [0, 0.053, z]);
    s.ico(0.026, '#718d75', [0, 0.09, 0.024], [0.65, 1, 0.7], undefined, 1);
    s.ico(0.014, '#bc9971', [0, 0.132, 0.018], [1, 1.14, 1], undefined, 1);
    s.bar([0.011, 0.107, 0.02], [0.061, 0.086, 0.015], 0.0045, '#bc9971');
    s.bar([-0.01, 0.108, 0.02], [0.045, 0.095, -0.016], 0.0045, '#bc9971');
    if (equipment) {
      const paddle = new Sculpture();
      canoePaddle(paddle);
      s.add(paddle.finish(), null, [0.062, 0.084, 0]);
    }
    s.ico(0.019, '#bca484', [0, 0.072, 0.1], [1.2, 0.8, 0.9]);
    return;
  }
  for (let i = 0; i < 9; i++)
    s.box([ferry ? 0.11 : 0.072, 0.002, 0.002], '#826749', [0, 0.055, -0.12 + i * 0.031]);
  if (ferry || research) {
    s.box([ferry ? 0.13 : 0.079, 0.018, 0.235], '#e8dbc0', [0, 0.061, 0]);
    s.add(
      loft([
        [-0.106, 0.032, 0.069, 0.077],
        [-0.073, 0.043, 0.07, 0.118],
        [0.069, 0.043, 0.07, 0.123],
        [0.092, 0.032, 0.072, 0.095],
      ]),
      '#bfcfc6',
    );
    s.add(
      loft([
        [-0.097, 0.03, 0.08, 0.083],
        [-0.073, 0.041, 0.086, 0.114],
        [0.049, 0.041, 0.086, 0.118],
        [0.071, 0.037, 0.085, 0.113],
      ]),
      '#315a6c',
    );
    for (const z of [-0.049, -0.004, 0.041]) s.box([0.087, 0.041, 0.005], '#e9dfc3', [0, 0.101, z]);
    s.box([0.106, 0.011, 0.19], '#ebdfc3', [0, 0.13, -0.007]);
    panel(s, identity, 0.096, 0.135, [0, 0.139, -0.015], 0);
    for (const side of [-1, 1])
      s.bar([side * 0.065, 0.055, 0.08], [side * 0.065, 0.087, 0.08], 0.0025, '#d6ceb7');
    if (research) {
      s.bar([0, 0.13, 0.075], [0, 0.225, 0.075], 0.0035, '#b8c6bd');
      s.ico(0.015, '#e3dcc2', [0, 0.225, 0.075], [1, 0.6, 1], undefined, 1);
      s.box([0.04, 0.024, 0.055], '#c18255', [-0.016, 0.081, 0.122]);
    }
  } else {
    s.box([0.069, 0.025, 0.095], '#ded9bd', [0, 0.066, 0.045]);
    for (const x of [-0.019, 0.019]) s.box([0.024, 0.004, 0.034], '#42778d', [x, 0.081, 0.041]);
    s.bar([0, 0.052, -0.028], [0, 0.395, -0.028], 0.0045, '#ad8053');
    s.bar([0, 0.091, -0.03], [0, 0.091, -0.156], 0.003, '#b69260');
    sail(s, 0.29, 0.132, -0.028, '#f4e7c6');
    sail(s, 0.232, 0.18, -0.022, '#d8bd8f', true);
    for (const side of [-1, 1])
      s.bar([side * 0.054, 0.055, 0.027], [0, 0.345, -0.028], 0.0014, '#bcb799');
    s.bar([0, 0.055, 0.161], [0, 0.339, -0.026], 0.0014, '#bcb799');
    s.bar([0, 0.056, -0.181], [0, 0.389, -0.028], 0.0014, '#bcb799');
    s.add(new THREE.TorusGeometry(0.012, 0.003, 5, 12), '#b18951', [0, 0.083, 0.12], [0.65, 0, 0]);
  }
  for (const side of [-1, 1])
    for (const z of [-0.11, 0.08])
      s.ico(0.009, '#eddcaa', [side * 0.052, 0.058, z], [0.8, 0.55, 1.5]);
}

export function canoePaddle(s: Sculpture) {
  s.bar([0, 0.023, -0.031], [0, -0.06, 0.035], 0.003, '#c9a674');
  s.add(
    loft([
      [-0.01, 0.006, -0.005, 0.004],
      [0.025, 0.019, -0.004, 0.004],
      [0.069, 0.013, -0.003, 0.003],
    ]),
    '#a77c4e',
    [0, -0.057, 0.03],
    [0.67, 0, 0],
  );
}
