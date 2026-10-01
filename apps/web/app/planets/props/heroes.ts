import * as THREE from 'three';
import { local, type Tone } from '../kit';
import type { PropDef, PropMeshers } from './library';

/**
 * Set pieces: one or two per world, each a silhouette a reader can name from the story view.
 * Authored large in person units (a titan stands about five citizens tall); `tint` and `metal`
 * take the instance colour and `glow` lights up.
 */

const at = () => new THREE.Matrix4();
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const forward = (m: THREE.Matrix4, x: number, y: number, z: number) =>
  local(m, x, y, z, 0, 1, [Math.PI / 2, 0]);

const dark: Tone = '#22252b';
const steel: Tone = '#aeb6c0';
const cyan: Tone = '#6ff6ff';
const red: Tone = '#ff3b30';
const amber: Tone = '#ffb03a';

function sign(p: PropMeshers, m: THREE.Matrix4, w: number, h: number, tone: Tone) {
  p.glow.plate(m, w, h, tone);
  p.glow.plate(m.clone().multiply(new THREE.Matrix4().makeRotationY(Math.PI)), w, h, tone);
}

/** A giant humanoid machine about five units tall with a lit core, visor and thrusters. */
function titan(p: PropMeshers, eye: Tone, raised: number) {
  const o = at();
  for (const side of [-1, 1]) {
    const x = side * 0.5;
    p.base.box(local(o, x, 0, 0.1), 0.62, 0.3, 0.95, dark);
    p.tint.box(local(o, x, 0.3, 0), 0.5, 0.95, 0.55, '#ffffff');
    p.base.box(local(o, x, 1.2, 0.02), 0.42, 0.22, 0.5, dark);
    p.tint.box(local(o, x, 1.4, 0), 0.52, 0.9, 0.58, '#ffffff');
  }
  p.base.box(local(o, 0, 2.25, 0), 1.0, 0.35, 0.6, dark);
  p.tint.prism(local(o, 0, 2.55, 0, Math.PI / 4), 0.85, 1.15, 1.3, 4, '#ffffff');
  p.glow.gem(local(o, 0, 3.0, 0.62), 0.2, 0.5, eye, 6, 0.5);
  p.base.box(local(o, 0, 3.85, 0), 0.4, 0.2, 0.4, dark);
  p.tint.box(local(o, 0, 4.0, 0), 0.62, 0.55, 0.62, '#ffffff');
  p.glow.plate(local(o, 0, 4.22, 0.311), 0.48, 0.12, eye);
  for (const side of [-1, 1]) {
    p.tint.box(local(o, side * 1.0, 3.35, 0, 0, 1, [0, side * 0.25]), 0.75, 0.55, 0.8, '#ffffff');
    const lift = side === 1 ? raised : 0;
    const shoulder = v(side * 1.05, 3.3, 0);
    const elbow = v(side * 1.2, 2.3 + lift * 1.3, lift * 0.6);
    const hand = v(side * 1.25, 1.45 + lift * 2.4, 0.3 + lift * 0.4);
    p.base.beam(shoulder, elbow, 0.22, dark);
    p.tint.beam(elbow, hand, 0.27, '#ffffff');
    p.base.box(local(o, hand.x, hand.y - 0.3, hand.z), 0.42, 0.36, 0.42, dark);
  }
  for (const side of [-1, 1]) {
    p.metal.prism(local(o, side * 0.35, 2.7, -0.75), 0.18, 0.24, 0.9, 6, '#ffffff');
    p.glow.prism(local(o, side * 0.35, 2.55, -0.75), 0.15, 0.15, 0.15, 6, amber);
  }
  p.base.beam(v(0.22, 4.55, -0.1), v(0.32, 5.1, -0.15), 0.035, dark);
  p.glow.box(local(o, 0.32, 5.08, -0.15), 0.1, 0.1, 0.1, eye);
}

/** A titan fallen long ago: torso, head and an outflung arm half sunk, grown over. */
function fallen(p: PropMeshers) {
  const o = at();
  const body = local(o, 0, -0.35, 0, 0.2, 1, [Math.PI / 2 - 0.12, 0.1]);
  p.tint.prism(local(body, 0, 0, 0, Math.PI / 4), 0.85, 1.1, 2.4, 4, '#ffffff');
  const head = local(o, 0.4, -0.3, 3.0, 0.7, 1, [0.5, 0.4]);
  p.tint.box(head, 1.2, 1.1, 1.2, '#ffffff');
  p.base.plate(local(head, -0.22, 0.62, 0.601), 0.3, 0.18, '#141414');
  p.base.plate(local(head, 0.22, 0.62, 0.601), 0.3, 0.18, '#141414');
  p.tint.beam(v(1.0, 0.2, 0.6), v(3.4, 0.1, 1.6), 0.32, '#ffffff');
  p.base.box(local(o, 3.6, -0.1, 1.7, 0.4), 0.7, 0.55, 0.7, '#4a3f36');
  p.tint.beam(v(-0.6, 0.1, -1.6), v(-1.6, 0.5, -3.2), 0.36, '#ffffff');
  p.tint.beam(v(-1.6, 0.5, -3.2), v(-1.2, 0.0, -4.4), 0.32, '#ffffff');
  for (const [x, y, z, r, seed] of [
    [0.1, 0.75, 0.4, 0.95, 3],
    [0.5, 0.7, 2.9, 0.6, 5],
    [-1.3, 0.55, -2.8, 0.55, 7],
    [2.2, 0.35, 1.2, 0.45, 9],
  ])
    p.base.blob(
      local(o, x, y, z).multiply(new THREE.Matrix4().makeScale(1, 0.35, 1)),
      r,
      '#4f7a3a',
      0.3,
      seed,
    );
  for (const [x, z] of [
    [1.2, -0.6],
    [-0.8, 1.6],
  ]) {
    p.base.prism(local(o, x, 0, z), 0.05, 0.03, 0.9, 4, '#5a4632');
    p.base.gem(local(o, x, 0.7, z), 0.38, 0.8, '#3f7a3a', 5, 0.4);
  }
}

export const heroes: Record<string, PropDef> = {
  /** A titan on duty: cyan core, one arm raised. */
  titan: { tint: '#d9dde2', build: (p) => titan(p, cyan, 0.7) },
  /** An enforcer titan: red visor, arms down. */
  enforcer: { tint: '#4a4f58', build: (p) => titan(p, red, 0) },
  'titan-wreck': { tint: '#8a6a52', build: fallen },

  /** S1's panopticon: a tower ringed with screens around one red eye. */
  panopticon: {
    tint: '#5d6168',
    build: (p) => {
      const o = at();
      p.base.prism(local(o, 0, 0, 0), 1.6, 1.3, 0.8, 8, dark);
      p.tint.prism(local(o, 0, 0.8, 0), 0.75, 0.5, 6.0, 8, '#ffffff');
      for (const y of [2.4, 4.2]) p.glow.torus(local(o, 0, y, 0), 0.68, 0.05, red, 16, 3);
      p.tint.prism(local(o, 0, 6.8, 0), 1.0, 1.7, 0.6, 8, '#ffffff');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        sign(
          p,
          local(o, Math.sin(a) * 1.8, 7.55, Math.cos(a) * 1.8, a),
          1.1,
          0.7,
          i % 2 ? '#58d8ff' : '#ff6a5a',
        );
      }
      p.tint.prism(local(o, 0, 7.4, 0), 1.7, 1.2, 0.9, 8, '#ffffff');
      p.base.dome(local(o, 0, 8.3, 0), 0.9, '#eceef0', 10, 3);
      p.glow.prism(forward(o, 0, 8.75, 0.6), 0.36, 0.3, 0.32, 10, red);
      p.base.prism(forward(o, 0, 8.75, 0.9), 0.14, 0.14, 0.04, 8, '#111111');
      p.metal.beam(v(0, 9.2, 0), v(0, 10.4, 0), 0.06, '#ffffff');
      p.glow.box(local(o, 0, 10.35, 0), 0.16, 0.16, 0.16, red);
    },
  },

  /** S2's tracked mining excavator with a long boom and toothed bucket. */
  excavator: {
    tint: '#e0a830',
    build: (p) => {
      const o = at();
      for (const side of [-1, 1]) {
        p.base.box(local(o, side * 1.15, 0, 0), 0.75, 0.85, 4.6, dark, '#3a3d44');
        for (let k = -2; k <= 2; k++)
          p.base.prism(
            local(o, side * 1.56, 0.42, k * 0.9, 0, 1, [0, Math.PI / 2]),
            0.3,
            0.3,
            0.06,
            8,
            '#4a4d54',
          );
      }
      p.base.prism(local(o, 0, 0.85, 0), 1.2, 1.2, 0.3, 10, dark);
      p.tint.box(local(o, 0, 1.15, -0.3), 2.5, 1.3, 3.0, '#ffffff');
      p.tint.box(local(o, 0, 1.15, -1.85), 2.3, 1.0, 0.6, '#ffffff');
      p.glass.box(local(o, 0.65, 2.45, 0.6), 0.9, 0.9, 0.9, '#2f4f6a');
      p.tint.box(local(o, 0.65, 3.35, 0.6), 1.0, 0.1, 1.0, '#ffffff');
      p.metal.prism(local(o, -0.8, 2.45, -1.1), 0.12, 0.1, 1.0, 6, '#ffffff');
      const pivot = v(-0.3, 2.2, 1.0),
        knee = v(-0.3, 4.6, 3.4),
        wrist = v(-0.3, 2.4, 5.3);
      p.tint.beam(pivot, knee, 0.32, '#ffffff');
      p.tint.beam(knee, wrist, 0.24, '#ffffff');
      p.base.beam(v(-0.3, 2.0, 1.4), v(-0.3, 3.9, 3.0), 0.09, steel);
      const bucket = local(o, -0.3, 1.4, 5.5, 0, 1, [0.5, 0]);
      p.base.box(bucket, 1.1, 1.0, 0.9, '#4a4d54');
      for (let t = -2; t <= 2; t++)
        p.base.prism(
          local(bucket, t * 0.22, 0, 0.45, 0, 1, [Math.PI / 2, 0]),
          0.06,
          0,
          0.3,
          4,
          steel,
        );
      for (const [x, z] of [
        [1.25, 1.2],
        [-1.25, 1.2],
        [1.25, -1.9],
      ])
        p.glow.box(local(o, x, 1.9, z), 0.12, 0.12, 0.12, amber);
    },
  },

  /** A launch site: pad, flame trench, lattice gantry and a rocket ready to fly. */
  'launch-site': {
    tint: '#f2f2f2',
    build: (p) => {
      const o = at();
      p.base.prism(local(o, 0, 0, 0), 3.2, 3.0, 0.35, 10, '#6c7078', '#8a8f96');
      p.glow.torus(local(o, 0, 0.37, 0), 2.6, 0.06, amber, 20, 3);
      p.tint.prism(local(o, 0, 0.35, 0), 0.75, 0.75, 6.0, 10, '#ffffff');
      p.tint.prism(local(o, 0, 6.35, 0), 0.75, 0, 1.7, 10, '#ffffff');
      p.metal.box(local(o, 0, 4.4, 0), 1.55, 0.35, 1.55, '#ffffff');
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const fin = [v(0, 0.4, 0), v(0, 2.1, 0), v(0, 0.4, 0)].map((q) => q.clone());
        fin[0].set(Math.cos(a) * 0.7, 0.4, Math.sin(a) * 0.7);
        fin[1].set(Math.cos(a) * 0.7, 2.0, Math.sin(a) * 0.7);
        fin[2].set(Math.cos(a) * 1.5, 0.4, Math.sin(a) * 1.5);
        p.base.tri(fin[0], fin[1], fin[2], dark);
        p.base.tri(fin[0], fin[2], fin[1], dark);
      }
      p.glow.prism(local(o, 0, 0.15, 0), 0.55, 0.7, 0.2, 10, amber);
      const g = 1.9;
      for (const [x, z] of [
        [g, -0.4],
        [g + 0.8, -0.4],
        [g, 0.4],
        [g + 0.8, 0.4],
      ])
        p.base.beam(v(x, 0.35, z), v(x, 7.6, z), 0.07, '#c4452f');
      for (let y = 1; y < 7.6; y += 1.1) {
        p.base.beam(v(g, y, -0.4), v(g + 0.8, y + 0.55, -0.4), 0.04, '#c4452f');
        p.base.beam(v(g, y, 0.4), v(g + 0.8, y + 0.55, 0.4), 0.04, '#c4452f');
      }
      p.base.beam(v(g, 5.6, 0), v(0.8, 5.6, 0), 0.08, steel);
      p.glow.box(local(o, g + 0.4, 7.65, 0), 0.18, 0.18, 0.18, red);
    },
  },

  /** S3's garden spire: a white tower with terraces of trees and a glass crown. */
  'garden-spire': {
    tint: '#f6f4ee',
    build: (p) => {
      const o = at();
      p.base.prism(local(o, 0, 0, 0), 1.5, 1.3, 0.5, 8, '#d8cfb4');
      p.tint.prism(local(o, 0, 0.5, 0), 0.8, 0.35, 8.5, 8, '#ffffff');
      for (const [y, r] of [
        [2.0, 1.5],
        [4.3, 1.15],
        [6.4, 0.85],
      ]) {
        p.tint.prism(local(o, 0, y, 0), r, r * 1.05, 0.22, 10, '#ffffff', '#7fbf5a');
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + y;
          p.base.gem(
            local(o, Math.cos(a) * r * 0.75, y + 0.22, Math.sin(a) * r * 0.75),
            0.28,
            0.7,
            i % 2 ? '#4f9a4a' : '#3f8f44',
            5,
            0.4,
          );
        }
        p.glow.torus(local(o, 0, y - 0.05, 0), r * 1.02, 0.04, '#ffe9a8', 16, 3);
      }
      p.glass.dome(local(o, 0, 9.0, 0), 0.65, '#9fd6e8', 8, 2);
      p.glow.gem(local(o, 0, 9.55, 0), 0.12, 0.6, '#ffe9a8', 6, 0.4);
    },
  },

  /** S5's bio-spire: a twisting grown tower hung with glowing pods. */
  'bio-spire': {
    tint: '#c46ad0',
    build: (p) => {
      const o = at();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        p.tint.beam(v(Math.cos(a) * 1.4, 0, Math.sin(a) * 1.4), v(0, 1.4, 0), 0.18, '#ffffff');
      }
      let y = 1.2;
      for (let k = 0; k < 7; k++) {
        const r = 0.75 - k * 0.07;
        p.tint.gem(
          local(o, Math.sin(k * 1.3) * 0.25, y, Math.cos(k * 1.3) * 0.25, k * 0.6),
          r,
          1.4,
          '#ffffff',
          6,
          0.5,
        );
        if (k % 2 === 0)
          for (const side of [-1, 1]) {
            const a = k * 1.1 + (side > 0 ? 0 : Math.PI);
            const tip = v(Math.cos(a) * 1.4, y + 0.9, Math.sin(a) * 1.4);
            p.tint.beam(v(0, y + 0.5, 0), tip, 0.08, '#ffffff');
            p.glow.gem(
              local(o, tip.x, tip.y - 0.35, tip.z),
              0.22,
              0.55,
              k % 4 ? '#6fe0c8' : '#ff8ae8',
              6,
              0.5,
            );
          }
        y += 1.15;
      }
      p.glow.gem(local(o, 0, y, 0), 0.32, 1.1, '#ff8ae8', 6, 0.4);
    },
  },

  /** S6's nanoforge: a dark pyramid seamed with light, venting heat. */
  nanoforge: {
    tint: '#4b525b',
    build: (p) => {
      const o = at();
      p.base.box(local(o, 0, 0, 0), 7.0, 0.4, 7.0, '#3d434a', '#5f6874');
      p.tint.prism(local(o, 0, 0.4, 0, Math.PI / 4), 4.4, 0, 5.0, 4, '#ffffff');
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        p.glow.beam(v(Math.cos(a) * 4.4, 0.42, Math.sin(a) * 4.4), v(0, 5.4, 0), 0.05, amber);
      }
      for (const y of [1.6, 3.0]) {
        const r = 4.4 * (1 - (y - 0.4) / 5.0);
        p.glow.torus(local(o, 0, y, 0, Math.PI / 4), r * 0.72, 0.04, cyan, 4, 3);
      }
      for (const [x, z] of [
        [2.9, 2.9],
        [-2.9, 2.9],
        [2.9, -2.9],
      ]) {
        p.metal.prism(local(o, x, 0.4, z), 0.45, 0.35, 1.6, 8, '#ffffff');
        p.glow.prism(local(o, x, 2.0, z), 0.3, 0.3, 0.06, 8, amber);
      }
      p.glow.gem(local(o, 0, 5.2, 0), 0.35, 0.9, cyan, 4, 0.5);
    },
  },

  /** A hunter drone of the machine war: armoured hull, red eye, four rotors. */
  'hunter-drone': {
    tint: '#2d2a2f',
    build: (p) => {
      const o = at();
      p.tint.gem(local(o, 0, 0.6, 0), 0.6, 0.9, '#ffffff', 6, 0.45);
      p.glow.box(local(o, 0, 0.95, 0.5), 0.3, 0.14, 0.06, red);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const x = Math.cos(a) * 1.0,
          z = Math.sin(a) * 1.0;
        p.base.beam(v(0, 1.0, 0), v(x, 1.1, z), 0.05, dark);
        p.metal.torus(local(o, x, 1.12, z), 0.4, 0.04, '#ffffff', 10, 3);
      }
      p.base.prism(forward(o, 0, 0.45, 0.2), 0.06, 0.05, 0.8, 6, dark);
    },
  },

  /** S9's monolith: a black slab carved with cyan light, crystals drifting beside it. */
  monolith: {
    tint: '#14161c',
    build: (p) => {
      const o = at();
      p.base.prism(local(o, 0, 0, 0), 1.7, 1.5, 0.25, 6, '#2a2d33');
      p.tint.box(local(o, 0, 0.25, 0), 1.5, 5.6, 0.45, '#ffffff');
      for (const side of [-1, 1])
        for (let k = 0; k < 6; k++) {
          const m = local(
            o,
            ((k % 2) - 0.5) * 0.5,
            1.0 + k * 0.8,
            side * 0.231,
            side > 0 ? 0 : Math.PI,
          );
          p.glow.plate(m, 0.35 + (k % 3) * 0.15, 0.08, cyan);
        }
      for (const [x, y, z, s] of [
        [1.4, 3.6, 0.5, 0.3],
        [-1.3, 2.4, -0.4, 0.22],
        [1.0, 1.6, -0.8, 0.18],
      ])
        p.glow.gem(local(o, x, y, z, x), s, s * 2.8, '#9ff8ff', 4, 0.5);
    },
  },

  /** S10's seed ark: a tall white ship on its legs, readied for the outer system. */
  'seed-ark': {
    tint: '#eef1f4',
    build: (p) => {
      const o = at();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        p.base.beam(
          v(Math.cos(a) * 0.9, 1.6, Math.sin(a) * 0.9),
          v(Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9),
          0.1,
          steel,
        );
        p.base.prism(local(o, Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9), 0.3, 0.25, 0.1, 6, dark);
      }
      p.metal.prism(local(o, 0, 0.6, 0), 0.6, 0.9, 0.9, 8, '#ffffff');
      p.glow.prism(local(o, 0, 0.5, 0), 0.5, 0.5, 0.1, 8, amber);
      p.tint.prism(local(o, 0, 1.5, 0), 1.0, 1.0, 5.0, 8, '#ffffff');
      p.tint.prism(local(o, 0, 6.5, 0), 1.0, 0, 2.2, 8, '#ffffff');
      for (let k = 0; k < 4; k++)
        p.glow.torus(local(o, 0, 2.3 + k * 1.1, 0), 1.01, 0.03, '#9fe0ff', 16, 3);
      p.glass.dome(local(o, 0, 5.4, 0.55, 0, 1, [Math.PI / 2, 0]), 0.35, '#7fc8e8', 8, 1);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        p.base.tri(
          v(Math.cos(a) * 0.95, 1.6, Math.sin(a) * 0.95),
          v(Math.cos(a) * 0.95, 3.4, Math.sin(a) * 0.95),
          v(Math.cos(a) * 1.9, 1.4, Math.sin(a) * 1.9),
          '#7fbf5a',
        );
        p.base.tri(
          v(Math.cos(a) * 0.95, 1.6, Math.sin(a) * 0.95),
          v(Math.cos(a) * 1.9, 1.4, Math.sin(a) * 1.9),
          v(Math.cos(a) * 0.95, 3.4, Math.sin(a) * 0.95),
          '#7fbf5a',
        );
      }
    },
  },

  /** A gardener robot: domed head, watering arm and a planter of seedlings on its back. */
  'gardener-bot': {
    tint: '#7fbf5a',
    build: (p) => {
      const o = at();
      for (const side of [-1, 1]) p.base.box(local(o, side * 0.13, 0, 0), 0.14, 0.42, 0.16, steel);
      p.tint.box(local(o, 0, 0.42, 0), 0.44, 0.42, 0.3, '#ffffff');
      p.base.box(local(o, 0, 0.5, -0.24), 0.5, 0.3, 0.22, '#8a6a44');
      for (const x of [-0.14, 0.1])
        p.base.gem(local(o, x, 0.8, -0.24), 0.1, 0.3, '#4f9a4a', 4, 0.4);
      p.base.dome(local(o, 0, 0.86, 0), 0.2, '#eceef0', 8, 2);
      p.glow.plate(local(o, 0, 0.94, 0.19), 0.2, 0.05, cyan);
      p.base.beam(v(0.24, 0.75, 0), v(0.34, 0.6, 0.35), 0.035, steel);
      p.tint.prism(forward(o, 0.34, 0.6, 0.35), 0.06, 0.03, 0.2, 6, '#ffffff');
      p.base.beam(v(-0.24, 0.75, 0), v(-0.3, 0.4, 0.15), 0.035, steel);
    },
  },
};
