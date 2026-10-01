import * as THREE from 'three';
import { local, type Tone } from '../kit';
import type { PropDef, PropMeshers } from './library';

/**
 * Machines of the high-technology futures: robots, mechs, hover vehicles, spacecraft and the
 * glowing architecture they serve. Every model is in person units, faces +z and stands on y = 0;
 * `tint` and `metal` parts take the instance colour, `glow` parts light up.
 */

const at = () => new THREE.Matrix4();
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** A child frame whose +y points along +z, for barrels, fuselages and pods. */
const forward = (m: THREE.Matrix4, x: number, y: number, z: number) =>
  local(m, x, y, z, 0, 1, [Math.PI / 2, 0]);
/** A child frame whose +y points along -z, for engines and exhausts. */
const backward = (m: THREE.Matrix4, x: number, y: number, z: number) =>
  local(m, x, y, z, 0, 1, [-Math.PI / 2, 0]);

const steel: Tone = '#b9c0c9';
const joint: Tone = '#2a2d33';
const cyan: Tone = '#6ff6ff';
const red: Tone = '#ff4a3d';
const amber: Tone = '#ffb03a';

/**
 * A wedge: a box whose roof slopes from `back` height at -z to `front` height at +z, its nose
 * narrowed to `nose` of the full width. Sleek hulls for hover vehicles.
 */
function wedge(
  mesh: PropMeshers['tint'],
  m: THREE.Matrix4,
  w: number,
  length: number,
  back: number,
  front: number,
  nose: number,
  tone: Tone,
) {
  const x = w / 2,
    z = length / 2,
    n = x * nose;
  const p = (px: number, py: number, pz: number) => new THREE.Vector3(px, py, pz).applyMatrix4(m);
  const [bl, br, fl, fr] = [p(-x, 0, -z), p(x, 0, -z), p(-n, 0, z), p(n, 0, z)];
  const [tbl, tbr, tfl, tfr] = [p(-x, back, -z), p(x, back, -z), p(-n, front, z), p(n, front, z)];
  mesh.quad(bl, fl, tfl, tbl, tone);
  mesh.quad(fr, br, tbr, tfr, tone);
  mesh.quad(fl, fr, tfr, tfl, tone);
  mesh.quad(br, bl, tbl, tbr, tone);
  mesh.quad(tbl, tfl, tfr, tbr, tone);
}

/** A one-sided glow plate visible from both directions. */
function sign(p: PropMeshers, m: THREE.Matrix4, w: number, h: number, tone: Tone) {
  p.glow.plate(m, w, h, tone);
  p.glow.plate(m.clone().multiply(new THREE.Matrix4().makeRotationY(Math.PI)), w, h, tone);
}

/** A humanoid service robot about 1.25 tall: shell torso and head, steel limbs, lit visor. */
function robot(p: PropMeshers, stride: number, eye: Tone) {
  const o = at();
  for (const side of [-1, 1]) {
    const leg = local(o, side * 0.11, 0.42, 0, 0, 1, [side * stride, 0]);
    p.base.box(local(leg, 0, -0.42, 0), 0.12, 0.42, 0.14, steel);
    p.base.box(local(leg, 0, -0.42, 0.03), 0.16, 0.07, 0.22, joint);
  }
  p.base.box(local(o, 0, 0.38, 0), 0.3, 0.1, 0.18, joint);
  p.tint.box(local(o, 0, 0.47, 0), 0.4, 0.36, 0.26, '#ffffff');
  p.glow.plate(local(o, 0, 0.62, 0.131), 0.12, 0.08, eye);
  for (const side of [-1, 1]) {
    p.tint.box(local(o, side * 0.25, 0.76, 0), 0.14, 0.09, 0.2, '#ffffff');
    const arm = local(o, side * 0.27, 0.8, 0, 0, 1, [-side * stride * 0.7, side * 0.12]);
    p.base.box(local(arm, 0, -0.36, 0), 0.09, 0.36, 0.1, steel);
    p.base.box(local(arm, 0, -0.45, 0), 0.12, 0.09, 0.13, joint);
  }
  p.base.prism(local(o, 0, 0.83, 0), 0.05, 0.05, 0.06, 4, joint);
  p.tint.box(local(o, 0, 0.88, 0), 0.28, 0.21, 0.24, '#ffffff');
  p.glow.plate(local(o, 0, 0.94, 0.121), 0.22, 0.05, eye);
  p.base.beam(v(0.08, 1.09, 0), v(0.1, 1.22, 0), 0.012, joint);
  p.glow.box(local(o, 0.1, 1.21, 0), 0.04, 0.04, 0.04, eye);
}

export const scifi: Record<string, PropDef> = {
  robot: { tint: '#e6e8ea', build: (p) => robot(p, 0, cyan) },
  'robot-walk': { tint: '#e6e8ea', build: (p) => robot(p, 0.36, cyan) },

  /** A tall security unit: one red eye, heavy shoulders and an arm cannon. */
  sentinel: {
    tint: '#3a3f48',
    build: (p) => {
      const o = at();
      for (const side of [-1, 1]) {
        p.base.box(local(o, side * 0.16, 0, 0), 0.16, 0.8, 0.2, joint);
        p.tint.box(local(o, side * 0.16, 0.35, 0.02), 0.2, 0.32, 0.26, '#ffffff');
        p.base.box(local(o, side * 0.16, 0, 0.06), 0.22, 0.1, 0.34, joint);
      }
      p.tint.prism(local(o, 0, 0.78, 0, Math.PI / 4), 0.3, 0.42, 0.62, 4, '#ffffff');
      for (const side of [-1, 1]) {
        p.tint.box(local(o, side * 0.42, 1.18, 0), 0.26, 0.2, 0.36, '#ffffff');
        p.base.box(local(o, side * 0.44, 0.68, 0), 0.13, 0.5, 0.14, joint);
      }
      p.metal.prism(forward(o, 0.44, 0.78, 0), 0.08, 0.06, 0.55, 6, '#ffffff');
      p.glow.prism(forward(o, 0.44, 0.78, 0.55), 0.04, 0.04, 0.03, 6, red);
      p.tint.box(local(o, 0, 1.42, 0), 0.32, 0.26, 0.3, '#ffffff');
      p.glow.box(local(o, 0, 1.5, 0.15), 0.1, 0.08, 0.02, red);
      p.base.beam(v(-0.12, 1.68, -0.05), v(-0.16, 1.92, -0.08), 0.015, joint);
    },
  },

  /** A two-legged mech with a glazed cockpit, missile pods and reverse-jointed legs. */
  mech: {
    tint: '#c4452f',
    build: (p) => {
      const o = at();
      for (const side of [-1, 1]) {
        const x = side * 0.55;
        p.base.beam(v(x, 1.75, 0), v(x, 1.05, -0.4), 0.13, joint);
        p.metal.beam(v(x, 1.05, -0.4), v(x, 0.3, 0.1), 0.11, '#ffffff');
        p.base.beam(v(x, 0.3, 0.1), v(x, 0.12, 0.05), 0.09, joint);
        p.base.box(local(o, x, 0, 0.12), 0.38, 0.14, 0.7, joint);
        p.base.prism(local(o, x, 1.62, 0, 0, 1, [0, Math.PI / 2]), 0.18, 0.18, 0.2, 6, steel);
      }
      p.tint.box(local(o, 0, 1.55, 0), 1.15, 0.85, 1.25, '#ffffff');
      p.tint.box(local(o, 0, 2.4, -0.15), 0.85, 0.22, 0.85, '#ffffff');
      p.glass.box(local(o, 0, 1.75, 0.5), 0.75, 0.4, 0.3, '#2f4f6a');
      p.glow.box(local(o, 0, 2.2, 0.64), 0.6, 0.06, 0.02, cyan);
      for (const side of [-1, 1]) {
        p.metal.box(local(o, side * 0.85, 1.7, 0.05), 0.42, 0.55, 0.85, '#ffffff');
        for (const [dx, dy] of [
          [-0.1, 0.13],
          [0.1, 0.13],
          [-0.1, -0.05],
          [0.1, -0.05],
        ])
          p.glow.plate(local(o, side * 0.85 + dx, 1.9 + dy, 0.48), 0.1, 0.1, amber);
        p.base.prism(forward(o, side * 0.85, 1.55, 0.45), 0.07, 0.07, 0.45, 6, joint);
      }
      p.base.beam(v(0.35, 2.62, -0.4), v(0.4, 3.15, -0.45), 0.02, joint);
      p.glow.box(local(o, 0.4, 3.12, -0.45), 0.06, 0.06, 0.06, red);
    },
  },

  /** A six-legged maintenance crawler with a domed shell and a ring of sensors. */
  'spider-bot': {
    tint: '#e0a830',
    build: (p) => {
      const o = at();
      p.base.prism(local(o, 0, 0.35, 0), 0.38, 0.45, 0.16, 8, joint);
      p.tint.dome(local(o, 0, 0.5, 0), 0.5, '#ffffff', 8, 2, 0.7);
      p.glow.torus(local(o, 0, 0.53, 0), 0.47, 0.03, cyan, 16, 3);
      p.glow.box(local(o, 0, 0.62, 0.42), 0.18, 0.08, 0.06, red);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const c = Math.cos(a),
          s = Math.sin(a);
        p.base.beam(v(c * 0.38, 0.45, s * 0.38), v(c * 0.85, 0.85, s * 0.85), 0.05, joint);
        p.metal.beam(v(c * 0.85, 0.85, s * 0.85), v(c * 1.15, 0, s * 1.15), 0.045, '#ffffff');
      }
    },
  },

  /** A floating car: a sloped wedge on a pool of light, a teardrop canopy, light bars. */
  'hover-car': {
    tint: '#3d6fb5',
    build: (p) => {
      const o = at();
      wedge(p.tint, local(o, 0, 0.22, 0), 1.0, 2.1, 0.38, 0.16, 0.55, '#ffffff');
      wedge(p.glass, local(o, 0, 0.56, -0.25), 0.7, 1.0, 0.24, 0.02, 0.6, '#1f3a52');
      for (const side of [-1, 1]) {
        p.metal.box(local(o, side * 0.56, 0.18, -0.55), 0.18, 0.2, 0.7, '#ffffff');
        p.glow.panel(local(o, side * 0.56, 0.17, -0.55), 0.16, 0.6, cyan);
      }
      p.base.panel(local(o, 0, 0.68, -1.02), 1.15, 0.18, joint);
      p.glow.panel(local(o, 0, 0.19, 0.1), 0.7, 1.5, cyan);
      p.glow.plate(local(o, 0, 0.27, 1.051), 0.45, 0.05, '#ffffff');
      p.glow.plate(
        local(o, 0, 0.5, -1.051).multiply(new THREE.Matrix4().makeRotationY(Math.PI)),
        0.9,
        0.05,
        red,
      );
    },
  },

  /** A long hover-bus with banded windows and a lit skirt. */
  'hover-bus': {
    tint: '#e6e8ea',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, 0, 0.3, 0), 1.15, 0.75, 4.2, '#ffffff');
      p.glass.box(local(o, 0, 0.62, 0.1), 1.17, 0.26, 3.6, '#1f3a52');
      p.tint.prism(forward(o, 0, 0.66, 2.1), 0.75, 0.4, 0.3, 4, '#ffffff', '#ffffff', Math.PI / 4);
      p.glow.panel(local(o, 0, 0.2, 0), 1.0, 4.0, cyan);
      p.glow.plate(local(o, 0, 0.4, 2.11), 0.9, 0.08, '#ffffff');
      p.glow.box(local(o, 0, 1.05, 0), 0.9, 0.05, 3.6, cyan);
    },
  },

  /** A four-rotor cargo drone carrying a crate. */
  'cargo-drone': {
    tint: '#e0a830',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, 0, 0.9, 0), 0.65, 0.22, 0.65, '#ffffff');
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const x = Math.cos(a) * 0.62,
          z = Math.sin(a) * 0.62;
        p.base.beam(v(0, 1.0, 0), v(x, 1.05, z), 0.03, joint);
        p.metal.torus(local(o, x, 1.08, z), 0.26, 0.03, '#ffffff', 10, 3);
        p.base.prism(local(o, x, 1.02, z), 0.04, 0.04, 0.08, 4, joint);
      }
      p.base.beam(v(-0.15, 0.9, 0), v(-0.15, 0.62, 0), 0.015, joint);
      p.base.beam(v(0.15, 0.9, 0), v(0.15, 0.62, 0), 0.015, joint);
      p.base.box(local(o, 0, 0.18, 0), 0.5, 0.44, 0.5, '#8a6a44', '#a8845a');
      p.glow.box(local(o, 0, 0.84, 0.33), 0.2, 0.05, 0.02, red);
    },
  },

  /** A spaceplane on its landing gear: white fuselage, black delta wings, lit engines. */
  shuttle: {
    tint: '#f2f2f2',
    build: (p) => {
      const o = at();
      p.tint.prism(forward(o, 0, 0.85, -2.2), 0.48, 0.46, 3.7, 8, '#ffffff');
      p.tint.prism(forward(o, 0, 0.85, 1.5), 0.46, 0, 1.1, 8, '#ffffff');
      p.glass.box(local(o, 0, 1.15, 1.2), 0.5, 0.18, 0.5, '#1f3a52');
      const wing = (side: number) => {
        const root = v(side * 0.4, 0.72, 0.9),
          tail = v(side * 0.4, 0.72, -2.1),
          tip = v(side * 2.0, 0.66, -1.9);
        p.base.tri(root, tip, tail, joint);
        p.base.tri(root, tail, tip, joint);
      };
      wing(-1);
      wing(1);
      const fin = [v(0, 1.25, -1.0), v(0, 2.4, -2.1), v(0, 1.25, -2.2)] as const;
      p.tint.tri(fin[0], fin[1], fin[2], '#ffffff');
      p.tint.tri(fin[0], fin[2], fin[1], '#ffffff');
      for (const x of [-0.22, 0.22, 0])
        p.glow.prism(backward(o, x, x === 0 ? 1.08 : 0.72, -2.2), 0.15, 0.12, 0.12, 6, amber);
      for (const [x, z] of [
        [0, 1.2],
        [-0.6, -1.4],
        [0.6, -1.4],
      ])
        p.base.beam(v(x, 0.6, z), v(x, 0, z), 0.04, joint);
    },
  },

  /** A planetary lander: faceted body on four splayed legs, engine bell, antenna dish. */
  lander: {
    tint: '#d9b44a',
    build: (p) => {
      const o = at();
      p.tint.prism(local(o, 0, 0.9, 0), 0.75, 0.75, 0.7, 8, '#ffffff');
      p.metal.box(local(o, 0, 1.6, -0.05), 0.85, 0.6, 0.8, '#ffffff');
      p.glass.box(local(o, 0, 1.72, 0.36), 0.5, 0.26, 0.06, '#1f3a52');
      p.base.prism(local(o, 0, 0.55, 0), 0.32, 0.18, 0.35, 8, joint);
      p.glow.prism(local(o, 0, 0.5, 0), 0.22, 0.22, 0.05, 8, amber);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const c = Math.cos(a),
          s = Math.sin(a);
        p.base.beam(v(c * 0.6, 1.1, s * 0.6), v(c * 1.15, 0.05, s * 1.15), 0.05, steel);
        p.base.prism(local(o, c * 1.15, 0, s * 1.15), 0.18, 0.15, 0.06, 6, joint);
      }
      p.base.beam(v(0.3, 1.9, -0.2), v(0.45, 2.3, -0.3), 0.02, joint);
      p.base.dome(local(o, 0.45, 2.3, -0.3, 0, 1, [0.6, 0]), 0.22, '#e6e8ea', 7, 1, 0.35);
      p.glow.box(local(o, -0.3, 1.95, 0.3), 0.06, 0.06, 0.06, red);
    },
  },

  /** A tapering glass-and-steel spire ringed with light. */
  spire: {
    tint: '#e6e8ea',
    build: (p) => {
      const o = at();
      p.base.prism(local(o, 0, 0, 0), 1.05, 0.85, 0.7, 6, steel);
      p.tint.prism(local(o, 0, 0.7, 0), 0.75, 0.22, 8.4, 6, '#ffffff');
      for (const side of [0, 1, 2]) {
        const a = (side / 3) * Math.PI * 2;
        p.metal.beam(
          v(Math.cos(a) * 1.0, 0.1, Math.sin(a) * 1.0),
          v(Math.cos(a) * 0.4, 5.2, Math.sin(a) * 0.4),
          0.07,
          '#ffffff',
        );
      }
      for (const [y, r] of [
        [2.4, 0.66],
        [4.6, 0.5],
        [6.6, 0.36],
      ])
        p.glow.torus(local(o, 0, y, 0), r, 0.06, cyan, 12, 3);
      p.glass.prism(local(o, 0, 1.2, 0, Math.PI / 6), 0.72, 0.52, 3.2, 6, '#9fd6e8');
      p.glow.gem(local(o, 0, 9.0, 0), 0.16, 0.9, cyan, 6, 0.4);
    },
  },

  /** A stepped arcology: terraced tiers banded with glass and edged in light. */
  arcology: {
    tint: '#c9ced6',
    build: (p) => {
      const o = at();
      let y = 0;
      for (const [w, h] of [
        [5.6, 1.4],
        [4.4, 1.5],
        [3.2, 1.6],
        [2.0, 1.6],
      ]) {
        p.tint.box(local(o, 0, y, 0), w, h, w, '#ffffff');
        p.glass.box(local(o, 0, y + h * 0.45, 0), w + 0.04, h * 0.3, w + 0.04, '#5aa8d8');
        p.glow.box(local(o, 0, y + h - 0.04, 0), w + 0.06, 0.05, w + 0.06, amber);
        y += h;
      }
      p.metal.prism(local(o, 0, y, 0), 0.3, 0.05, 2.2, 6, '#ffffff');
      p.glow.gem(local(o, 0, y + 2.1, 0), 0.12, 0.5, red, 4, 0.5);
    },
  },

  /** A fusion reactor: a ring on struts around a glowing core. */
  reactor: {
    tint: '#9aa3ad',
    build: (p) => {
      const o = at();
      p.base.box(local(o, 0, 0, 0), 4.2, 0.35, 4.2, '#5d6168', '#6c7078');
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        p.metal.beam(
          v(Math.cos(a) * 1.9, 0.35, Math.sin(a) * 1.9),
          v(Math.cos(a) * 1.5, 1.6, Math.sin(a) * 1.5),
          0.12,
          '#ffffff',
        );
      }
      p.tint.torus(local(o, 0, 1.7, 0), 1.5, 0.38, '#ffffff', 20, 6);
      p.glow.torus(local(o, 0, 1.7, 0), 1.1, 0.09, cyan, 20, 4);
      p.metal.prism(local(o, 0, 0.35, 0), 0.4, 0.3, 1.1, 8, '#ffffff');
      p.glow.gem(local(o, 0, 1.3, 0), 0.4, 0.9, cyan, 8, 0.5);
      p.base.prism(local(o, 0, 2.2, 0), 0.3, 0.12, 0.8, 8, joint);
    },
  },

  /** A pillar projecting a floating screen of light. */
  hologram: {
    tint: '#3a3f48',
    build: (p) => {
      const o = at();
      p.tint.prism(local(o, 0, 0, 0), 0.45, 0.32, 0.4, 6, '#ffffff');
      p.metal.prism(local(o, 0, 0.4, 0), 0.12, 0.1, 1.6, 6, '#ffffff');
      p.glow.torus(local(o, 0, 2.0, 0), 0.22, 0.04, cyan, 10, 3);
      sign(p, local(o, 0, 2.3, 0), 1.7, 1.05, '#58d8ff');
      sign(p, local(o, 0, 2.55, 0.01), 1.1, 0.16, '#ffffff');
    },
  },

  /** An articulated industrial arm on a turntable. */
  'robot-arm': {
    tint: '#e08a2e',
    build: (p) => {
      const o = at();
      p.base.prism(local(o, 0, 0, 0), 0.55, 0.5, 0.35, 8, joint);
      p.tint.prism(local(o, 0, 0.35, 0), 0.4, 0.36, 0.35, 8, '#ffffff');
      p.tint.beam(v(0, 0.7, 0), v(0, 2.1, 0.55), 0.16, '#ffffff');
      p.base.prism(local(o, 0, 2.1, 0.55, 0, 1, [0, Math.PI / 2]), 0.2, 0.2, 0.28, 8, joint);
      p.tint.beam(v(0, 2.1, 0.55), v(0, 1.55, 1.55), 0.12, '#ffffff');
      p.base.box(local(o, 0, 1.38, 1.6), 0.3, 0.2, 0.22, joint);
      for (const side of [-1, 1])
        p.metal.box(local(o, side * 0.11, 1.12, 1.62), 0.05, 0.28, 0.08, '#ffffff');
      p.glow.box(local(o, 0, 0.6, 0.38), 0.12, 0.05, 0.02, amber);
    },
  },

  /** A defence turret: armoured dome, twin barrels and a targeting light. */
  turret: {
    tint: '#5d6168',
    build: (p) => {
      const o = at();
      p.base.prism(local(o, 0, 0, 0), 0.9, 0.8, 0.35, 8, joint);
      p.tint.dome(local(o, 0, 0.35, 0), 0.7, '#ffffff', 8, 2, 0.8);
      for (const side of [-1, 1])
        p.metal.prism(forward(o, side * 0.18, 0.75, 0.35), 0.08, 0.07, 1.2, 6, '#ffffff');
      p.glow.box(local(o, 0, 0.92, 0.5), 0.14, 0.08, 0.04, red);
    },
  },

  /** A navigation beacon: a slim mast ringed with light. */
  beacon: {
    tint: '#3a3f48',
    build: (p) => {
      const o = at();
      p.tint.prism(local(o, 0, 0, 0), 0.4, 0.3, 0.3, 6, '#ffffff');
      p.metal.prism(local(o, 0, 0.3, 0), 0.08, 0.05, 2.6, 6, '#ffffff');
      for (const y of [1.2, 2.0]) p.glow.torus(local(o, 0, y, 0), 0.25, 0.04, cyan, 10, 3);
      p.glow.gem(local(o, 0, 2.85, 0), 0.12, 0.35, red, 4, 0.5);
    },
  },

  /** A capsule home raised on three legs, with a band of lit windows. */
  'pod-house': {
    tint: '#f2efe6',
    build: (p) => {
      const o = at();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        p.base.beam(
          v(Math.cos(a) * 0.5, 1.2, Math.sin(a) * 0.5),
          v(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9),
          0.06,
          steel,
        );
      }
      p.tint.prism(local(o, 0, 1.1, 0), 0.55, 1.1, 0.5, 10, '#ffffff');
      p.glow.torus(local(o, 0, 1.62, 0), 1.1, 0.06, '#ffd28a', 16, 3);
      p.tint.dome(local(o, 0, 1.6, 0), 1.1, '#ffffff', 10, 2, 0.75);
      p.glass.dome(local(o, 0, 2.35, 0), 0.32, '#9fd6e8', 8, 1);
      p.base.beam(v(0, 1.1, 0.5), v(0, 0, 1.0), 0.05, joint);
    },
  },

  /** A fallen robot from the lost age, half sunk and grown over with moss. */
  'robot-wreck': {
    tint: '#8a6a52',
    build: (p) => {
      const o = at();
      const head = local(o, 0, -0.25, 0, 0.5, 1, [0.35, 0.25]);
      p.tint.box(head, 1.7, 1.4, 1.5, '#ffffff');
      p.base.plate(local(head, -0.35, 0.75, 0.751), 0.35, 0.25, '#1a1a1a');
      p.base.plate(local(head, 0.35, 0.75, 0.751), 0.35, 0.25, '#1a1a1a');
      p.base.box(local(head, 0, 0.25, 0.75), 0.9, 0.12, 0.05, '#3a3a3a');
      p.tint.beam(v(1.0, 0.1, -0.4), v(2.3, 0.25, 0.6), 0.22, '#ffffff');
      p.base.box(local(o, 2.4, 0, 0.7, 0.6), 0.5, 0.35, 0.45, '#5a4a3a');
      p.base.blob(
        local(o, -0.2, 1.05, -0.1, 0, 1, [0, 0]).multiply(
          new THREE.Matrix4().makeScale(1, 0.35, 1),
        ),
        0.75,
        '#4f7a3a',
        0.3,
        7,
      );
      p.base.blob(
        local(o, 1.5, 0.35, 0.1).multiply(new THREE.Matrix4().makeScale(1, 0.4, 1)),
        0.45,
        '#5f8a3e',
        0.3,
        9,
      );
      p.base.box(local(o, -1.3, 0, 0.6, 0.9), 0.6, 0.25, 0.3, '#6a5a4a');
    },
  },
};

/** Robots that count as figures: budgeted with citizens and left out where life is off. */
export const robotKinds = ['robot', 'robot-walk', 'sentinel', 'mech', 'spider-bot'];
