import * as THREE from 'three';
import { Sculpture, type Vec } from './sculpture';
import { finishObject } from './ObjectFinish';
import { vehicle } from './LifeModels';
import { curveTube, membrane } from './modeling';
import { mechanismGeometry, mechanismPosition } from './Mechanisms';

const ivory = '#ecdfbf',
  ink = '#304754',
  brass = '#c6a575',
  wood = '#8b6044';
export type ObjectKind =
  | 'checkpoint'
  | 'tenement'
  | 'watchtower'
  | 'depot'
  | 'hauler'
  | 'derrick'
  | 'conveyor'
  | 'reservoir'
  | 'courtyard'
  | 'pavilion'
  | 'terrace'
  | 'glasshouse'
  | 'camp'
  | 'rack'
  | 'store'
  | 'totem'
  | 'growth-pod'
  | 'bio-arch'
  | 'synthesis'
  | 'petal-house'
  | 'reactor'
  | 'radiator'
  | 'manifold'
  | 'control'
  | 'watermill'
  | 'workshop'
  | 'seed-bank'
  | 'windmill'
  | 'bunker'
  | 'salvage'
  | 'broken-dish'
  | 'pylon'
  | 'gift'
  | 'canopy';

function ring(
  s: Sculpture,
  r: number,
  tube: number,
  pos: Vec,
  m: THREE.Matrix4,
  rotation: Vec = [Math.PI / 2, 0, 0],
  color = brass,
) {
  s.add(new THREE.TorusGeometry(r, tube, 4, 12), color, pos, rotation, [1, 1, 1], m);
}
function roof(
  s: Sculpture,
  w: number,
  h: number,
  d: number,
  pos: Vec,
  m: THREE.Matrix4,
  color: string,
) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, h);
  shape.closePath();
  s.add(
    new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }),
    color,
    [pos[0], pos[1], pos[2] - d / 2],
    [0, 0, 0],
    [1, 1, 1],
    m,
  );
}
function windows(s: Sculpture, m: THREE.Matrix4, w: number, y: number, z: number, n = 3) {
  for (let i = 0; i < n; i++)
    s.box([w / (n * 2), 0.026, 0.006], ink, [((i - (n - 1) / 2) * w) / n, y, z], m);
}
function supports(s: Sculpture, m: THREE.Matrix4, y: number, w: number, d: number) {
  for (const x of [-w / 2, w / 2])
    for (const z of [-d / 2, d / 2]) s.bar([x, 0, z], [x, y, z], 0.011, ivory, m);
}

/** Original constructed objects; variants change their geometry, not just their color. */
export function scenarioObject(
  s: Sculpture,
  m: THREE.Matrix4,
  kind: ObjectKind,
  variant = 0,
  movingParts = true,
) {
  const v = variant % 3;
  switch (kind) {
    case 'checkpoint': {
      for (const x of [-0.11, 0.11]) {
        s.box([0.07, 0.2, 0.09], '#80969a', [x, 0.1, 0], m);
        s.box([0.043, 0.04, 0.012], '#d88768', [x, 0.16, 0.051], m);
      }
      s.box([0.31, 0.045, 0.13], ivory, [0, 0.22, 0], m);
      s.bar([-0.07, 0.08, 0.04], [0.085, 0.08, 0.04], 0.008, brass, m);
      s.box([0.095, 0.025, 0.02], ink, [0, 0.21, 0.073], m);
      if (v) s.box([0.08, 0.065, 0.08], '#bf9c7e', [0.19, 0.033, 0.035], m);
      break;
    }
    case 'tenement': {
      const h = 0.14 + v * 0.055;
      s.box([0.19, h, 0.12], '#acb4a3', [0, h / 2, 0], m);
      s.box([0.075, h + 0.06, 0.13], '#c4a88c', [-0.08, (h + 0.06) / 2, -0.02], m);
      for (let f = 0; f < 3 + v; f++) windows(s, m, 0.17, 0.035 + f * 0.044, 0.065, 4);
      for (let f = 0; f < 2; f++)
        s.box([0.2, 0.012, 0.065], ivory, [0, 0.06 + f * 0.075, 0.075], m);
      s.box([0.066, 0.035, 0.07], ink, [0.045, h + 0.02, 0], m);
      break;
    }
    case 'watchtower': {
      s.cylinder(0.021, 0.06, 0.24 + v * 0.045, ink, [0, 0.12, 0], m, 6);
      s.box([0.2, 0.068, 0.11], ivory, [0, 0.26 + v * 0.023, 0], m, [0, -0.2, 0]);
      s.ico(0.055, '#5e7e88', [0, 0.26 + v * 0.023, 0.059], [1, 0.7, 0.38], m);
      s.ico(0.019, '#dd9e77', [0, 0.26 + v * 0.023, 0.082], [1, 1, 0.25], m);
      s.bar([0.075, 0.29, 0], [0.075, 0.37, 0], 0.005, brass, m);
      break;
    }
    case 'depot': {
      s.box([0.29, 0.12, 0.17], '#71898b', [0, 0.06, 0], m);
      for (const x of [-0.08, 0, 0.08]) s.box([0.052, 0.074, 0.009], ink, [x, 0.045, 0.09], m);
      s.box([0.31, 0.025, 0.2], '#d1b48e', [0, 0.13, 0], m);
      s.box([0.095, 0.08, 0.11], ivory, [0.1, 0.18, -0.015], m);
      break;
    }
    case 'hauler': {
      const model = new Sculpture();
      vehicle(model, 'haul-truck');
      s.add(model.finish(), null, undefined, undefined, undefined, m);
      break;
    }
    case 'derrick': {
      for (const x of [-0.075, 0.075])
        for (const z of [-0.055, 0.055])
          s.bar([x, 0, z], [x * 0.3, 0.29, z * 0.3], 0.012, '#c59160', m);
      for (const y of [0.06, 0.15, 0.24])
        s.box([0.17 - y * 0.3, 0.015, 0.13 - y * 0.2], ink, [0, y, 0], m);
      s.bar([0, 0.31, 0], [0.16, 0.23, 0], 0.018, ivory, m);
      s.bar([0.15, 0.23, 0], [0.15, 0.04, 0], 0.006, ink, m);
      s.box([0.065, 0.033, 0.08], '#9a6344', [0.15, 0.04, 0], m);
      break;
    }
    case 'conveyor': {
      s.box([0.32, 0.02, 0.085], ink, [0, 0.083, 0], m, [0, 0, 0.16]);
      for (const side of [-1, 1])
        s.bar([-0.16, 0.061, side * 0.055], [0.16, 0.11, side * 0.055], 0.009, brass, m);
      for (let i = 0; i < 4; i++)
        s.ico(0.031, '#bb9167', [-0.115 + i * 0.073, 0.1 + i * 0.01, 0], [1, 0.7, 1], m);
      supports(s, m, 0.07, 0.23, 0.055);
      break;
    }
    case 'reservoir': {
      s.cylinder(0.072, 0.086, 0.16 + v * 0.035, '#c7c3a1', [0, 0.08, 0], m, 8);
      s.cone(0.082, 0.045, '#738e8f', [0, 0.18, 0], m, 8);
      s.bar([0.04, 0.135, 0.05], [0.135, 0.135, 0.05], 0.014, brass, m);
      s.bar([0.135, 0.135, 0.05], [0.135, 0.01, 0.05], 0.014, brass, m);
      break;
    }
    case 'courtyard': {
      for (const x of [-0.095, 0.095]) {
        s.box([0.072, 0.08 + v * 0.025, 0.22], '#dfcfaf', [x, 0.045, 0], m);
        s.box([0.09, 0.018, 0.25], '#71998b', [x, 0.098 + v * 0.012, 0], m);
      }
      s.box([0.22, 0.08, 0.07], ivory, [0, 0.045, -0.085], m);
      s.cylinder(0.035, 0.035, 0.018, '#73afb3', [0, 0.018, 0], m, 8);
      s.ico(0.04, '#86b675', [0.02, 0.06, 0.055], [1, 1.4, 1], m);
      break;
    }
    case 'pavilion': {
      s.cylinder(0.15, 0.16, 0.02, '#cdc8a0', [0, 0.01, 0], m, 8);
      supports(s, m, 0.14, 0.19, 0.16);
      s.cone(0.19, 0.055, v ? '#7eb1a1' : '#d8bc8a', [0, 0.16, 0], m, 8);
      ring(s, 0.085, 0.01, [0, 0.025, 0], m, undefined, '#9d9e75');
      break;
    }
    case 'terrace': {
      for (let i = 0; i < 3; i++) {
        s.box(
          [0.22 - i * 0.043, 0.052, 0.16 - i * 0.015],
          ivory,
          [i * 0.02, 0.028 + i * 0.052, 0],
          m,
        );
        s.box(
          [0.16 - i * 0.035, 0.009, 0.035],
          '#84aa74',
          [-0.02 + i * 0.02, 0.057 + i * 0.052, 0.05],
          m,
        );
        windows(s, m, 0.15 - i * 0.03, 0.028 + i * 0.052, 0.085 - i * 0.007, 2);
      }
      break;
    }
    case 'glasshouse': {
      s.box([0.23, 0.045, 0.15], ivory, [0, 0.023, 0], m);
      roof(s, 0.25, 0.1, 0.18, [0, 0.05, 0], m, '#79afa5');
      for (const z of [-0.075, 0, 0.075]) {
        s.bar([-0.12, 0.052, z], [0, 0.15, z], 0.006, ivory, m);
        s.bar([0, 0.15, z], [0.12, 0.052, z], 0.006, ivory, m);
      }
      break;
    }
    case 'camp': {
      s.cone(0.12, 0.17, v ? '#c6ab78' : '#d7bd8c', [0, 0.085, 0], m, v === 2 ? 5 : 4);
      s.cone(0.035, 0.085, '#6b6653', [0, 0.043, 0.078], m, 3);
      s.bar([-0.05, 0.1, 0], [0.035, 0.23, 0], 0.007, wood, m);
      s.bar([0.05, 0.1, 0], [-0.035, 0.23, 0], 0.007, wood, m);
      break;
    }
    case 'rack': {
      supports(s, m, 0.15, 0.2, 0.07);
      for (let y = 0; y < 2; y++)
        s.bar([-0.115, 0.08 + y * 0.06, 0.035], [0.115, 0.08 + y * 0.06, 0.035], 0.008, wood, m);
      for (let i = 0; i < 4; i++)
        s.ico(
          0.025,
          i % 2 ? '#b68e4e' : '#c3ae65',
          [(i - 1.5) * 0.045, 0.107, 0.04],
          [0.7, 1.5, 0.6],
          m,
        );
      break;
    }
    case 'store': {
      supports(s, m, 0.055, 0.12, 0.12);
      s.cylinder(0.067, 0.072, 0.09, '#bd9b60', [0, 0.098, 0], m, 7);
      s.cone(0.085, 0.06, '#837b52', [0, 0.17, 0], m, 7);
      ring(s, 0.071, 0.006, [0, 0.11, 0], m, undefined, wood);
      break;
    }
    case 'totem': {
      s.cylinder(0.025, 0.047, 0.23, wood, [0, 0.115, 0], m, 5);
      for (const y of [0.095, 0.15, 0.21])
        s.box([0.082, 0.025, 0.062], '#c6b181', [0, y, 0], m, [0, y * 7, 0]);
      s.ico(0.063, '#9f9270', [0, 0.27, 0], [0.8, 0.7, 1], m);
      break;
    }
    case 'growth-pod': {
      s.cylinder(0.09, 0.12, 0.045, '#729987', [0, 0.025, 0], m, 7);
      s.ico(0.105, '#80bcb4', [0, 0.13, 0], [0.85, 1.2 + v * 0.18, 0.85], m, 1);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        s.bar(
          [Math.cos(a) * 0.095, 0.035, Math.sin(a) * 0.095],
          [Math.cos(a) * 0.025, 0.27, Math.sin(a) * 0.025],
          0.009,
          '#dbe5b2',
          m,
        );
      }
      s.ico(0.038, '#d994ae', [0, 0.3, 0], [1, 0.8, 1], m);
      break;
    }
    case 'bio-arch': {
      // Braided living ribs leave an open passage beneath a leaf canopy.
      s.cylinder(0.11, 0.125, 0.015, '#719c8d', [0, 0.01, 0], m, 10);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        curveTube(
          s,
          [
            [Math.cos(a) * 0.1, 0.01, Math.sin(a) * 0.1],
            [Math.cos(a + 0.12) * 0.083, 0.1, Math.sin(a + 0.12) * 0.083],
            [Math.cos(a + 0.22) * 0.055, 0.2, Math.sin(a + 0.22) * 0.055],
            [0, 0.25, 0],
          ],
          0.009,
          i % 2 ? '#d6deb1' : '#8dc4ae',
          m,
        );
        s.add(
          membrane(
            [
              [0, 0.015, 0.025],
              [0.042, 0.047, 0.066],
              [0.111, 0.015, 0.063],
              [0.154, -0.023, 0.004],
            ],
            0,
            0.012,
          ),
          i % 2 ? '#a4cfb4' : '#dfbfc5',
          [0, 0.236, 0],
          [0, a, 0],
          undefined,
          m,
        );
      }
      s.ico(0.025, '#efc6ca', [0, 0.26, 0], [0.6, 1.4, 0.6], m, 1);
      break;
    }
    case 'synthesis': {
      s.box([0.2, 0.045, 0.15], '#749e96', [0, 0.025, 0], m);
      for (const x of [-0.054, 0.054]) {
        s.cylinder(0.034, 0.039, 0.19, x < 0 ? '#a5cc9d' : '#c3a9c1', [x, 0.14, 0], m, 8);
        ring(s, 0.042, 0.006, [x, 0.23, 0], m, undefined, ivory);
      }
      s.bar([-0.054, 0.23, 0], [0.054, 0.23, 0], 0.01, '#4e8c83', m);
      break;
    }
    case 'petal-house': {
      s.cylinder(0.087, 0.102, 0.095, ivory, [0, 0.045, 0], m, 10);
      for (let i = 0; i < 6; i++)
        s.add(
          membrane(
            [
              [0, 0.006, 0.1],
              [0.033, 0.068, 0.12],
              [0.095, 0.084, 0.06],
              [0.133, 0.025, 0.043],
            ],
            0,
            0.018,
          ),
          i % 2 ? '#bca4b8' : '#d9c6b7',
          [0, 0.07, 0],
          [0, (i * Math.PI) / 3, 0],
          undefined,
          m,
        );
      break;
    }
    case 'reactor': {
      s.cylinder(0.055, 0.11, 0.23, '#c3becd', [0, 0.115, 0], m, 8);
      s.cylinder(0.082, 0.082, 0.037, '#526c83', [0, 0.17, 0], m, 8);
      ring(s, 0.103, 0.014, [0, 0.09, 0], m);
      s.ico(0.034, '#92c3c6', [0, 0.252, 0], [1, 0.5, 1], m);
      for (const x of [-0.13, 0.13]) s.bar([x, 0.015, 0], [x * 0.45, 0.2, 0], 0.009, brass, m);
      break;
    }
    case 'radiator': {
      s.box([0.24, 0.035, 0.12], '#767d93', [0, 0.02, 0], m);
      for (let i = 0; i < 5; i++)
        s.box(
          [0.014, 0.17 + (i % 2) * 0.04, 0.14],
          i % 2 ? '#cbbfae' : '#667f9a',
          [(i - 2) * 0.043, 0.13, 0],
          m,
          [0, 0, -0.12],
        );
      s.bar([-0.12, 0.045, 0.07], [0.12, 0.045, 0.07], 0.015, brass, m);
      break;
    }
    case 'manifold': {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.075;
        s.cylinder(0.029, 0.035, 0.12 + i * 0.026, '#bac5c6', [x, 0.08, 0], m, 6);
        s.bar([x, 0.07, 0.02], [x, 0.07, 0.12], 0.012, '#87a4ac', m);
        s.box([0.024, 0.043, 0.024], '#c5896d', [x, 0.09, 0.115], m);
      }
      s.bar([-0.1, 0.032, 0.13], [0.1, 0.032, 0.13], 0.017, brass, m);
      break;
    }
    case 'control': {
      s.box([0.14, 0.16, 0.095], '#a9a6bb', [0, 0.08, 0], m);
      s.box([0.1, 0.045, 0.009], '#648b9d', [0, 0.115, 0.052], m);
      for (const x of [-0.03, 0.03])
        s.ico(0.01, x < 0 ? '#c9c67c' : '#ce8f72', [x, 0.072, 0.055], [1, 1, 0.3], m);
      s.add(
        new THREE.SphereGeometry(0.07, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2),
        ivory,
        [0, 0.23, 0],
        [-0.65, 0, 0],
        [1, 0.5, 1],
        m,
      );
      s.bar([0, 0.16, 0], [0, 0.23, 0], 0.01, ink, m);
      break;
    }
    case 'watermill': {
      s.box([0.16, 0.13, 0.14], '#c5b18a', [0, 0.065, 0], m);
      roof(s, 0.2, 0.075, 0.19, [0, 0.13, 0], m, '#738d72');
      if (movingParts)
        s.add(
          mechanismGeometry('watermill'),
          null,
          mechanismPosition('watermill'),
          undefined,
          undefined,
          m,
        );
      windows(s, m, 0.11, 0.085, 0.076, 2);
      break;
    }
    case 'workshop': {
      s.box([0.2, 0.115, 0.15], '#c1a17a', [0, 0.058, 0], m);
      roof(s, 0.235, 0.08, 0.18, [0, 0.115, 0], m, '#9b9670');
      s.box([0.24, 0.012, 0.11], '#d7c192', [0, 0.09, 0.12], m, [0.12, 0, 0]);
      supports(s, m, 0.082, 0.2, 0.25);
      s.box([0.13, 0.045, 0.065], wood, [0, 0.025, 0.14], m);
      s.ico(0.025, '#9c9f78', [0.04, 0.065, 0.14], [1, 0.6, 1], m);
      break;
    }
    case 'seed-bank': {
      for (const x of [-0.065, 0.065]) {
        s.cylinder(0.04, 0.055, 0.14, '#c5b883', [x, 0.075, 0], m, 7);
        s.cone(0.06, 0.06, '#88a16d', [x, 0.175, 0], m, 7);
      }
      s.box([0.19, 0.025, 0.13], '#9b8b6a', [0, 0.028, 0], m);
      s.bar([0, 0.035, 0.03], [0, 0.15, 0.09], 0.008, wood, m);
      s.ico(0.045, '#a7be7b', [0, 0.16, 0.095], [0.6, 1.4, 0.4], m);
      break;
    }
    case 'windmill': {
      s.cylinder(0.035, 0.072, 0.23, '#c2ae85', [0, 0.115, 0], m, 6);
      s.cone(0.065, 0.07, '#76946e', [0, 0.265, 0], m, 6);
      if (movingParts)
        s.add(
          mechanismGeometry('windmill'),
          null,
          mechanismPosition('windmill'),
          undefined,
          undefined,
          m,
        );
      break;
    }
    case 'bunker': {
      s.ico(0.17, '#948c82', [0, 0.03, 0], [1.2, 0.45, 0.85], m, 1);
      s.box([0.16, 0.1, 0.038], '#b4a28d', [0, 0.04, 0.12], m);
      s.box([0.095, 0.065, 0.014], ink, [0, 0.037, 0.146], m);
      for (const x of [-0.036, 0.036])
        s.box([0.008, 0.068, 0.022], '#897676', [x, 0.038, 0.156], m);
      s.ico(0.01, '#d8906e', [0.068, 0.075, 0.147], [1, 1, 0.4], m);
      s.bar([-0.12, 0.04, -0.02], [-0.12, 0.19, -0.02], 0.009, ink, m);
      break;
    }
    case 'salvage': {
      for (let i = 0; i < 4; i++)
        s.box(
          [0.13 - i * 0.018, 0.03, 0.08],
          ['#bca58b', '#75868b', '#987779'][i % 3],
          [Math.sin(i * 3) * 0.04, 0.015 + i * 0.033, 0],
          m,
          [0, i * 0.6, 0.08],
        );
      s.add(
        new THREE.TorusGeometry(0.065, 0.012, 4, 9, Math.PI * 1.6),
        '#927c69',
        [0.11, 0.062, 0.01],
        [0, 0.3, 0.15],
        [1, 1, 1],
        m,
      );
      break;
    }
    case 'broken-dish': {
      s.box([0.095, 0.07, 0.095], '#9b8983', [0, 0.035, 0], m);
      s.bar([0, 0.05, 0], [0.05, 0.2, 0], 0.014, ink, m);
      s.add(
        new THREE.SphereGeometry(0.115, 8, 3, 0, Math.PI * 1.6, 0, Math.PI / 2),
        '#beb39e',
        [0.05, 0.2, 0],
        [0.5, 0.3, -0.6],
        [1, 0.45, 1],
        m,
      );
      s.bar([0.05, 0.2, 0], [0.075, 0.28, 0.025], 0.005, brass, m);
      break;
    }
    case 'pylon': {
      for (const x of [-0.075, 0.075])
        s.bar([x, 0, 0], [x * 0.3 + 0.025, 0.26, 0.015], 0.011, '#8d8480', m);
      s.bar([-0.1, 0.2, 0], [0.08, 0.16, 0.025], 0.012, ink, m);
      s.bar([-0.1, 0.2, 0], [-0.14, 0.055, 0.025], 0.004, brass, m);
      break;
    }
    case 'gift': {
      s.cylinder(0.09, 0.13, 0.014, '#c1cba9', [0, 0.008, 0], m, 7);
      s.add(
        new THREE.OctahedronGeometry(0.085),
        '#b9d6cd',
        [0, 0.18, 0],
        [0, 0.4, 0.15],
        [0.6, 1.6, 0.6],
        m,
      );
      ring(s, 0.098, 0.007, [0, 0.18, 0], m, [0.65, 0.2, 0.2], '#d4c591');
      s.ico(0.019, '#ecedd1', [0, 0.18, 0.002], [1, 1, 1], m);
      break;
    }
    case 'canopy': {
      s.bar([0, 0, 0], [0, 0.15, 0], 0.015, wood, m);
      s.ico(0.15, '#92b282', [0, 0.16, 0], [1.2, 0.22, 1], m);
      s.cylinder(0.075, 0.075, 0.023, '#ccba8e', [0, 0.055, 0], m, 7);
      break;
    }
  }
  finishObject(s, m, kind, v);
}
