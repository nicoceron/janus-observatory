import * as THREE from 'three';
import { local, type Tone } from '../kit';
import type { PropDef, PropMeshers } from './library';

const at = () => new THREE.Matrix4();

type Figure = {
  skin: Tone;
  legs?: Tone;
  stride?: number;
  hat?: Tone;
  hair?: Tone;
  robe?: boolean;
  carry?: Tone;
};

/** A citizen one unit tall: legs, clothed torso and arms (tinted), head, optional hat or load. */
function figure(p: PropMeshers, f: Figure) {
  const o = at();
  const stride = f.stride ?? 0;
  if (f.robe) {
    p.tint.prism(o, 0.24, 0.15, 0.78, 6, '#ffffff');
  } else {
    for (const side of [-1, 1]) {
      const leg = local(o, side * 0.085, 0.45, 0, 0, 1, [side * stride, 0]);
      p.base.box(local(leg, 0, -0.45, 0), 0.13, 0.45, 0.16, f.legs ?? '#3b3d47');
    }
    p.tint.box(local(o, 0, 0.43, 0), 0.34, 0.36, 0.2, '#ffffff');
  }
  for (const side of [-1, 1]) {
    const arm = local(o, side * 0.215, 0.78, 0, 0, 1, [-side * stride * 0.8, side * 0.08]);
    p.tint.box(local(arm, 0, -0.38, 0), 0.09, 0.38, 0.1, '#f2f2f2');
  }
  p.base.gem(local(o, 0, 0.79, 0), 0.12, 0.23, f.skin, 4, 0.5);
  if (f.hair)
    p.base.prism(local(o, 0, 0.92, -0.01), 0.1, 0.06, 0.08, 4, f.hair, f.hair, Math.PI / 4);
  if (f.hat) p.base.prism(local(o, 0, 0.93, 0), 0.15, 0.1, 0.06, 5, f.hat, f.hat);
  if (f.carry) p.base.box(local(o, 0, 0.5, -0.17), 0.24, 0.3, 0.12, f.carry);
}

const skins: Tone[] = ['#f0c8a2', '#c98e5c', '#8a5634', '#e3b089'];
const hairs: Tone[] = ['#2b2018', '#5a3a22', '#1a1a1a', '#b88a4a'];

export const people: Record<string, PropDef> = {};
skins.forEach((skin, i) => {
  people[`person-${i}`] = { tint: '#4f7fbf', build: (p) => figure(p, { skin, hair: hairs[i] }) };
  people[`walker-${i}`] = {
    tint: '#bf6a4f',
    build: (p) => figure(p, { skin, hair: hairs[(i + 1) % 4], stride: 0.38 }),
  };
});
Object.assign(people, {
  worker: {
    tint: '#e08a2e',
    build: (p) => figure(p, { skin: skins[1], hat: '#f2c230', legs: '#3d4450', stride: 0.2 }),
  },
  'worker-walk': {
    tint: '#e08a2e',
    build: (p) => figure(p, { skin: skins[2], hat: '#f2c230', legs: '#3d4450', stride: 0.4 }),
  },
  guard: {
    tint: '#4a4f58',
    build: (p) => figure(p, { skin: skins[0], hat: '#2a2d33', legs: '#2a2d33' }),
  },
  robed: {
    tint: '#b3824f',
    build: (p) => figure(p, { skin: skins[2], robe: true, hair: '#2b2018' }),
  },
  'robed-walk': {
    tint: '#8f6a44',
    build: (p) => figure(p, { skin: skins[1], robe: true, hair: '#1a1a1a', stride: 0.3 }),
  },
  porter: {
    tint: '#7d6a4a',
    build: (p) => figure(p, { skin: skins[3], stride: 0.35, carry: '#9a7a4a', hair: '#5a3a22' }),
  },
  enhanced: {
    tint: '#e9e2f5',
    build: (p) => {
      figure(p, { skin: '#d9c4e8', stride: 0.3 });
      p.glow.box(local(at(), 0, 0.5, 0.105), 0.06, 0.2, 0.01, '#b8fff0');
      p.glow.gem(local(at(), 0, 1.0, 0), 0.03, 0.12, '#ffb8f0', 4);
    },
  },
  astronaut: {
    tint: '#eef0f2',
    build: (p) => {
      const o = at();
      for (const side of [-1, 1])
        p.tint.box(local(o, side * 0.1, 0, 0), 0.16, 0.45, 0.18, '#ffffff');
      p.tint.box(local(o, 0, 0.43, 0), 0.4, 0.4, 0.26, '#ffffff');
      p.base.box(local(o, 0, 0.45, -0.2), 0.3, 0.34, 0.14, '#9aa0a6');
      for (const side of [-1, 1])
        p.tint.box(local(o, side * 0.25, 0.48, 0), 0.11, 0.32, 0.12, '#ffffff');
      p.tint.dome(local(o, 0, 0.82, 0), 0.17, '#ffffff', 8, 2);
      p.tint.prism(local(o, 0, 0.8, 0), 0.17, 0.17, 0.05, 8, '#ffffff');
      p.glass.box(local(o, 0, 0.86, 0.13), 0.2, 0.1, 0.06, '#e0a640');
    },
  },
} satisfies Record<string, PropDef>);

/** Animals, in the same units: a deer stands about one citizen tall. */
function quadruped(
  p: PropMeshers,
  size: { length: number; height: number; width: number; neck: number; leg: number },
  extra?: (p: PropMeshers) => void,
) {
  const o = at();
  const { length, height, width, neck, leg } = size;
  p.tint.box(local(o, 0, leg, 0), width, height, length, '#ffffff');
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    p.base.box(local(o, x * width * 0.3, 0, z * length * 0.38), 0.08, leg + 0.04, 0.08, '#3a2a20');
  const head = local(o, 0, leg + height * 0.7, length * 0.45, 0, 1, [0.5, 0]);
  p.tint.box(head, width * 0.45, neck, width * 0.45, '#ffffff');
  p.tint.box(
    local(head, 0, neck, 0, 0, 1, [1.0, 0]),
    width * 0.4,
    length * 0.32,
    width * 0.4,
    '#ffffff',
  );
  extra?.(p);
}

Object.assign(people, {
  deer: {
    tint: '#a46c3e',
    build: (p) =>
      quadruped(p, { length: 0.8, height: 0.36, width: 0.26, neck: 0.38, leg: 0.42 }, (p) => {
        for (const side of [-1, 1])
          p.base.beam(
            new THREE.Vector3(side * 0.04, 1.08, 0.46),
            new THREE.Vector3(side * 0.2, 1.36, 0.4),
            0.015,
            '#e8dcc4',
          );
      }),
  },
  bison: {
    tint: '#5a3f2c',
    build: (p) =>
      quadruped(p, { length: 1.1, height: 0.6, width: 0.5, neck: 0.2, leg: 0.32 }, (p) =>
        p.tint.box(local(at(), 0, 0.7, 0.28), 0.56, 0.42, 0.42, '#ffffff'),
      ),
  },
  cow: {
    tint: '#efe8dc',
    build: (p) =>
      quadruped(p, { length: 1.0, height: 0.46, width: 0.42, neck: 0.18, leg: 0.36 }, (p) =>
        p.base.box(local(at(), 0.12, 0.62, -0.1), 0.2, 0.2, 0.3, '#2a2420'),
      ),
  },
  sheep: {
    tint: '#f2efe6',
    build: (p) => {
      const o = at();
      p.tint.blob(local(o, 0, 0.45, 0), 0.32, '#ffffff', 0.25, 3);
      p.base.box(local(o, 0, 0.36, 0.36), 0.16, 0.2, 0.18, '#2a2420');
      for (const [x, z] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ])
        p.base.box(local(o, x * 0.12, 0, z * 0.18), 0.06, 0.3, 0.06, '#2a2420');
    },
  },
  horse: {
    tint: '#7a4a2a',
    build: (p) => quadruped(p, { length: 1.0, height: 0.4, width: 0.3, neck: 0.5, leg: 0.6 }),
  },
  bird: {
    tint: '#f4f4f4',
    build: (p) => {
      const o = at();
      p.tint.gem(local(o, 0, 0, 0, 0, 1, [Math.PI / 2, 0]), 0.08, 0.4, '#ffffff', 4, 0.4);
      for (const side of [-1, 1])
        p.tint.panel(
          local(o, side * 0.28, 0.08, 0.02, 0, 1, [0, side * 0.35]),
          0.5,
          0.16,
          '#ffffff',
        );
    },
  },
  whale: {
    tint: '#4a5b6e',
    build: (p) => {
      const o = at();
      p.tint.gem(local(o, 0, 0.1, -1.4, 0, 1, [Math.PI / 2, 0]), 0.55, 3.2, '#ffffff', 7, 0.35);
      p.tint.panel(local(o, 0, 0.12, -1.6, 0, 1, [0, 0]), 1.2, 0.4, '#ffffff');
      p.base.dome(local(o, 0, 0.15, 0.4), 0.22, '#d9dfe6', 6, 1, 0.3);
    },
  },
  fish: {
    tint: '#f2a03a',
    build: (p) =>
      p.tint.gem(local(at(), 0, 0, -0.2, 0, 1, [Math.PI / 2, 0]), 0.1, 0.4, '#ffffff', 4, 0.4),
  },
} satisfies Record<string, PropDef>);

export const citizenKinds = skins.map((_, i) => `person-${i}`);
export const walkerKinds = skins.map((_, i) => `walker-${i}`);
