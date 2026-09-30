import * as THREE from 'three';
import { rng, type Random } from './random';

export type Tone = THREE.ColorRepresentation;

const va = new THREE.Vector3(),
  vb = new THREE.Vector3(),
  vc = new THREE.Vector3(),
  vd = new THREE.Vector3();
const scratch = new THREE.Color();

/**
 * Accumulates flat, vertex-coloured triangles. Every primitive is authored in a local frame
 * (base on y = 0, up = +y) and placed with a matrix, so one draw call can hold a whole district.
 */
export class Mesher {
  private position: number[] = [];
  private color: number[] = [];
  private random: Random;
  /** Per-triangle lightness jitter, the signature of hand-painted low-poly surfaces. */
  variance: number;

  constructor(seed = 1, variance = 0.035) {
    this.random = rng(seed);
    this.variance = variance;
  }

  get triangles() {
    return this.position.length / 9;
  }

  private paint(tone: Tone) {
    scratch.set(tone);
    if (this.variance > 0) scratch.offsetHSL(0, 0, (this.random() - 0.5) * this.variance);
    return scratch;
  }

  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, tone: Tone) {
    const colour = this.paint(tone);
    this.position.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (let i = 0; i < 3; i++) this.color.push(colour.r, colour.g, colour.b);
  }

  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, tone: Tone) {
    this.tri(a, b, c, tone);
    // Both halves share one colour so a quad reads as a plane, not two jittered triangles.
    const [r, g, blue] = this.color.slice(-3);
    this.position.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    this.color.push(r, g, blue, r, g, blue, r, g, blue);
  }

  private ring(m: THREE.Matrix4, radius: number, y: number, sides: number, turn = 0) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < sides; i++) {
      const a = turn + (i / sides) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius).applyMatrix4(m));
    }
    return points;
  }

  /** A box standing on y = 0. The hidden base is omitted. */
  box(m: THREE.Matrix4, w: number, h: number, d: number, tone: Tone, top: Tone = tone) {
    const x = w / 2,
      z = d / 2;
    const p = (px: number, py: number, pz: number) => new THREE.Vector3(px, py, pz).applyMatrix4(m);
    const [a, b, c, e] = [p(-x, 0, z), p(x, 0, z), p(x, 0, -z), p(-x, 0, -z)];
    const [a2, b2, c2, e2] = [p(-x, h, z), p(x, h, z), p(x, h, -z), p(-x, h, -z)];
    this.quad(a, b, b2, a2, tone);
    this.quad(b, c, c2, b2, tone);
    this.quad(c, e, e2, c2, tone);
    this.quad(e, a, a2, e2, tone);
    this.quad(a2, b2, c2, e2, top);
  }

  /** A cylinder, frustum or cone (topRadius 0) standing on y = 0. */
  prism(
    m: THREE.Matrix4,
    radius: number,
    topRadius: number,
    h: number,
    sides: number,
    tone: Tone,
    top: Tone = tone,
    turn = 0,
  ) {
    const low = this.ring(m, radius, 0, sides, turn);
    if (topRadius <= 0) {
      const apex = new THREE.Vector3(0, h, 0).applyMatrix4(m);
      for (let i = 0; i < sides; i++) this.tri(low[i], apex, low[(i + 1) % sides], tone);
      return;
    }
    const high = this.ring(m, topRadius, h, sides, turn);
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      this.quad(low[i], high[i], high[j], low[j], tone);
    }
    const centre = new THREE.Vector3(0, h, 0).applyMatrix4(m);
    for (let i = 0; i < sides; i++) this.tri(centre, high[(i + 1) % sides], high[i], top);
  }

  /** A faceted hemisphere resting on y = 0. */
  dome(m: THREE.Matrix4, radius: number, tone: Tone, sides = 7, rings = 2, squash = 1) {
    let lower = this.ring(m, radius, 0, sides);
    for (let r = 1; r <= rings; r++) {
      const a = (r / (rings + 1)) * (Math.PI / 2);
      const upper = this.ring(m, Math.cos(a) * radius, Math.sin(a) * radius * squash, sides);
      for (let i = 0; i < sides; i++) {
        const j = (i + 1) % sides;
        this.quad(lower[i], upper[i], upper[j], lower[j], tone);
      }
      lower = upper;
    }
    const apex = new THREE.Vector3(0, radius * squash, 0).applyMatrix4(m);
    for (let i = 0; i < sides; i++) this.tri(lower[i], apex, lower[(i + 1) % sides], tone);
  }

  /** A bipyramid crystal from y = 0 to y = h, widest at `waist`. */
  gem(m: THREE.Matrix4, radius: number, h: number, tone: Tone, sides = 4, waist = 0.35) {
    const mid = this.ring(m, radius, h * waist, sides, Math.PI / sides);
    const low = new THREE.Vector3(0, 0, 0).applyMatrix4(m),
      high = new THREE.Vector3(0, h, 0).applyMatrix4(m);
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      this.tri(mid[i], high, mid[j], tone);
      this.tri(mid[j], low, mid[i], tone);
    }
  }

  /** A faceted torus in the local xz plane, centred on the origin. */
  torus(m: THREE.Matrix4, radius: number, tube: number, tone: Tone, segments = 18, sides = 4) {
    const point = (u: number, v: number) => {
      const a = (u / segments) * Math.PI * 2,
        b = (v / sides) * Math.PI * 2 + Math.PI / sides;
      const r = radius + Math.cos(b) * tube;
      return new THREE.Vector3(Math.cos(a) * r, Math.sin(b) * tube, Math.sin(a) * r).applyMatrix4(
        m,
      );
    };
    for (let u = 0; u < segments; u++)
      for (let v = 0; v < sides; v++)
        this.quad(point(u, v), point(u, v + 1), point(u + 1, v + 1), point(u + 1, v), tone);
  }

  /** A thin two-sided plate in the local xz plane. */
  panel(m: THREE.Matrix4, w: number, d: number, tone: Tone, back: Tone = tone) {
    const p = (x: number, z: number) => new THREE.Vector3(x, 0, z).applyMatrix4(m);
    const [a, b, c, e] = [p(-w / 2, d / 2), p(w / 2, d / 2), p(w / 2, -d / 2), p(-w / 2, -d / 2)];
    this.quad(a, b, c, e, tone);
    this.quad(e, c, b, a, back);
  }

  /** A square-section strut between two points in the mesher's own space. */
  beam(from: THREE.Vector3, to: THREE.Vector3, radius: number, tone: Tone, sides = 4) {
    const length = from.distanceTo(to);
    if (length < 1e-6) return;
    const up = vd.subVectors(to, from).normalize();
    this.prism(frame(from, up), radius, radius, length, sides, tone, tone, Math.PI / 4);
  }

  /** A low-poly rock or cloud puff: a jittered icosahedron. */
  blob(m: THREE.Matrix4, radius: number, tone: Tone, roughness = 0.25, seed = 1) {
    const random = rng(seed);
    const corners = unitIcosahedron.vertices.map((v) =>
      v
        .clone()
        .multiplyScalar(radius * (1 + (random() - 0.5) * roughness * 2))
        .applyMatrix4(m),
    );
    for (const [a, b, c] of unitIcosahedron.faces)
      this.tri(corners[a], corners[b], corners[c], tone);
  }

  append(other: Mesher) {
    this.position.push(...other.position);
    this.color.push(...other.color);
  }

  geometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.color, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

const unitIcosahedron = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  const vertices = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());
  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  return { vertices, faces };
})();

/** A local frame whose +y is `up`, positioned at `origin` and optionally spun about +y. */
export function frame(origin: THREE.Vector3, up: THREE.Vector3, spin = 0, scale = 1) {
  const y = va.copy(up).normalize();
  const helper = Math.abs(y.y) < 0.9 ? vb.set(0, 1, 0) : vb.set(1, 0, 0);
  const x = vc.crossVectors(helper, y).normalize();
  if (spin) x.applyAxisAngle(y, spin);
  const z = new THREE.Vector3().crossVectors(x, y);
  return new THREE.Matrix4()
    .makeBasis(x, y, z)
    .scale(new THREE.Vector3(scale, scale, scale))
    .setPosition(origin);
}

/** Compose a child transform in a parent's local space. */
export function local(
  parent: THREE.Matrix4,
  x: number,
  y: number,
  z: number,
  rotateY = 0,
  scale = 1,
  tilt: [number, number] = [0, 0],
) {
  const child = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt[0], rotateY, tilt[1])),
    new THREE.Vector3(scale, scale, scale),
  );
  return parent.clone().multiply(child);
}
