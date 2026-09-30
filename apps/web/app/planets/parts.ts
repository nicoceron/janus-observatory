import * as THREE from 'three';
import { local, type Mesher, type Tone } from './kit';
import type { LayerBuilder } from './model';
import type { Random } from './random';

/** Reusable miniature parts. Every part stands on local y = 0 and is sized in planet radii. */

export function tree(
  mesh: Mesher,
  m: THREE.Matrix4,
  kind: 'pine' | 'round' | 'tall',
  leaf: Tone,
  size: number,
  trunk: Tone = '#6b4a32',
) {
  mesh.prism(m, size * 0.12, size * 0.1, size * 0.45, 4, trunk);
  if (kind === 'pine') {
    mesh.prism(local(m, 0, size * 0.3, 0), size * 0.42, 0, size * 0.7, 5, leaf);
    mesh.prism(local(m, 0, size * 0.62, 0), size * 0.3, 0, size * 0.55, 5, leaf);
  } else if (kind === 'tall') {
    mesh.gem(local(m, 0, size * 0.3, 0), size * 0.3, size * 1.2, leaf, 5, 0.45);
  } else {
    mesh.blob(local(m, 0, size * 0.62, 0), size * 0.36, leaf, 0.22, Math.round(size * 1e5));
  }
}

/** A house with a pitched roof along local x. */
export function house(
  mesh: Mesher,
  m: THREE.Matrix4,
  w: number,
  h: number,
  d: number,
  wall: Tone,
  roof: Tone,
) {
  mesh.box(m, w, h, d, wall);
  const p = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(m);
  const eave = w * 0.58,
    ridge = h + d * 0.55;
  const [a, b, c, e] = [
    p(-eave, h, d * 0.62),
    p(eave, h, d * 0.62),
    p(eave, h, -d * 0.62),
    p(-eave, h, -d * 0.62),
  ];
  const [r1, r2] = [p(-eave, ridge, 0), p(eave, ridge, 0)];
  mesh.quad(a, b, r2, r1, roof);
  mesh.quad(c, e, r1, r2, roof);
  mesh.tri(b, c, r2, wall);
  mesh.tri(e, a, r1, wall);
}

export function tent(mesh: Mesher, m: THREE.Matrix4, size: number, hide: Tone) {
  mesh.prism(m, size * 0.5, 0, size * 0.95, 6, hide);
  mesh.prism(local(m, 0, size * 0.8, 0), size * 0.04, size * 0.02, size * 0.35, 3, '#5a3d28');
}

/** A three-bladed wind turbine with its rotor facing local +z. */
export function turbine(mesh: Mesher, m: THREE.Matrix4, size: number, tone: Tone = '#f3f5f4') {
  mesh.prism(m, size * 0.05, size * 0.025, size, 5, tone);
  const hub = local(m, 0, size, size * 0.05);
  mesh.box(local(hub, 0, -size * 0.04, -size * 0.06), size * 0.07, size * 0.08, size * 0.16, tone);
  for (let i = 0; i < 3; i++) {
    const blade = local(hub, 0, 0, size * 0.03, 0, 1, [0, (i / 3) * Math.PI * 2]);
    mesh.box(blade, size * 0.05, size * 0.55, size * 0.012, tone);
  }
}

/** A traditional four-sailed windmill; sails can be built separately to turn. */
export function windmill(
  mesh: Mesher,
  m: THREE.Matrix4,
  size: number,
  wall: Tone,
  cap: Tone,
  withSails = true,
) {
  mesh.prism(m, size * 0.26, size * 0.18, size * 0.8, 6, wall);
  mesh.prism(local(m, 0, size * 0.8, 0), size * 0.21, 0, size * 0.28, 6, cap);
  if (withSails) windmillSails(mesh, local(m, 0, size * 0.78, size * 0.22), size, '#e9dcc0');
}

export function windmillSails(mesh: Mesher, hub: THREE.Matrix4, size: number, sail: Tone) {
  for (let i = 0; i < 4; i++) {
    const arm = local(hub, 0, 0, 0, 0, 1, [0, (i / 4) * Math.PI * 2 + Math.PI / 4]);
    mesh.box(arm, size * 0.03, size * 0.62, size * 0.02, '#6f5238');
    mesh.box(local(arm, size * 0.07, size * 0.14, 0), size * 0.12, size * 0.46, size * 0.012, sail);
  }
}

/** A lattice mast: four legs, cross bracing and an optional light on top. */
export function mast(mesh: Mesher, m: THREE.Matrix4, h: number, tone: Tone) {
  const w = h * 0.09;
  const leg = (x: number, z: number) =>
    mesh.beam(
      new THREE.Vector3(x * w, 0, z * w).applyMatrix4(m),
      new THREE.Vector3(x * w * 0.25, h, z * w * 0.25).applyMatrix4(m),
      h * 0.012,
      tone,
    );
  leg(1, 1);
  leg(-1, 1);
  leg(-1, -1);
  leg(1, -1);
  for (let s = 1; s < 4; s++) {
    const t = s / 4,
      k = w * (1 - t * 0.75);
    const y = h * t;
    const c = [
      [k, k],
      [-k, k],
      [-k, -k],
      [k, -k],
    ].map(([x, z]) => new THREE.Vector3(x, y, z).applyMatrix4(m));
    for (let i = 0; i < 4; i++) mesh.beam(c[i], c[(i + 1) % 4], h * 0.008, tone);
  }
}

/** A tall spire: tapered shaft, observation ring and pointed crown. */
export function spire(mesh: Mesher, m: THREE.Matrix4, h: number, body: Tone, ring: Tone) {
  mesh.prism(m, h * 0.08, h * 0.045, h * 0.8, 6, body);
  mesh.prism(local(m, 0, h * 0.62, 0), h * 0.11, h * 0.11, h * 0.05, 8, ring);
  mesh.prism(local(m, 0, h * 0.8, 0), h * 0.045, 0, h * 0.2, 6, body);
}

/** A storage tank with a domed cap. */
export function tank(mesh: Mesher, m: THREE.Matrix4, r: number, h: number, tone: Tone) {
  mesh.prism(m, r, r, h, 8, tone);
  mesh.dome(local(m, 0, h, 0), r, tone, 8, 1, 0.5);
}

/** A cooling stack: a waisted frustum pair. */
export function stack(mesh: Mesher, m: THREE.Matrix4, r: number, h: number, tone: Tone) {
  mesh.prism(m, r, r * 0.68, h * 0.6, 8, tone);
  mesh.prism(local(m, 0, h * 0.6, 0), r * 0.68, r * 0.8, h * 0.4, 8, tone, '#3d4247');
}

/** A cluster of wide boulders. */
export function rocks(
  mesh: Mesher,
  m: THREE.Matrix4,
  size: number,
  tone: Tone,
  random: Random,
  count = 3,
) {
  for (let i = 0; i < count; i++)
    mesh.blob(
      local(m, random.range(-1, 1) * size, size * 0.2, random.range(-1, 1) * size),
      size * random.range(0.35, 0.6),
      tone,
      0.3,
      random.int(1, 1e6),
    );
}

/** Surface layers accept a builder so parts can add glow, sheen and solid pieces at once. */
export function lamp(layer: LayerBuilder, m: THREE.Matrix4, size: number, tone: Tone) {
  layer.glow.gem(m, size, size * 1.6, tone, 4, 0.5);
}
