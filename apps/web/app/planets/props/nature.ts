import * as THREE from 'three';
import { local } from '../kit';
import type { PropDef, PropMeshers } from './library';

const at = () => new THREE.Matrix4();
const trunk = '#6b4a32';

/** Foliage sits in the tinted part, so each world colours its own forests. */
function pine(p: PropMeshers, tiers: number, h: number) {
  const o = at();
  p.base.prism(o, 0.12, 0.08, h * 0.3, 5, trunk);
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    p.tint.prism(
      local(o, 0, h * (0.2 + t * 0.62), 0, i * 0.5),
      (0.75 - t * 0.42) * (h / 3),
      0,
      h * 0.42,
      6,
      '#ffffff',
    );
  }
}

function broadleaf(p: PropMeshers, h: number, lobes: number, seed: number, bark = trunk) {
  const o = at();
  p.base.prism(o, 0.13, 0.09, h * 0.5, 4, bark);
  const spots: [number, number, number, number][] = [
    [0, h * 0.68, 0, 0.66],
    [0.3, h * 0.56, 0.1, 0.46],
    [-0.28, h * 0.6, -0.12, 0.46],
    [0.05, h * 0.86, -0.08, 0.42],
  ];
  spots
    .slice(0, lobes)
    .forEach(([x, y, z, r], i) =>
      p.tint.blob(local(o, x, y, z), r * (h / 2.4), '#ffffff', 0.22, seed + i),
    );
}

export const nature: Record<string, PropDef> = {
  pine: { tint: '#2f6b3a', build: (p) => pine(p, 3, 2.6) },
  'pine-tall': { tint: '#2a5f36', build: (p) => pine(p, 4, 3.6) },
  spruce: { tint: '#244f33', build: (p) => pine(p, 5, 3.0) },
  oak: { tint: '#4f8f3e', build: (p) => broadleaf(p, 2.4, 2, 11) },
  'oak-small': { tint: '#5f9a44', build: (p) => broadleaf(p, 1.7, 1, 21) },
  birch: {
    tint: '#8cbf5a',
    build: (p) => {
      const o = at();
      p.base.prism(o, 0.07, 0.05, 2.2, 5, '#ece8dc');
      for (const y of [0.5, 1.0, 1.5]) p.base.box(local(o, 0, y, 0), 0.15, 0.05, 0.15, '#3a3530');
      p.tint.gem(local(o, 0, 1.2, 0), 0.42, 1.5, '#ffffff', 6, 0.45);
    },
  },
  cypress: {
    tint: '#35603a',
    build: (p) => {
      const o = at();
      p.base.prism(o, 0.08, 0.06, 0.4, 5, trunk);
      p.tint.gem(local(o, 0, 0.25, 0), 0.32, 2.6, '#ffffff', 6, 0.35);
    },
  },
  palm: {
    tint: '#4f9a3c',
    build: (p) => {
      const o = at();
      let base = o;
      for (let i = 0; i < 3; i++) {
        p.base.prism(
          base,
          0.1 - i * 0.012,
          0.09 - i * 0.012,
          0.8,
          4,
          i % 2 ? '#8a6a44' : '#7a5a3a',
        );
        base = local(base, 0, 0.8, 0, 0, 1, [0.12, 0]);
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        p.tint.panel(
          local(base, Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.45, -a, 1, [0, -0.35]).multiply(
            new THREE.Matrix4().makeRotationY(Math.PI / 2),
          ),
          1.0,
          0.22,
          '#ffffff',
        );
      }
      p.base.gem(local(base, 0, -0.05, 0), 0.12, 0.2, '#6a4a2a', 4);
    },
  },
  bush: {
    tint: '#5c9445',
    build: (p) => {
      const o = at();
      p.tint.blob(local(o, 0, 0.3, 0), 0.42, '#ffffff', 0.3, 5);
      p.tint.blob(local(o, 0.3, 0.22, 0.1), 0.3, '#ffffff', 0.3, 6);
    },
  },
  shrub: {
    tint: '#8a8a4a',
    build: (p) => p.tint.blob(local(at(), 0, 0.2, 0), 0.3, '#ffffff', 0.4, 9),
  },
  cactus: {
    tint: '#5d8f4a',
    build: (p) => {
      const o = at();
      p.tint.prism(o, 0.16, 0.14, 1.6, 6, '#ffffff');
      for (const side of [-1, 1]) {
        p.tint.box(local(o, side * 0.24, 0.6 + side * 0.15, 0), 0.32, 0.12, 0.12, '#ffffff');
        p.tint.prism(local(o, side * 0.38, 0.6 + side * 0.15, 0), 0.08, 0.07, 0.5, 5, '#ffffff');
      }
    },
  },
  'dead-tree': {
    tint: '#6a5a4a',
    build: (p) => {
      const o = at();
      p.tint.prism(o, 0.12, 0.07, 1.8, 5, '#ffffff');
      for (const [x, y, z] of [
        [0.45, 1.4, 0.1],
        [-0.4, 1.2, -0.2],
        [0.1, 1.95, -0.3],
      ])
        p.tint.beam(new THREE.Vector3(0, y - 0.4, 0), new THREE.Vector3(x, y, z), 0.04, '#ffffff');
    },
  },
  stump: {
    tint: '#7a5a3a',
    build: (p) => p.tint.prism(at(), 0.16, 0.14, 0.25, 6, '#ffffff', '#c9a67a'),
  },
  flowers: {
    tint: '#f0a8c8',
    build: (p) => {
      const o = at();
      for (let i = 0; i < 4; i++) {
        const a = i * 2.4,
          r = 0.12 + (i % 3) * 0.12;
        const stem = local(o, Math.cos(a) * r, 0, Math.sin(a) * r);
        p.base.prism(stem, 0.015, 0.015, 0.22 + (i % 2) * 0.1, 3, '#4f8a3a');
        p.tint.gem(local(stem, 0, 0.22 + (i % 2) * 0.1, 0), 0.07, 0.09, '#ffffff', 4, 0.5);
      }
    },
  },
  grass: {
    tint: '#7fb04f',
    build: (p) => {
      const o = at();
      for (let i = 0; i < 6; i++) {
        const a = i * 1.1;
        p.tint.gem(
          local(o, Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12, a, 1, [
            Math.cos(a) * 0.2,
            Math.sin(a) * 0.2,
          ]),
          0.04,
          0.35,
          '#ffffff',
          3,
          0.2,
        );
      }
    },
  },
  reeds: {
    tint: '#9aa65a',
    build: (p) => {
      const o = at();
      for (let i = 0; i < 8; i++) {
        const a = i * 0.8;
        p.tint.prism(
          local(o, Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15),
          0.015,
          0.01,
          0.6,
          3,
          '#ffffff',
        );
        if (i % 3 === 0)
          p.base.prism(
            local(o, Math.cos(a) * 0.15, 0.5, Math.sin(a) * 0.15),
            0.035,
            0.035,
            0.14,
            4,
            '#6a4a2a',
          );
      }
    },
  },
  crop: {
    tint: '#d8c35a',
    build: (p) => {
      const o = at();
      for (let row = -1; row <= 1; row++)
        p.tint.box(local(o, row * 0.32, 0, 0), 0.16, 0.24, 1.6, '#ffffff');
    },
  },
  vine: {
    tint: '#6aa04a',
    build: (p) => {
      const o = at();
      for (const x of [-0.6, 0, 0.6])
        p.base.prism(local(o, x, 0, 0), 0.03, 0.03, 0.6, 4, '#7a5a3a');
      p.tint.box(local(o, 0, 0.25, 0), 1.4, 0.35, 0.18, '#ffffff');
    },
  },
  boulder: {
    tint: '#8d8a84',
    build: (p) =>
      p.tint.blob(
        local(at(), 0, 0.25, 0).scale(new THREE.Vector3(1, 0.7, 0.9)),
        0.45,
        '#ffffff',
        0.3,
        13,
      ),
  },
  rocks: {
    tint: '#7d7a74',
    build: (p) => {
      const o = at();
      p.tint.blob(local(o, 0, 0.2, 0), 0.38, '#ffffff', 0.35, 21);
      p.tint.blob(local(o, 0.42, 0.12, 0.2), 0.24, '#ffffff', 0.35, 22);
    },
  },
  'ice-block': {
    tint: '#dcecf4',
    build: (p) =>
      p.tint.blob(
        local(at(), 0, 0.2, 0).scale(new THREE.Vector3(1.2, 0.6, 1)),
        0.5,
        '#ffffff',
        0.2,
        31,
      ),
  },
  /** Scenario-engineered flora (S5): luminous fungi, bulb trees and reef growths. */
  'bio-tree': {
    tint: '#c46ad0',
    build: (p) => {
      const o = at();
      p.base.prism(o, 0.1, 0.06, 1.6, 6, '#efe6f5');
      p.tint.dome(local(o, 0, 1.4, 0), 0.6, '#ffffff', 8, 2, 0.6);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        p.glow.gem(local(o, Math.cos(a) * 0.45, 1.35, Math.sin(a) * 0.45), 0.05, 0.2, '#b8fff0', 4);
      }
    },
  },
  'bio-shroom': {
    tint: '#6fe0c8',
    build: (p) => {
      const o = at();
      for (const [x, z, h] of [
        [0, 0, 0.8],
        [0.3, 0.15, 0.5],
        [-0.25, -0.1, 0.4],
      ]) {
        p.base.prism(local(o, x, 0, z), 0.05, 0.04, h, 4, '#efe6f5');
        p.tint.dome(local(o, x, h, z), 0.12 + h * 0.18, '#ffffff', 5, 1, 0.5);
        p.glow.prism(local(o, x, h - 0.02, z), 0.06, 0.06, 0.02, 4, '#ffb8f0');
      }
    },
  },
  coral: {
    tint: '#f07a9a',
    build: (p) => {
      const o = at();
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05;
        p.tint.prism(
          local(o, Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15, a, 1, [
            Math.cos(a) * 0.4,
            Math.sin(a) * 0.4,
          ]),
          0.06,
          0.03,
          0.5,
          4,
          '#ffffff',
        );
      }
    },
  },
};

export const treeKinds = [
  'pine',
  'pine-tall',
  'spruce',
  'oak',
  'oak-small',
  'birch',
  'cypress',
  'palm',
];
