import * as THREE from 'three';
import { local, type Tone } from '../kit';
import { mast, windmill, windmillSails, turbine } from '../parts';
import type { PropDef, PropMeshers } from './library';

const at = () => new THREE.Matrix4();
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Rows of windows on the four walls of a box; lit windows glow, dark ones read as glass. */
function windows(
  p: PropMeshers,
  m: THREE.Matrix4,
  w: number,
  h: number,
  d: number,
  lit: boolean,
  options: { floor?: number; base?: number; size?: number; colour?: Tone; band?: boolean } = {},
) {
  const floor = options.floor ?? 0.9,
    size = options.size ?? 0.34,
    base = options.base ?? 0.45;
  const mesh = lit ? p.glow : p.glass;
  const tone = lit ? (options.colour ?? '#ffdf9a') : '#3d5068';
  for (let y = base; y + size < h - 0.15; y += floor)
    for (const [face, span, offset] of [
      [0, w, d / 2],
      [Math.PI, w, d / 2],
      [Math.PI / 2, d, w / 2],
      [-Math.PI / 2, d, w / 2],
    ] as const) {
      const wall = local(m, 0, 0, 0, face);
      // Flat quads, one per window or one band per floor: facades stay cheap at city scale.
      if (options.band) {
        mesh.plate(local(wall, 0, y, offset + 0.012), span * 0.82, size, tone);
        continue;
      }
      const count = Math.max(1, Math.min(4, Math.floor(span / 0.75)));
      for (let i = 0; i < count; i++) {
        const x = -span / 2 + (span / count) * (i + 0.5);
        mesh.plate(local(wall, x, y, offset + 0.012), size, size, tone);
      }
    }
}

/** A gabled roof over a w × d footprint, ridge along x. */
function gable(p: PropMeshers, m: THREE.Matrix4, w: number, d: number, rise: number, roof: Tone) {
  const q = (x: number, y: number, z: number) => v(x, y, z).applyMatrix4(m);
  const ew = w / 2 + 0.12,
    ed = d / 2 + 0.14;
  const [a, b, c, e] = [q(-ew, 0, ed), q(ew, 0, ed), q(ew, 0, -ed), q(-ew, 0, -ed)];
  const [r1, r2] = [q(-ew, rise, 0), q(ew, rise, 0)];
  p.base.quad(a, b, r2, r1, roof);
  p.base.quad(c, e, r1, r2, roof);
  p.tint.tri(q(w / 2, 0, d / 2), q(w / 2, 0, -d / 2), q(w / 2, rise, 0), '#ffffff');
  p.tint.tri(q(-w / 2, 0, -d / 2), q(-w / 2, 0, d / 2), q(-w / 2, rise, 0), '#ffffff');
}

function door(p: PropMeshers, m: THREE.Matrix4, z: number, tone: Tone = '#5a3f2a') {
  p.base.box(local(m, 0, 0, z + 0.01), 0.5, 0.9, 0.04, tone);
}

function house(p: PropMeshers, roof: Tone, lit: boolean, w = 2.6, d = 2.2, h = 1.7) {
  const o = at();
  p.tint.box(o, w, h, d, '#ffffff');
  gable(p, local(o, 0, h, 0), w, d, 1.0, roof);
  door(p, o, d / 2);
  windows(p, o, w, h, d, lit, { floor: 2, base: 0.55, size: 0.4 });
  p.base.box(local(o, w * 0.28, h + 0.3, -0.3), 0.3, 0.8, 0.3, '#8a5a44');
}

function block(
  p: PropMeshers,
  w: number,
  h: number,
  d: number,
  lit: boolean,
  roof = '#6c6f76',
  band = false,
) {
  const o = at();
  p.tint.box(o, w, h, d, '#ffffff', '#ffffff');
  p.base.box(local(o, 0, h, 0), w * 0.98, 0.12, d * 0.98, roof);
  windows(p, o, w, h, d, lit, { band });
  door(p, o, d / 2, '#2e3138');
}

const buildingDefs: Record<string, PropDef> = {};
const pair = (name: string, tint: Tone, build: (p: PropMeshers, lit: boolean) => void) => {
  buildingDefs[name] = { tint, build: (p) => build(p, true) };
  buildingDefs[`${name}-dark`] = { tint, build: (p) => build(p, false) };
};

pair('house', '#efe4cf', (p, lit) => house(p, '#b5523b', lit));
pair('house-slate', '#e3e6e8', (p, lit) => house(p, '#4f5866', lit));
pair('house-brown', '#d9c3a0', (p, lit) => house(p, '#7a5236', lit, 2.2, 2.0, 1.5));
pair('house-flat', '#f2efe8', (p, lit) => {
  const o = at();
  p.tint.box(o, 2.8, 2.0, 2.4, '#ffffff');
  p.base.box(local(o, 0, 2.0, 0), 2.9, 0.15, 2.5, '#9aa0a6');
  windows(p, o, 2.8, 2.0, 2.4, lit, { floor: 2, base: 0.6, size: 0.45 });
  door(p, o, 1.2);
});
pair('cottage', '#efe6d2', (p, lit) => {
  const o = at();
  p.tint.box(o, 2.2, 1.4, 1.9, '#ffffff');
  gable(p, local(o, 0, 1.4, 0), 2.2, 1.9, 1.1, '#c9a85a');
  door(p, o, 0.95);
  windows(p, o, 2.2, 1.4, 1.9, lit, { floor: 2, base: 0.45, size: 0.35, colour: '#ffcf7a' });
  p.base.box(local(o, -0.7, 1.6, 0.2), 0.3, 0.9, 0.3, '#8a7a6a');
});
pair('apartment', '#d9d4c8', (p, lit) => block(p, 3, 5, 3, lit));
pair('apartment-wide', '#c9cdd2', (p, lit) => block(p, 5, 3.6, 3, lit));
pair('block', '#9a9ca1', (p, lit) => block(p, 3, 3.2, 3, lit, '#5d6068', true));
pair('block-tall', '#8d9096', (p, lit) => block(p, 3, 6.4, 3, lit, '#5d6068', true));
pair('tower', '#c9ccd2', (p, lit) => {
  const o = at();
  block(p, 3.2, 5.5, 3.2, lit);
  p.tint.box(local(o, 0, 5.6, 0), 2.4, 2.2, 2.4, '#ffffff');
  windows(p, local(o, 0, 5.6, 0), 2.4, 2.2, 2.4, lit);
  p.metal.prism(local(o, 0, 7.8, 0), 0.06, 0.03, 1.2, 4, '#9aa0a6');
});
pair('skyscraper', '#8fb4d0', (p, lit) => {
  const o = at();
  p.glass.box(o, 3.6, 9, 3.6, '#5d7f9e', '#3d5068');
  for (let y = 1.2; y < 9; y += 1.5)
    (lit ? p.glow : p.metal).box(local(o, 0, y, 0), 3.66, 0.12, 3.66, lit ? '#ffe6a8' : '#c9cdd2');
  p.tint.box(local(o, 0, 9, 0), 2.6, 1.2, 2.6, '#ffffff');
  p.metal.prism(local(o, 0, 10.2, 0), 0.25, 0, 1.8, 4, '#d9dde2');
});
pair('factory', '#b7aea0', (p, lit) => {
  const o = at();
  p.tint.box(o, 6, 2.5, 4, '#ffffff');
  for (let i = 0; i < 4; i++) {
    const x = -2.25 + i * 1.5;
    const q = (dx: number, y: number, z: number) => v(x + dx, 2.5 + y, z);
    p.base.quad(q(-0.75, 0, 2), q(0.75, 0, 2), q(0.75, 0, -2), q(-0.75, 0, -2), '#6c6f76');
    p.base.quad(q(-0.75, 0, -2), q(-0.75, 0, 2), q(-0.75, 1, 2), q(-0.75, 1, -2), '#8a9097');
    p.glass.quad(q(0.75, 0, 2), q(0.75, 0, -2), q(-0.75, 1, -2), q(-0.75, 1, 2), '#7f9ab5');
    p.base.tri(q(0.75, 0, 2), q(-0.75, 1, 2), q(-0.75, 0, 2), '#8a9097');
    p.base.tri(q(0.75, 0, -2), q(-0.75, 0, -2), q(-0.75, 1, -2), '#8a9097');
  }
  for (const x of [-1.8, 1.6]) {
    p.base.prism(local(o, x, 0, -1.2), 0.35, 0.28, 6, 8, '#8a5a44');
    p.base.blob(local(o, x + 0.2, 6.6, -1.2), 0.6, '#c9c6c0', 0.3, 5);
  }
  if (lit) p.glow.box(local(o, 0, 0.5, 2.01), 3.5, 0.5, 0.02, '#ffd27a');
});
pair('warehouse', '#a7b0b8', (p, lit) => {
  const o = at();
  p.tint.box(o, 5, 2.2, 3.4, '#ffffff');
  p.base.box(local(o, 0, 2.2, 0), 5.1, 0.5, 3.5, '#6c6f76');
  p.base.box(local(o, 0, 0, 1.71), 1.8, 1.6, 0.04, '#4a4f58');
  if (lit) p.glow.box(local(o, 1.8, 1.4, 1.72), 0.4, 0.3, 0.02, '#ffdf9a');
});
pair('barn', '#b5442f', (p, lit) => {
  const o = at();
  p.tint.box(o, 3, 2.2, 4, '#ffffff');
  gable(p, local(o, 0, 2.2, 0, Math.PI / 2), 4, 3, 1.4, '#5a5250');
  p.base.box(local(o, 0, 0, 2.01), 1.4, 1.6, 0.04, '#f2efe6');
  if (lit) p.glow.box(local(o, 0, 1.75, 2.02), 0.4, 0.3, 0.02, '#ffcf7a');
});
pair('hall', '#ece4d4', (p, lit) => {
  const o = at();
  p.base.box(o, 5, 0.3, 4, '#c9c3b5');
  p.tint.box(local(o, 0, 0.3, -0.4), 4.2, 2.6, 3, '#ffffff');
  for (let i = 0; i < 5; i++)
    p.tint.prism(local(o, -1.8 + i * 0.9, 0.3, 1.5), 0.14, 0.14, 2.6, 6, '#ffffff');
  gable(p, local(o, 0, 2.9, 0.1), 4.4, 3.8, 1.0, '#8a8f96');
  p.metal.dome(local(o, 0, 3.6, -0.4), 0.9, '#d9b24a', 8, 2);
  if (lit)
    windows(p, local(o, 0, 0.3, -0.4), 4.2, 2.6, 3, true, { floor: 3, base: 0.8, size: 0.5 });
});
pair('greenhouse', '#ffffff', (p, lit) => {
  const o = at();
  p.base.box(o, 3.2, 0.3, 4.2, '#c9c3b5');
  p.glass.box(local(o, 0, 0.3, 0), 3, 1.2, 4, '#bfe3ea', '#cdeef2');
  gable(p, local(o, 0, 1.5, 0, Math.PI / 2), 4, 3, 0.8, '#cdeef2');
  for (let i = 0; i < 4; i++)
    p.tint.blob(local(o, -0.8 + (i % 2) * 1.6, 0.6, -1.2 + i * 0.8), 0.35, '#5fa84a', 0.3, i);
  if (lit) p.glow.box(local(o, 0, 1.4, 0), 0.2, 0.1, 3, '#fff2c8');
});
pair('dome-house', '#f2efe6', (p, lit) => {
  const o = at();
  p.tint.dome(o, 1.5, '#ffffff', 9, 2);
  p.glass.dome(local(o, 0, 0.02, 0), 0.7, '#9fd6e8', 7, 1, 1.9);
  p.base.box(local(o, 0, 0, 1.35), 0.6, 0.9, 0.3, '#7a6a5a');
  if (lit) p.glow.box(local(o, 0, 0.6, 1.5), 0.3, 0.3, 0.02, '#ffe2a0');
});
pair('solar-house', '#f6f4ee', (p, lit) => {
  const o = at();
  p.tint.box(o, 3, 1.8, 2.4, '#ffffff');
  p.base.box(local(o, 0, 1.8, 0), 3.1, 0.15, 2.5, '#6fbf61');
  p.glass.panel(local(o, -0.6, 2.15, 0, 0, 1, [0.4, 0]), 1.4, 1.6, '#2f5d9a', '#c9cdd2');
  p.metal.prism(local(o, 1.1, 1.95, 0.6), 0.05, 0.03, 1.2, 4, '#e3b84b');
  windows(p, o, 3, 1.8, 2.4, lit, { floor: 2, base: 0.55, size: 0.5 });
  door(p, o, 1.2, '#7a5a3a');
});
pair('shanty', '#a89a84', (p, lit) => {
  const o = at();
  p.tint.box(o, 1.6, 1.1, 1.4, '#ffffff');
  p.base.box(local(o, 0.1, 1.1, 0, 0.1, 1, [0.08, 0]), 1.9, 0.08, 1.7, '#8a4a32');
  p.tint.box(local(o, 1.1, 0, -0.2, 0.3), 1.0, 0.9, 1.0, '#ffffff');
  p.base.box(local(o, 1.1, 0.9, -0.2, 0.3, 1, [0, -0.1]), 1.2, 0.06, 1.2, '#6a6a70');
  if (lit) p.glow.box(local(o, -0.3, 0.5, 0.71), 0.3, 0.25, 0.02, '#ffb45a');
});
pair('bunker', '#6f6560', (p, lit) => {
  const o = at();
  p.tint.prism(o, 1.6, 1.2, 0.9, 6, '#ffffff');
  p.base.box(local(o, 0, 0, 1.25), 0.9, 0.75, 0.6, '#4a4e55');
  if (lit) p.glow.box(local(o, 0, 0.6, 1.56), 0.6, 0.06, 0.02, '#ffcf7a');
});

Object.assign(buildingDefs, {
  hut: {
    tint: '#b38a5a',
    build: (p) => {
      const o = at();
      p.tint.prism(o, 1.0, 1.0, 0.9, 8, '#ffffff');
      p.base.prism(local(o, 0, 0.9, 0), 1.25, 0, 1.2, 8, '#c9a85a');
      p.base.box(local(o, 0, 0, 0.95), 0.45, 0.7, 0.1, '#3a2a1a');
    },
  },
  tent: {
    tint: '#c4955f',
    build: (p) => {
      const o = at();
      p.tint.prism(o, 0.95, 0, 1.7, 7, '#ffffff');
      p.base.prism(local(o, 0, 1.5, 0), 0.04, 0.02, 0.5, 3, '#5a3d28');
      p.base.box(local(o, 0, 0, 0.82), 0.4, 0.6, 0.04, '#3a2a1a');
    },
  },
  yurt: {
    tint: '#e8dcc4',
    build: (p) => {
      const o = at();
      p.tint.prism(o, 1.2, 1.2, 0.8, 10, '#ffffff');
      p.tint.prism(local(o, 0, 0.8, 0), 1.25, 0.2, 0.6, 10, '#ffffff', '#8a5a3a');
      p.base.box(local(o, 0, 0, 1.18), 0.5, 0.65, 0.06, '#b5442f');
    },
  },
  campfire: {
    build: (p) => {
      const o = at();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        p.base.blob(local(o, Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3), 0.09, '#8a8580', 0.3, i);
      }
      p.base.beam(v(-0.2, 0.05, 0), v(0.2, 0.15, 0.05), 0.04, '#5a3d28');
      p.glow.gem(local(o, 0, 0.05, 0), 0.16, 0.45, '#ff9a3a', 5, 0.3);
      p.glow.gem(local(o, 0.05, 0.05, 0.04), 0.08, 0.3, '#ffe08a', 4, 0.3);
    },
  },
  totem: {
    tint: '#9a6a3a',
    build: (p) => {
      const o = at();
      for (let i = 0; i < 3; i++)
        p.tint.box(local(o, 0, i * 0.7, 0, i * 0.3), 0.45, 0.68, 0.45, '#ffffff');
      p.base.box(local(o, 0, 2.1, 0), 1.2, 0.12, 0.25, '#c4955f');
      p.base.box(local(o, 0, 1.6, 0.23), 0.3, 0.12, 0.04, '#e8dcc4');
    },
  },
  market: {
    tint: '#d0493a',
    build: (p) => {
      const o = at();
      for (let i = 0; i < 3; i++) {
        const s = local(o, (i - 1) * 1.4, 0, 0);
        p.base.box(s, 1.1, 0.7, 0.8, '#8a6a4a');
        for (const [x, z] of [
          [-0.5, -0.4],
          [0.5, -0.4],
          [0.5, 0.4],
          [-0.5, 0.4],
        ])
          p.base.prism(local(s, x, 0, z), 0.03, 0.03, 1.4, 3, '#5a3d28');
        p.tint.prism(local(s, 0, 1.4, 0, Math.PI / 4), 0.85, 0, 0.45, 4, '#ffffff');
        p.base.box(local(s, 0, 0.7, 0), 0.9, 0.12, 0.6, ['#e0a52e', '#7fbf5a', '#d0493a'][i]);
      }
    },
  },
  fountain: {
    build: (p) => {
      const o = at();
      p.base.prism(o, 1.0, 1.0, 0.3, 10, '#c9c3b5');
      p.glass.prism(local(o, 0, 0.28, 0), 0.85, 0.85, 0.03, 10, '#6fb8d8');
      p.base.prism(local(o, 0, 0.3, 0), 0.15, 0.12, 0.7, 6, '#c9c3b5');
      p.glass.gem(local(o, 0, 0.95, 0), 0.25, 0.4, '#bfe9ff', 6, 0.3);
    },
  },
  statue: {
    tint: '#b9a77a',
    build: (p) => {
      const o = at();
      p.base.box(o, 1.0, 0.8, 1.0, '#c9c3b5');
      p.tint.prism(local(o, 0, 0.8, 0), 0.22, 0.15, 1.2, 6, '#ffffff');
      p.tint.gem(local(o, 0, 1.95, 0), 0.18, 0.35, '#ffffff', 6);
      p.tint.box(local(o, 0.25, 1.5, 0, 0, 1, [0, -0.6]), 0.1, 0.6, 0.1, '#ffffff');
    },
  },
  lamp: {
    build: (p) => {
      const o = at();
      p.base.prism(o, 0.05, 0.04, 2.2, 4, '#4a4f58');
      p.base.box(local(o, 0, 2.15, 0.15), 0.08, 0.06, 0.4, '#4a4f58');
      p.glow.box(local(o, 0, 2.05, 0.3), 0.18, 0.08, 0.18, '#ffe2a0');
    },
  },
  bench: {
    tint: '#8a6a4a',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, 0, 0.4, 0), 1.2, 0.08, 0.35, '#ffffff');
      p.tint.box(local(o, 0, 0.45, -0.16), 1.2, 0.4, 0.06, '#ffffff');
      for (const x of [-0.5, 0.5]) p.base.box(local(o, x, 0, 0), 0.08, 0.4, 0.3, '#3a3d44');
    },
  },
  fence: {
    tint: '#9a7a5a',
    build: (p) => {
      const o = at();
      for (const x of [-1, 0, 1]) p.tint.box(local(o, x, 0, 0), 0.1, 0.8, 0.1, '#ffffff');
      for (const y of [0.3, 0.65]) p.tint.box(local(o, 0, y, 0), 2.1, 0.06, 0.05, '#ffffff');
    },
  },
  wall: {
    tint: '#8a857d',
    build: (p) => {
      p.tint.box(at(), 4, 1.6, 0.4, '#ffffff', '#ffffff');
      p.base.box(local(at(), 0, 1.6, 0), 4, 0.15, 0.55, '#6c6f76');
    },
  },
  well: {
    build: (p) => {
      const o = at();
      p.base.prism(o, 0.5, 0.5, 0.6, 8, '#9a958a', '#3a5068');
      for (const x of [-0.45, 0.45]) p.base.box(local(o, x, 0.6, 0), 0.08, 0.9, 0.08, '#6a4a2a');
      gable({ ...p, tint: p.base } as PropMeshers, local(o, 0, 1.5, 0), 1.1, 0.7, 0.4, '#7a5236');
    },
  },
  haystack: {
    build: (p) => p.base.dome(local(at(), 0, 0, 0), 0.8, '#d8c06a', 7, 2, 1.1),
  },
  silo: {
    tint: '#d9dde2',
    build: (p) => {
      const o = at();
      p.metal.prism(o, 0.85, 0.85, 3.6, 10, '#ffffff');
      p.metal.dome(local(o, 0, 3.6, 0), 0.85, '#ffffff', 10, 2, 0.6);
    },
  },
  'water-tower': {
    tint: '#c9cdd2',
    build: (p) => {
      const o = at();
      for (const [x, z] of [
        [-0.6, -0.6],
        [0.6, -0.6],
        [0.6, 0.6],
        [-0.6, 0.6],
      ])
        p.base.beam(v(x, 0, z), v(x * 0.6, 3, z * 0.6), 0.06, '#6c6f76');
      p.metal.prism(local(o, 0, 3, 0), 1.0, 1.0, 1.4, 10, '#ffffff');
      p.metal.prism(local(o, 0, 4.4, 0), 1.0, 0, 0.5, 10, '#ffffff');
    },
  },
  lighthouse: {
    build: (p) => {
      const o = at();
      p.base.prism(o, 0.8, 0.55, 1.6, 8, '#f2efe6');
      p.base.prism(local(o, 0, 1.6, 0), 0.55, 0.45, 1.6, 8, '#c4452f');
      p.base.prism(local(o, 0, 3.2, 0), 0.45, 0.4, 1.4, 8, '#f2efe6');
      p.base.prism(local(o, 0, 4.6, 0), 0.55, 0.55, 0.1, 8, '#3a3d44');
      p.glow.prism(local(o, 0, 4.7, 0), 0.32, 0.32, 0.5, 8, '#fff2a8');
      p.base.prism(local(o, 0, 5.2, 0), 0.45, 0, 0.45, 8, '#c4452f');
    },
  },
  dock: {
    build: (p) => {
      const o = at();
      p.base.box(local(o, 0, 0.25, 0), 1.6, 0.12, 6, '#8a6a4a');
      for (let i = 0; i < 4; i++)
        for (const x of [-0.7, 0.7])
          p.base.prism(local(o, x, -0.6, -2.6 + i * 1.7), 0.08, 0.08, 0.95, 4, '#5a3d28');
    },
  },
  'harbor-crane': {
    tint: '#e0a830',
    build: (p) => {
      const o = at();
      for (const [x, z] of [
        [-0.8, -0.8],
        [0.8, -0.8],
        [0.8, 0.8],
        [-0.8, 0.8],
      ])
        p.metal.beam(v(x, 0, z), v(x * 0.5, 4, z * 0.5), 0.08, '#ffffff');
      p.metal.box(local(o, 0, 4, 0), 1.2, 0.8, 1.2, '#ffffff');
      p.metal.beam(v(0, 4.6, -1.5), v(0, 4.6, 5.5), 0.12, '#ffffff');
      p.base.beam(v(0, 4.6, 4.8), v(0, 2.2, 4.8), 0.02, '#3a3d44');
      p.base.box(local(o, 0, 1.8, 4.8), 0.6, 0.4, 0.6, '#3d6fb5');
    },
  },
  containers: {
    build: (p) => {
      const o = at();
      const tones = ['#c4452f', '#3d6fb5', '#e0a830', '#2e9e6e', '#8a8f96'];
      for (let i = 0; i < 9; i++)
        p.base.box(
          local(o, (i % 3) * 1.1 - 1.1, Math.floor(i / 3) * 0.55, 0),
          1.0,
          0.5,
          2.4,
          tones[i % 5],
        );
    },
  },
  pylon: {
    tint: '#9aa0a6',
    build: (p) => {
      const o = at();
      mast(p.metal, o, 6, '#ffffff');
      p.metal.box(local(o, 0, 4.8, 0), 3.2, 0.12, 0.12, '#ffffff');
      p.metal.box(local(o, 0, 5.6, 0), 2.2, 0.12, 0.12, '#ffffff');
    },
  },
  'radio-mast': {
    tint: '#c9c3b5',
    build: (p) => {
      const o = at();
      mast(p.metal, o, 7, '#ffffff');
      p.glow.box(local(o, 0, 7, 0), 0.2, 0.2, 0.2, '#ff5a3a');
      p.metal.dome(local(o, 0.6, 3.5, 0, 0, 1, [0, Math.PI / 2]), 0.6, '#ffffff', 8, 1, 0.3);
    },
  },
  'solar-array': {
    build: (p) => {
      const o = at();
      for (let i = 0; i < 3; i++) {
        const row = local(o, 0, 0, (i - 1) * 1.4);
        for (const x of [-1.2, 1.2]) p.base.box(local(row, x, 0, 0), 0.08, 0.6, 0.08, '#6c6f76');
        p.glass.panel(local(row, 0, 0.7, 0, 0, 1, [0.5, 0]), 3, 1.1, '#2a4f8a', '#9aa0a6');
      }
    },
  },
  windmill: {
    build: (p) => windmill(p.base, at(), 3.2, '#efe6d2', '#8a5a3a'),
  },
  'windmill-body': {
    build: (p) => windmill(p.base, at(), 3.2, '#efe6d2', '#8a5a3a', false),
  },
  'windmill-sails': {
    build: (p) => windmillSails(p.base, at(), 3.2, '#e9dcc0'),
  },
  turbine: {
    build: (p) => turbine(p.base, at(), 6, '#f3f5f4'),
  },
  'oil-tank': {
    tint: '#d9dde2',
    build: (p) => {
      const o = at();
      p.metal.prism(o, 1.6, 1.6, 1.6, 12, '#ffffff', '#c9cdd2');
      p.base.beam(v(1.6, 0, 0), v(0.9, 1.6, 1.3), 0.05, '#4a4f58');
    },
  },
  derrick: {
    tint: '#d9c24a',
    build: (p) => {
      const o = at();
      mast(p.metal, o, 5, '#ffffff');
      p.base.box(local(o, 1.4, 0, 0), 1.6, 0.6, 0.8, '#3a3d44');
      p.base.box(local(o, 1.4, 0.9, 0, 0, 1, [0, 0.3]), 2, 0.2, 0.2, '#c4452f');
    },
  },
  billboard: {
    tint: '#d0493a',
    build: (p) => {
      const o = at();
      for (const x of [-1, 1]) p.base.prism(local(o, x, 0, 0), 0.08, 0.08, 2.4, 4, '#4a4f58');
      p.tint.box(local(o, 0, 2.4, 0), 3, 1.5, 0.15, '#ffffff');
      p.glow.box(local(o, 0, 2.6, 0.08), 2.6, 1.1, 0.02, '#fff2c8');
    },
  },
  checkpoint: {
    tint: '#5d6168',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, -1.4, 0, 0), 1.2, 1.8, 1.2, '#ffffff');
      p.glass.box(local(o, -1.4, 0.9, 0.61), 0.8, 0.5, 0.02, '#7f9ab5');
      p.base.box(local(o, 0.4, 0.9, 0), 2.6, 0.12, 0.12, '#e0a830');
      p.glow.box(local(o, -1.4, 1.8, 0), 0.2, 0.2, 0.2, '#ff3b30');
    },
  },
  surveillance: {
    tint: '#5d6168',
    build: (p) => {
      const o = at();
      p.tint.prism(o, 0.09, 0.06, 4.2, 5, '#ffffff');
      p.base.box(local(o, 0, 4.0, 0.3), 0.3, 0.25, 0.6, '#2a2d33');
      p.glow.box(local(o, 0, 4.05, 0.62), 0.12, 0.12, 0.04, '#ff3b30');
    },
  },
  screen: {
    tint: '#3a3e45',
    build: (p) => {
      const o = at();
      p.tint.box(o, 0.5, 4, 0.5, '#ffffff');
      p.tint.box(local(o, 0, 4, 0), 4.2, 2.6, 0.3, '#ffffff');
      p.glow.box(local(o, 0, 4.2, 0.16), 3.8, 2.2, 0.02, '#ff8a4a');
      p.base.dome(local(o, 0, 5.2, 0.18), 0.5, '#ffd9a0', 8, 1, 0.01);
    },
  },
  drone: {
    tint: '#3a3e45',
    build: (p) => {
      const o = at();
      p.tint.box(o, 0.5, 0.18, 0.5, '#ffffff');
      for (const [x, z] of [
        [-0.4, -0.4],
        [0.4, -0.4],
        [0.4, 0.4],
        [-0.4, 0.4],
      ])
        p.base.prism(local(o, x, 0.18, z), 0.22, 0.22, 0.02, 6, '#9aa0a6');
      p.glow.box(local(o, 0, -0.05, 0.26), 0.1, 0.06, 0.02, '#ff3b30');
    },
  },
  'cooling-tower': {
    tint: '#b9bfc5',
    build: (p) => {
      const o = at();
      p.tint.prism(o, 2.2, 1.4, 3.2, 12, '#ffffff');
      p.tint.prism(local(o, 0, 3.2, 0), 1.4, 1.7, 2.0, 12, '#ffffff', '#3d4247');
      p.base.blob(local(o, 0, 5.8, 0), 1.6, '#d4d6b0', 0.3, 7);
    },
  },
  'pressure-tank': {
    tint: '#9aa6b1',
    build: (p) => {
      const o = at();
      p.metal.prism(o, 1.0, 1.0, 2.4, 10, '#ffffff');
      p.metal.dome(local(o, 0, 2.4, 0), 1.0, '#ffffff', 10, 2, 0.6);
      p.base.box(local(o, 0, 1.0, 1.0), 0.5, 0.2, 0.3, '#b48a4a');
      p.glow.box(local(o, 0.7, 2.4, 0.7), 0.15, 0.15, 0.15, '#ffb03a');
    },
  },
  'pipe-rack': {
    build: (p) => {
      const o = at();
      for (const z of [-2, 0, 2]) {
        for (const x of [-0.6, 0.6]) p.base.box(local(o, x, 0, z), 0.12, 1.4, 0.12, '#5f6874');
        p.base.box(local(o, 0, 1.4, z), 1.4, 0.12, 0.12, '#5f6874');
      }
      for (const x of [-0.3, 0.05, 0.4])
        p.base.beam(v(x, 1.6, -2.6), v(x, 1.6, 2.6), 0.13, x > 0 ? '#b48a4a' : '#8d98a3', 6);
    },
  },
  crane: {
    tint: '#e0a830',
    build: (p) => {
      const o = at();
      mast(p.metal, o, 8, '#ffffff');
      p.metal.box(local(o, 1.5, 8, 0), 6, 0.3, 0.3, '#ffffff');
      p.base.box(local(o, -1.4, 7.6, 0), 1.0, 0.6, 0.6, '#5d6168');
      p.base.beam(v(3.8, 8, 0), v(3.8, 5, 0), 0.02, '#3a3d44');
    },
  },
  'ruin-wall': {
    tint: '#7a7570',
    build: (p) => {
      const o = at();
      p.tint.box(local(o, -0.8, 0, 0), 1.4, 1.8, 0.3, '#ffffff');
      p.tint.box(local(o, 0.6, 0, 0), 1.0, 0.9, 0.3, '#ffffff');
      p.tint.box(local(o, 1.3, 0, 0.8, Math.PI / 2), 1.6, 1.3, 0.3, '#ffffff');
      for (let i = 0; i < 4; i++)
        p.base.blob(local(o, -1 + i * 0.7, 0.05, 0.6), 0.22, '#8a857d', 0.4, i);
    },
  },
  'ruin-tower': {
    tint: '#6d6a66',
    build: (p) => {
      const o = at();
      const lean = local(o, 0, 0, 0, 0.3, 1, [0.12, -0.08]);
      p.tint.box(lean, 2.6, 5, 2.6, '#ffffff');
      p.tint.box(local(lean, 0.3, 5, 0, 0.4, 1, [0.3, 0.2]), 1.6, 1.2, 1.8, '#ffffff');
      windows(p, lean, 2.6, 5, 2.6, false);
      for (let i = 0; i < 5; i++)
        p.base.blob(
          local(o, -1.5 + i * 0.8, 0.1, 1.8),
          0.35,
          i % 2 ? '#8a4a32' : '#7a7570',
          0.4,
          i,
        );
    },
  },
  scrap: {
    build: (p) => {
      const o = at();
      p.base.box(local(o, 0, 0, 0, 0.4, 1, [0.2, 0.1]), 1.4, 0.5, 0.8, '#8a4a32');
      p.base.box(local(o, 0.7, 0, 0.5, 1.1, 1, [0, 0.4]), 1.0, 0.4, 0.6, '#6a6a70');
      p.base.prism(local(o, -0.6, 0, 0.4, 0, 1, [Math.PI / 2, 0]), 0.3, 0.3, 0.9, 7, '#4a4e55');
    },
  },
  'broken-pylon': {
    tint: '#8a8580',
    build: (p) => {
      const o = local(at(), 0, 0, 0, 0, 1, [0.5, 0.1]);
      mast(p.metal, o, 5, '#ffffff');
    },
  },
  /** Space bases share one vocabulary: pressure domes, modules, pads, rockets and dishes. */
  'hab-dome': {
    tint: '#eef0f2',
    build: (p) => {
      const o = at();
      p.tint.prism(o, 2.2, 2.2, 0.4, 12, '#ffffff');
      p.glass.dome(local(o, 0, 0.4, 0), 2.0, '#9fd6e8', 12, 3);
      for (let i = 0; i < 4; i++)
        p.base.box(local(o, -0.9 + i * 0.6, 0.4, 0.2), 0.4, 0.6 + (i % 2) * 0.4, 0.4, '#d9d6cc');
      p.glow.prism(local(o, 0, 0.38, 0), 2.25, 2.25, 0.05, 12, '#fff2c8');
    },
  },
  'hab-module': {
    tint: '#e6e8ea',
    build: (p) => {
      const o = local(at(), 0, 0.8, -1.6, 0, 1, [Math.PI / 2, 0]);
      p.tint.prism(o, 0.8, 0.8, 3.2, 10, '#ffffff');
      for (const z of [0.2, 3.0]) p.base.prism(local(o, 0, z, 0), 0.85, 0.85, 0.15, 10, '#9aa0a6');
      p.glow.box(local(at(), 0.81, 0.9, 0), 0.02, 0.2, 1.6, '#fff2c8');
    },
  },
  'landing-pad': {
    build: (p) => {
      const o = at();
      p.base.prism(o, 3, 3, 0.15, 12, '#5d6168', '#6f747c');
      p.base.prism(local(o, 0, 0.15, 0), 1.6, 1.6, 0.01, 12, '#e0a830', '#e0a830');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        p.glow.box(
          local(o, Math.cos(a) * 2.8, 0.15, Math.sin(a) * 2.8),
          0.15,
          0.08,
          0.15,
          '#9fe0ff',
        );
      }
    },
  },
  rocket: {
    tint: '#eef0f2',
    build: (p) => {
      const o = at();
      p.tint.prism(local(o, 0, 0.6, 0), 0.5, 0.5, 4.2, 10, '#ffffff');
      p.tint.prism(local(o, 0, 4.8, 0), 0.5, 0, 1.4, 10, '#ffffff');
      p.base.prism(local(o, 0, 3.6, 0), 0.52, 0.52, 0.3, 10, '#2a2d33');
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        p.base.box(
          local(o, Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55, -a),
          0.06,
          1.4,
          0.6,
          '#c4452f',
        );
      }
      p.base.prism(o, 0.35, 0.45, 0.6, 8, '#3a3d44');
    },
  },
  dish: {
    tint: '#e6e8ea',
    build: (p) => {
      const o = at();
      p.base.prism(o, 0.3, 0.2, 1.6, 6, '#9aa0a6');
      p.tint.dome(local(o, 0, 1.9, 0, 0, 1, [Math.PI * 0.75, 0]), 1.2, '#ffffff', 10, 2, 0.35);
      p.base.beam(v(0, 1.8, 0), v(0, 2.2, 0.9), 0.04, '#9aa0a6');
    },
  },
  drill: {
    tint: '#e0a830',
    build: (p) => {
      const o = at();
      p.base.box(o, 2.4, 0.6, 2.4, '#5d6168');
      mast(p.metal, local(o, 0, 0.6, 0), 4.2, '#ffffff');
      p.base.prism(local(o, 0, 0.6, 0), 0.25, 0.25, 3.6, 6, '#8a8f96');
      p.base.blob(local(o, 1.6, 0.3, 0.8), 0.6, '#9a6a4a', 0.4, 3);
      p.glow.box(local(o, 0, 4.8, 0), 0.18, 0.18, 0.18, '#ffb03a');
    },
  },
  /** S5 biosynthetic living spaces. */
  'bio-pod': {
    tint: '#d35fc4',
    build: (p) => {
      const o = at();
      for (const [x, z, h, r] of [
        [0, 0, 1.6, 0.9],
        [1.1, 0.4, 1.0, 0.6],
        [-0.9, 0.6, 0.8, 0.55],
      ]) {
        p.base.prism(local(o, x, 0, z), 0.16, 0.1, h, 6, '#efe6f5');
        p.tint.dome(local(o, x, h - r * 0.3, z), r, '#ffffff', 8, 2, 1.25);
        p.glow.box(local(o, x, h + r * 0.5, z + r * 0.9), 0.2, 0.12, 0.02, '#b8fff0');
      }
    },
  },
  'bio-tower': {
    tint: '#8a62e0',
    build: (p) => {
      const o = at();
      p.base.prism(o, 0.9, 0.35, 6, 8, '#efe6f5');
      for (const y of [2.2, 3.6, 5.0])
        p.tint.dome(local(o, 0, y, 0), 1.0 - y * 0.08, '#ffffff', 8, 2, 0.5);
      p.tint.dome(local(o, 0, 6, 0), 0.8, '#ffffff', 8, 2, 1.4);
      p.glow.gem(local(o, 0, 7.0, 0), 0.15, 0.8, '#b8fff0', 5);
    },
  },
  /** S6 worker housing beside the machinery. */
  'worker-block': {
    tint: '#7d8894',
    build: (p) => {
      const o = at();
      p.tint.box(o, 4, 2.4, 2, '#ffffff');
      for (let i = 0; i < 5; i++)
        p.glass.box(local(o, -1.6 + i * 0.8, 1.2, 1.01), 0.3, 0.3, 0.02, '#3d5068');
      p.base.box(local(o, 0, 2.4, 0), 4.1, 0.15, 2.1, '#454c55');
      p.glow.box(local(o, 1.9, 2.2, 1.02), 0.15, 0.15, 0.02, '#ffb03a');
    },
  },
  /** S9 gifts and S10 restorers' architecture. */
  crystal: {
    build: (p) => {
      const o = at();
      p.glass.gem(o, 0.5, 3.4, '#bfe9ff', 5, 0.3);
      p.glass.gem(local(o, 0.6, 0, 0.2, 0, 1, [0, -0.35]), 0.25, 1.6, '#d7c9ff', 4, 0.3);
      p.glass.gem(local(o, -0.5, 0, -0.3, 0, 1, [0.3, 0.3]), 0.22, 1.3, '#d7c9ff', 4, 0.3);
    },
  },
  'eco-dome': {
    tint: '#e8dcc4',
    build: (p) => {
      const o = at();
      p.tint.prism(o, 1.6, 1.5, 0.6, 9, '#ffffff');
      p.base.dome(local(o, 0, 0.6, 0), 1.5, '#6aa84f', 9, 2, 0.8);
      p.base.box(local(o, 0, 0, 1.5), 0.5, 0.8, 0.2, '#7a5a3a');
      p.glass.box(local(o, 0.8, 0.3, 1.3, 0.5), 0.4, 0.3, 0.02, '#9fd6e8');
    },
  },
  longhouse: {
    tint: '#9a7a5a',
    build: (p) => {
      const o = at();
      p.tint.box(o, 5, 1.2, 2, '#ffffff');
      gable(p, local(o, 0, 1.2, 0), 5, 2, 1.1, '#6a8a4a');
      door(p, o, 1, '#4a3420');
    },
  },
} satisfies Record<string, PropDef>);

export const buildings = buildingDefs;
