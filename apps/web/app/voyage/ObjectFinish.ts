import * as THREE from 'three';
import { Sculpture } from './sculpture';
import { curveTube, membrane, panel, porthole } from './modeling';
import type { ObjectKind } from './ScenarioObjects';
const cream = '#ddd4ba',
  dark = '#385562',
  metal = '#b9b3a0',
  wood = '#8b6241';
/** Joinery and equipment are specific to the object's function; no generic detail scatter. */
export function finishObject(s: Sculpture, m: THREE.Matrix4, kind: ObjectKind, v: number) {
  const step = (x: number, z: number, w = 0.07) => {
    for (let i = 0; i < 3; i++)
      s.box([w, 0.009, 0.027], cream, [x, 0.023 - i * 0.007, z + i * 0.02], m);
  };
  const vent = (x: number, y: number, z: number) => {
    for (let i = 0; i < 4; i++) s.box([0.036, 0.004, 0.006], dark, [x, y + i * 0.008, z], m);
  };
  const pipe = (x: number, z: number) =>
    curveTube(
      s,
      [
        [x, 0, z],
        [x, 0.046, z],
        [x + 0.055, 0.046, z],
        [x + 0.055, 0.08, z],
      ],
      0.005,
      metal,
      m,
    );
  switch (kind) {
    case 'checkpoint':
      for (let i = 0; i < 6; i++)
        s.box(
          [0.019, 0.01, 0.012],
          i % 2 ? '#ba8154' : dark,
          [-0.055 + i * 0.022, 0.082, 0.047],
          m,
        );
      vent(-0.11, 0.038, 0.05);
      // Vehicle screening needs a level lane, not the former pedestrian staircase.
      s.box([0.155, 0.004, 0.12], '#394b54', [0, 0.002, 0.12], m);
      s.box([0.135, 0.002, 0.007], '#e5dcc1', [0, 0.005, 0.171], m);
      for (const x of [-0.085, 0.085])
        s.cylinder(0.005, 0.007, 0.026, '#c6a575', [x, 0.013, 0.14], m, 6);
      break;
    case 'tenement':
      for (const y of [0.063, 0.138]) {
        for (const x of [-0.091, -0.03, 0.03, 0.091])
          s.bar([x, y, 0.098], [x, y + 0.028, 0.098], 0.0025, metal, m);
        s.bar([-0.095, y + 0.028, 0.098], [0.095, y + 0.028, 0.098], 0.0025, metal, m);
      }
      s.box([0.035, 0.042, 0.006], dark, [-0.039, 0.023, 0.067], m);
      step(-0.04, 0.086);
      pipe(0.086, -0.068);
      break;
    case 'watchtower':
      for (const side of [-1, 1])
        s.bar([side * 0.04, 0.008, 0.031], [0, 0.215, 0], 0.0035, metal, m);
      s.box([0.16, 0.008, 0.09], dark, [0, 0.299 + v * 0.023, 0], m);
      break;
    case 'depot':
      // Keep the loading face flush with the supply road.
      s.box([0.19, 0.004, 0.09], '#586970', [0, 0.002, 0.13], m);
      s.box([0.042, 0.036, 0.038], '#c59b65', [0.117, 0.018, 0.149], m);
      vent(0.1, 0.16, 0.045);
      curveTube(
        s,
        [
          [-0.15, 0.141, -0.096],
          [0.15, 0.141, -0.096],
          [0.15, 0.018, -0.096],
        ],
        0.004,
        metal,
        m,
      );
      break;
    case 'hauler':
      break;
    case 'derrick':
      for (let i = 0; i < 3; i++) {
        const y = 0.03 + i * 0.074,
          w = 0.068 - y * 0.18;
        s.bar([-w, y, 0.045], [w - 0.013, y + 0.072, 0.026], 0.0035, cream, m);
        s.bar([w, y, 0.045], [-w + 0.013, y + 0.072, 0.026], 0.0035, cream, m);
      }
      for (let i = 0; i < 7; i++)
        s.bar(
          [-0.065, 0.025 + i * 0.03, -0.03],
          [-0.045, 0.025 + i * 0.03, -0.03],
          0.0025,
          metal,
          m,
        );
      break;
    case 'conveyor':
      for (let i = 0; i < 7; i++)
        s.add(
          new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8),
          metal,
          [-0.126 + i * 0.042, 0.055 + i * 0.011, 0],
          [0, 0, Math.PI / 2],
          undefined,
          m,
        );
      pipe(0.14, 0.065);
      break;
    case 'reservoir':
      for (let i = 0; i < 6; i++)
        s.bar(
          [-0.034, 0.025 + i * 0.025, 0.114],
          [0.005, 0.025 + i * 0.025, 0.114],
          0.0025,
          cream,
          m,
        );
      s.bar([-0.038, 0.013, 0.114], [-0.038, 0.174, 0.114], 0.0025, metal, m);
      pipe(0.084, -0.067);
      break;
    case 'courtyard':
      for (const x of [-0.105, 0.105]) {
        s.box([0.01, 0.018, 0.19], cream, [x, 0.01, 0], m);
        s.box([0.06, 0.02, 0.041], '#6e8c67', [x, 0.02, 0.1], m);
      }
      step(0, 0.12, 0.09);
      break;
    case 'pavilion':
      for (let i = 0; i < 7; i++)
        s.box([0.21, 0.003, 0.007], wood, [0, 0.178, -0.073 + i * 0.024], m);
      s.cylinder(0.038, 0.038, 0.01, cream, [0, 0.048, 0], m, 12);
      break;
    case 'terrace':
      for (const y of [0.06, 0.13]) {
        for (const x of [-0.09, -0.03, 0.03, 0.09])
          s.bar([x, y, 0.073], [x, y + 0.025, 0.073], 0.002, metal, m);
        s.bar([-0.095, y + 0.025, 0.073], [0.095, y + 0.025, 0.073], 0.002, metal, m);
      }
      step(0.072, 0.093);
      break;
    case 'glasshouse':
      for (let i = 0; i < 5; i++)
        s.box([0.004, 0.074, 0.154], cream, [-0.074 + i * 0.037, 0.056, 0], m);
      for (const x of [-0.048, 0.048]) s.box([0.029, 0.014, 0.104], '#819866', [x, 0.022, 0], m);
      pipe(0.09, 0.055);
      break;
    case 'camp':
      for (const side of [-1, 1]) {
        s.bar([0, 0.185, 0], [side * 0.145, 0.003, 0.087], 0.0016, cream, m);
        s.bar([side * 0.145, 0, 0.087], [side * 0.145, 0.02, 0.087], 0.004, wood, m);
      }
      s.add(
        new THREE.CylinderGeometry(0.02, 0.02, 0.061, 10),
        '#aaa789',
        [0.115, 0.022, -0.066],
        [0, 0, Math.PI / 2],
        undefined,
        m,
      );
      s.ico(0.019, '#ceb27e', [-0.09, 0.015, 0.089], [1, 0.7, 1], m, 1);
      break;
    case 'rack':
      for (let i = 0; i < 4; i++)
        s.bar(
          [-0.08 + i * 0.052, 0.145, 0.02],
          [-0.071 + i * 0.052, 0.052, 0.033],
          0.0017,
          cream,
          m,
        );
      s.box([0.13, 0.008, 0.08], '#b0a077', [0, 0.004, 0], m);
      break;
    case 'store':
      for (let i = 0; i < 5; i++)
        s.box([0.003, 0.11, 0.145], wood, [-0.06 + i * 0.03, 0.069, 0], m);
      s.box([0.044, 0.063, 0.008], dark, [0, 0.045, 0.081], m);
      step(0, 0.094);
      break;
    case 'totem':
      for (let i = 0; i < 3; i++)
        s.add(
          new THREE.TorusGeometry(0.023, 0.003, 4, 9),
          cream,
          [0, 0.07 + i * 0.061, 0],
          [Math.PI / 2, 0, 0],
          undefined,
          m,
        );
      s.ico(0.026, '#c1b58e', [0.041, 0.011, 0.047], [1, 0.3, 1], m);
      break;
    case 'growth-pod':
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        curveTube(
          s,
          [
            [Math.cos(a) * 0.065, 0.039, Math.sin(a) * 0.065],
            [Math.cos(a) * 0.1, 0.145, Math.sin(a) * 0.1],
            [Math.cos(a) * 0.026, 0.262, Math.sin(a) * 0.026],
          ],
          0.004,
          cream,
          m,
        );
      }
      pipe(0.1, 0.052);
      break;
    case 'bio-arch':
      for (let i = 0; i < 5; i++)
        s.add(
          membrane(
            [
              [0, 0.015, 0],
              [0.04, 0.064, 0.025],
              [0.091, 0.034, 0.07],
            ],
            0,
            0.01,
          ),
          '#d2c7a4',
          [0, 0.167, 0],
          [0, (i * Math.PI * 2) / 5, 0],
          undefined,
          m,
        );
      break;
    case 'synthesis':
      for (const x of [-0.054, 0.054]) {
        for (let i = 0; i < 4; i++)
          s.box([0.024, 0.006, 0.006], '#eadbb4', [x, 0.09 + i * 0.028, 0.038], m);
        pipe(x, 0.041);
      }
      s.box([0.028, 0.032, 0.02], dark, [0.08, 0.05, 0.1], m);
      break;
    case 'petal-house':
      porthole(s, m, [0, 0.063, 0.098], 0.024);
      step(0, 0.113);
      break;
    case 'reactor':
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        s.bar(
          [Math.sin(a) * 0.073, 0.04, Math.cos(a) * 0.073],
          [Math.sin(a) * 0.053, 0.205, Math.cos(a) * 0.053],
          0.0035,
          cream,
          m,
        );
      }
      pipe(0.09, 0.038);
      break;
    case 'radiator':
      for (let i = 0; i < 5; i++)
        s.bar(
          [-0.086 + i * 0.043, 0.054, 0.077],
          [-0.086 + i * 0.043, 0.23, 0.077],
          0.0025,
          cream,
          m,
        );
      pipe(-0.12, 0.07);
      break;
    case 'manifold':
      for (const x of [-0.075, 0, 0.075])
        s.add(
          new THREE.TorusGeometry(0.013, 0.003, 4, 10),
          '#c49265',
          [x, 0.113, 0.12],
          undefined,
          undefined,
          m,
        );
      break;
    case 'control':
      vent(0, 0.019, 0.053);
      s.bar([-0.091, 0.008, -0.027], [-0.091, 0.231, -0.027], 0.003, metal, m);
      s.ico(0.009, '#d4a375', [-0.091, 0.238, -0.027], [1, 1, 1], m);
      break;
    case 'watermill':
      for (const x of [-0.081, 0.081]) s.box([0.004, 0.122, 0.151], wood, [x, 0.065, 0], m);
      s.box([0.035, 0.065, 0.005], dark, [-0.039, 0.033, 0.076], m);
      step(-0.04, 0.091);
      s.box([0.049, 0.012, 0.23], '#54888e', [0.14, 0.003, 0], m);
      break;
    case 'workshop':
      for (const x of [-0.103, 0.103]) s.box([0.006, 0.1, 0.156], wood, [x, 0.055, 0], m);
      for (let i = 0; i < 4; i++)
        s.box([0.19, 0.003, 0.004], '#c5b287', [0, 0.14 + i * 0.016, 0.069 - i * 0.022], m);
      s.bar([-0.056, 0.05, 0.141], [0.041, 0.05, 0.141], 0.0035, metal, m);
      break;
    case 'seed-bank':
      for (const x of [-0.065, 0.065])
        for (let i = 0; i < 3; i++)
          s.add(
            new THREE.TorusGeometry(0.044, 0.003, 4, 10),
            wood,
            [x, 0.045 + i * 0.037, 0],
            [Math.PI / 2, 0, 0],
            undefined,
            m,
          );
      break;
    case 'windmill':
      s.box([0.025, 0.059, 0.008], dark, [0, 0.032, 0.068], m);
      step(0, 0.083, 0.047);
      break;
    case 'bunker':
      for (let i = 0; i < 4; i++)
        s.box([0.075, 0.004, 0.003], metal, [0, 0.015 + i * 0.014, 0.163], m);
      step(0, 0.174, 0.12);
      s.cylinder(0.019, 0.023, 0.031, metal, [-0.115, 0.132, -0.02], m, 8);
      break;
    case 'salvage':
      s.box([0.17, 0.006, 0.13], dark, [0, 0.002, 0], m);
      for (let i = 0; i < 3; i++)
        s.bar(
          [-0.071, 0.038 + i * 0.025, -0.028],
          [0.081, 0.057 + i * 0.03, 0.012],
          0.0025,
          cream,
          m,
        );
      break;
    case 'broken-dish':
      for (let i = 0; i < 4; i++)
        s.bar(
          [-0.042, 0.009, -0.033],
          [0.047, 0.179 - i * 0.007, 0.027 + i * 0.013],
          0.0028,
          metal,
          m,
        );
      break;
    case 'pylon':
      for (let i = 0; i < 3; i++)
        s.bar(
          [-0.065 + i * 0.015, 0.025 + i * 0.061, 0.012],
          [0.063 - i * 0.02, 0.075 + i * 0.05, 0.012],
          0.003,
          metal,
          m,
        );
      break;
    case 'gift':
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        s.add(
          membrane(
            [
              [0, 0.018, 0],
              [0.06, 0.028, 0.012],
              [0.12, 0.009, 0.009],
            ],
            0,
            0.003,
          ),
          '#a4bca5',
          [0, 0.02, 0],
          [0, a, 0],
          undefined,
          m,
        );
      }
      break;
    case 'canopy':
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        curveTube(
          s,
          [
            [0, 0.17, 0],
            [Math.cos(a) * 0.07, 0.18, Math.sin(a) * 0.07],
            [Math.cos(a) * 0.16, 0.155, Math.sin(a) * 0.16],
          ],
          0.0025,
          wood,
          m,
        );
      }
      s.box([0.072, 0.016, 0.03], wood, [0, 0.036, 0.1], m);
      break;
  }
  if (kind === 'depot' || kind === 'tenement')
    panel(s, m, 0.07, 0.055, [-0.04, kind === 'depot' ? 0.146 : 0.156 + v * 0.055, -0.025], -0.15);
}
