import * as THREE from 'three';
import { local, type Tone } from '../kit';
import type { PropDef, PropMeshers } from './library';

const at = () => new THREE.Matrix4();
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function wheels(p: PropMeshers, m: THREE.Matrix4, width: number, axles: number[], r = 0.2) {
  for (const z of axles)
    for (const side of [-1, 1])
      p.base.prism(
        local(m, side * (width / 2), r, z, 0, 1, [0, Math.PI / 2]).multiply(
          new THREE.Matrix4().makeTranslation(0, -0.06, 0),
        ),
        r,
        r,
        0.12,
        6,
        '#1e1f24',
      );
}

function lights(p: PropMeshers, m: THREE.Matrix4, width: number, front: number, back: number, y: number) {
  for (const side of [-1, 1]) {
    p.glow.box(local(m, side * width * 0.32, y, front), 0.14, 0.08, 0.03, '#fff6d8');
    p.glow.box(local(m, side * width * 0.32, y, back), 0.14, 0.08, 0.03, '#ff3b30');
  }
}

/** A hull pointed toward +z, open deck at `deck`. */
function hull(p: PropMeshers, m: THREE.Matrix4, length: number, beam: number, deck: number, tone: Tone) {
  const q = (x: number, y: number, z: number) => v(x, y, z).applyMatrix4(m);
  const L = length / 2,
    B = beam / 2;
  const top = [q(-B, deck, -L), q(B, deck, -L), q(B, deck, L * 0.55), q(0, deck, L), q(-B, deck, L * 0.55)];
  const keel = [q(-B * 0.6, 0, -L * 0.9), q(B * 0.6, 0, -L * 0.9), q(B * 0.5, 0, L * 0.45), q(0, 0.1, L * 0.92), q(-B * 0.5, 0, L * 0.45)];
  for (let i = 0; i < 5; i++) {
    const j = (i + 1) % 5;
    p.tint.quad(keel[i], keel[j], top[j], top[i], tone);
  }
  p.base.tri(top[0], top[2], top[1], '#9a7a5a');
  p.base.tri(top[0], top[4], top[2], '#9a7a5a');
  p.base.tri(top[4], top[3], top[2], '#9a7a5a');
}

export const vehicles: Record<string, PropDef> = {
  car: {
    tint: '#c4452f',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, 0, 0.18, 0), 0.8, 0.32, 1.7, '#ffffff');
      p.tint.box(local(o, 0, 0.5, -0.1), 0.72, 0.3, 0.9, '#ffffff');
      p.glass.box(local(o, 0, 0.53, -0.1), 0.74, 0.22, 0.8, '#3d5068');
      wheels(p, o, 0.8, [-0.55, 0.55]);
      lights(p, o, 0.8, 0.86, -0.86, 0.32);
    },
  },
  taxi: {
    tint: '#f2c230',
    build: (p) => {
      vehicles.car.build(p);
      p.base.box(local(at(), 0, 0.8, -0.1), 0.3, 0.1, 0.15, '#2a2d33');
    },
  },
  van: {
    tint: '#e6e8ea',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, 0, 0.18, 0), 0.85, 0.8, 1.9, '#ffffff');
      p.glass.box(local(o, 0, 0.6, 0.85), 0.8, 0.3, 0.22, '#3d5068');
      wheels(p, o, 0.85, [-0.6, 0.6]);
      lights(p, o, 0.85, 0.96, -0.96, 0.32);
    },
  },
  truck: {
    tint: '#3d6fb5',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, 0, 0.2, 1.0), 0.9, 0.9, 0.8, '#ffffff');
      p.glass.box(local(o, 0, 0.7, 1.41), 0.8, 0.32, 0.02, '#3d5068');
      p.base.box(local(o, 0, 0.25, -0.5), 0.95, 1.1, 2.2, '#d9d6cc');
      wheels(p, o, 0.9, [-1.2, -0.4, 1.0], 0.22);
      lights(p, o, 0.9, 1.41, -1.61, 0.35);
    },
  },
  'haul-truck': {
    tint: '#e0a830',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, 0, 0.5, 0), 1.4, 0.4, 2.6, '#ffffff');
      p.base.box(local(o, 0, 0.9, -0.3), 1.4, 0.6, 1.9, '#8a5a3a');
      p.tint.box(local(o, 0, 0.9, 1.0), 1.2, 0.7, 0.6, '#ffffff');
      wheels(p, o, 1.4, [-0.9, 0.9], 0.38);
      lights(p, o, 1.4, 1.31, -1.31, 0.75);
    },
  },
  bus: {
    tint: '#2e9e6e',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, 0, 0.2, 0), 0.95, 1.1, 3.2, '#ffffff');
      for (let i = 0; i < 6; i++) p.glass.box(local(o, 0, 0.75, -1.3 + i * 0.5), 0.97, 0.35, 0.38, '#3d5068');
      wheels(p, o, 0.95, [-1.1, 1.1], 0.22);
      lights(p, o, 0.95, 1.61, -1.61, 0.4);
    },
  },
  tram: {
    tint: '#f2efe8',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, 0, 0.15, 0), 1.0, 1.1, 3.6, '#ffffff');
      p.base.box(local(o, 0, 0.15, 0), 1.02, 0.25, 3.62, '#3d6fb5');
      for (let i = 0; i < 6; i++) p.glass.box(local(o, 0, 0.75, -1.4 + i * 0.56), 1.02, 0.35, 0.4, '#3d5068');
      lights(p, o, 1, 1.81, -1.81, 0.4);
    },
  },
  maglev: {
    tint: '#f6f4ee',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, 0, 0.2, -0.3), 1.0, 0.9, 3.6, '#ffffff');
      p.tint.gem(local(o, 0, 0.65, 1.5, 0, 1, [Math.PI / 2, 0]), 0.5, 1.3, '#ffffff', 8, 0.05);
      p.base.box(local(o, 0, 0.25, -0.3), 1.02, 0.12, 3.62, '#e3b84b');
      p.glass.box(local(o, 0, 0.75, -0.3), 1.02, 0.25, 3.3, '#3d5068');
      p.glow.box(local(o, 0, 0.6, 2.7), 0.4, 0.06, 0.02, '#fff6d8');
    },
  },
  rover: {
    tint: '#eef0f2',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, 0, 0.4, 0), 1.0, 0.45, 1.6, '#ffffff');
      p.glass.box(local(o, 0, 0.85, 0.3), 0.8, 0.3, 0.6, '#9fd6e8');
      p.base.panel(local(o, 0, 0.9, -0.5), 1.2, 0.7, '#2a4f8a', '#9aa0a6');
      wheels(p, o, 1.1, [-0.6, 0, 0.6], 0.22);
      p.glow.box(local(o, 0, 0.6, 0.81), 0.4, 0.06, 0.02, '#fff6d8');
    },
  },
  cart: {
    tint: '#9a7a5a',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, 0, 0.45, -0.3), 0.9, 0.35, 1.3, '#ffffff');
      for (const side of [-1, 1])
        p.base.prism(
          local(o, side * 0.5, 0.4, -0.3, 0, 1, [0, Math.PI / 2]).multiply(new THREE.Matrix4().makeTranslation(0, -0.05, 0)),
          0.4,
          0.4,
          0.08,
          8,
          '#6a4a2a',
        );
      p.base.beam(v(-0.2, 0.55, 0.35), v(-0.2, 0.55, 1.1), 0.03, '#6a4a2a');
      p.base.beam(v(0.2, 0.55, 0.35), v(0.2, 0.55, 1.1), 0.03, '#6a4a2a');
      const horse = local(o, 0, 0, 1.35);
      p.base.box(local(horse, 0, 0.55, 0), 0.3, 0.38, 0.9, '#7a4a2a');
      for (const [x, z] of [[-0.1, -0.35], [0.1, -0.35], [-0.1, 0.35], [0.1, 0.35]])
        p.base.box(local(horse, x, 0, z), 0.07, 0.56, 0.07, '#3a2a20');
      p.base.box(local(horse, 0, 0.8, 0.45, 0, 1, [0.6, 0]), 0.16, 0.4, 0.16, '#7a4a2a');
    },
  },
  bicycle: {
    tint: '#3d6fb5',
    build: (p) => {
      const o = at();
      for (const z of [-0.35, 0.35])
        p.base.torus(local(o, 0, 0.25, z, 0, 1, [0, Math.PI / 2]), 0.22, 0.025, '#1e1f24', 8, 3);
      p.tint.beam(v(0, 0.3, -0.35), v(0, 0.55, 0.2), 0.03, '#ffffff');
      p.tint.beam(v(0, 0.55, 0.2), v(0, 0.3, 0.35), 0.03, '#ffffff');
    },
  },
  ship: {
    tint: '#c4452f',
    build: (p) => {
      const o = at();
      hull(p, o, 7, 1.6, 0.9, '#ffffff');
      const tones = ['#3d6fb5', '#e0a830', '#2e9e6e', '#c4452f', '#8a8f96'];
      for (let i = 0; i < 8; i++)
        p.base.box(local(o, (i % 2) * 0.7 - 0.35, 0.9 + Math.floor(i / 4) * 0.4, -1.8 + (Math.floor(i / 2) % 2) * 1.6), 0.6, 0.4, 1.4, tones[i % 5]);
      p.base.box(local(o, 0, 0.9, -2.9), 1.3, 1.6, 0.8, '#f2efe6');
      p.glass.box(local(o, 0, 2.1, -2.48), 1.2, 0.25, 0.02, '#3d5068');
      p.base.prism(local(o, 0, 2.5, -3.0), 0.15, 0.12, 0.8, 6, '#3a3d44');
      p.glow.box(local(o, 0, 2.6, -2.9), 0.2, 0.1, 0.2, '#fff6d8');
    },
  },
  tanker: {
    tint: '#2a2d33',
    build: (p) => {
      const o = at();
      hull(p, o, 8, 1.8, 0.8, '#ffffff');
      p.base.box(local(o, 0, 0.8, 0.6), 1.2, 0.2, 4.8, '#c4452f');
      p.base.beam(v(0, 1.05, -1.6), v(0, 1.05, 2.8), 0.1, '#8a8f96');
      p.base.box(local(o, 0, 0.8, -3.2), 1.4, 1.6, 0.9, '#f2efe6');
      p.glow.box(local(o, 0, 2.5, -3.2), 0.2, 0.1, 0.2, '#fff6d8');
    },
  },
  ferry: {
    tint: '#f2efe6',
    build: (p) => {
      const o = at();
      hull(p, o, 5, 1.6, 0.7, '#ffffff');
      p.base.box(local(o, 0, 0.7, -0.4), 1.3, 0.8, 2.8, '#f2efe6');
      p.base.box(local(o, 0, 1.5, -0.6), 1.1, 0.6, 1.6, '#e6e8ea');
      for (let i = 0; i < 5; i++) p.glow.box(local(o, 0, 1.05, -1.6 + i * 0.6), 1.32, 0.2, 0.3, '#ffe6a8');
      p.base.prism(local(o, 0, 2.1, -0.8), 0.15, 0.15, 0.5, 6, '#3d6fb5');
    },
  },
  sailboat: {
    tint: '#f2efe6',
    build: (p) => {
      const o = at();
      hull(p, o, 2.6, 0.9, 0.45, '#ffffff');
      p.base.prism(local(o, 0, 0.45, 0.2), 0.04, 0.03, 2.6, 4, '#6a4a2a');
      const q = (x: number, y: number, z: number) => v(x, y, z).applyMatrix4(o);
      p.base.tri(q(0, 0.7, 0.25), q(0, 3.0, 0.25), q(0, 0.7, -1.0), '#f8f6f0');
      p.base.tri(q(0, 0.7, -1.0), q(0, 3.0, 0.25), q(0, 0.7, 0.25), '#e8e4d8');
      p.base.tri(q(0, 0.7, 0.35), q(0, 2.6, 0.32), q(0, 0.6, 1.2), '#f0d9a0');
      p.base.tri(q(0, 0.6, 1.2), q(0, 2.6, 0.32), q(0, 0.7, 0.35), '#e0c890');
    },
  },
  fishing: {
    tint: '#3d6fb5',
    build: (p) => {
      const o = at();
      hull(p, o, 2.8, 1.0, 0.5, '#ffffff');
      p.base.box(local(o, 0, 0.5, -0.5), 0.7, 0.6, 0.8, '#f2efe6');
      p.base.beam(v(0, 0.5, 0.4), v(0, 1.8, -0.2), 0.04, '#6a4a2a');
      p.base.beam(v(0, 1.6, -0.1), v(0.6, 0.8, 1.2), 0.015, '#3a3d44');
    },
  },
  canoe: {
    tint: '#9a6a3a',
    build: (p) => {
      const o = at();
      hull(p, o, 2.4, 0.55, 0.25, '#ffffff');
      for (const z of [-0.5, 0.5]) {
        p.base.box(local(o, 0, 0.2, z), 0.24, 0.45, 0.2, '#b3824f');
        p.base.gem(local(o, 0, 0.65, z), 0.1, 0.2, '#c98e5c', 5);
      }
      p.base.beam(v(0.35, 0.5, 0.6), v(0.4, -0.1, 0.9), 0.025, '#6a4a2a');
    },
  },
  'bio-skiff': {
    tint: '#3cc9a8',
    build: (p) => {
      const o = at();
      p.tint.gem(local(o, 0, 0.1, -1.0, 0, 1, [Math.PI / 2, 0]), 0.45, 2.2, '#ffffff', 6, 0.4);
      p.glass.dome(local(o, 0, 0.3, 0.1), 0.35, '#e8d9f0', 6, 1, 0.9);
      p.glow.box(local(o, 0, 0.15, 1.1), 0.12, 0.06, 0.02, '#b8fff0');
    },
  },
  plane: {
    tint: '#f2f3f5',
    build: (p) => {
      const o = at();
      p.tint.gem(local(o, 0, 0, -2.2, 0, 1, [Math.PI / 2, 0]), 0.32, 4.6, '#ffffff', 8, 0.55);
      for (const side of [-1, 1]) {
        p.tint.panel(local(o, side * 1.2, 0, -0.3, side * 0.28), 2.4, 0.85, '#ffffff');
        p.glow.box(local(o, side * 2.35, 0.05, -0.75), 0.1, 0.1, 0.1, side > 0 ? '#3aff6a' : '#ff3b30');
      }
      p.tint.box(local(o, 0, 0, -2.0), 1.6, 0.05, 0.5, '#ffffff');
      p.base.box(local(o, 0, 0.1, -2.0), 0.06, 0.8, 0.5, '#c4452f');
      for (const side of [-1, 1]) p.base.prism(local(o, side * 1.0, -0.35, -0.2, 0, 1, [Math.PI / 2, 0]), 0.16, 0.16, 0.6, 6, '#9aa0a6');
    },
  },
  airship: {
    tint: '#e8dcc4',
    build: (p) => {
      const o = at();
      p.tint.gem(local(o, 0, 1.4, -2.4, 0, 1, [Math.PI / 2, 0]), 1.0, 4.8, '#ffffff', 10, 0.5);
      p.base.box(local(o, 0, 0.2, 0), 0.6, 0.45, 1.4, '#8a6a4a');
      for (const z of [-0.5, 0.5]) p.base.beam(v(0, 0.65, z), v(0, 0.9, z), 0.02, '#3a3d44');
      for (const side of [-1, 1]) p.base.panel(local(o, side * 0.7, 1.4, -2.1, 0, 1, [0, Math.PI / 2]), 0.7, 0.6, '#c4452f');
      p.glow.box(local(o, 0, 0.4, 0.71), 0.3, 0.12, 0.02, '#ffe2a0');
    },
  },
  glider: {
    tint: '#d35fc4',
    build: (p) => {
      const o = at();
      const q = (x: number, y: number, z: number) => v(x, y, z).applyMatrix4(o);
      p.tint.tri(q(0, 0, 1.2), q(-2, 0.3, -0.6), q(0, 0.1, -0.4), '#ffffff');
      p.tint.tri(q(0, 0.1, -0.4), q(-2, 0.3, -0.6), q(0, 0, 1.2), '#ffffff');
      p.tint.tri(q(0, 0, 1.2), q(0, 0.1, -0.4), q(2, 0.3, -0.6), '#ffffff');
      p.tint.tri(q(2, 0.3, -0.6), q(0, 0.1, -0.4), q(0, 0, 1.2), '#ffffff');
      p.glow.gem(local(o, 0, 0, -0.4, 0, 1, [Math.PI / 2, 0]), 0.08, 1.4, '#b8fff0', 4);
    },
  },
  'machine-walker': {
    tint: '#1f2230',
    build: (p) => {
      const o = at();
      p.tint.gem(local(o, 0, 1.4, 0), 0.6, 1.0, '#ffffff', 4, 0.5);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        p.base.beam(v(Math.cos(a) * 0.3, 1.6, Math.sin(a) * 0.3), v(Math.cos(a) * 1.0, 0.9, Math.sin(a) * 1.0), 0.06, '#2a2f42');
        p.base.beam(v(Math.cos(a) * 1.0, 0.9, Math.sin(a) * 1.0), v(Math.cos(a) * 1.2, 0, Math.sin(a) * 1.2), 0.05, '#2a2f42');
      }
      p.glow.box(local(o, 0, 1.75, 0.45), 0.25, 0.08, 0.02, '#6ff6ff');
    },
  },
};
