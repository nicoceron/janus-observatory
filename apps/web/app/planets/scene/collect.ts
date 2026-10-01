import * as THREE from 'three';
import type { Mesher, Tone } from '../kit';
import { propTint, U } from '../props/library';

const colour = new THREE.Color();
const basis = { x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3() };

/** Static instances of library props, grouped by kind. */
export type InstanceGroup = {
  kind: string;
  frame: 'surface' | 'orbit';
  matrices: Float32Array;
  tints: Float32Array;
};

/** A polyline the movers follow, in the planet's own frame. */
export type Route = { points: Float32Array; cumulative: Float32Array; length: number };

/** Instances that travel along routes: citizens, vehicles, ships, aircraft, herds and flocks. */
export type MoverGroup = {
  kind: string;
  routes: Route[];
  /** Per mover: route index, speed (radii/s), phase (radii), scale, back-and-forth flag. */
  route: Uint16Array;
  speed: Float32Array;
  phase: Float32Array;
  scale: Float32Array;
  pingpong: Uint8Array;
  tints: Float32Array;
};

/** A frame standing at `point` with +y along the radial and +z along `heading`. */
export function standing(point: THREE.Vector3, forward: THREE.Vector3 | null, scale: number) {
  basis.y.copy(point).normalize();
  if (forward) basis.z.copy(forward).addScaledVector(basis.y, -forward.dot(basis.y));
  if (!forward || basis.z.lengthSq() < 1e-10) {
    basis.z.set(0, 1, 0).cross(basis.y);
    if (basis.z.lengthSq() < 1e-8) basis.z.set(1, 0, 0);
  }
  basis.z.normalize();
  basis.x.crossVectors(basis.y, basis.z);
  return new THREE.Matrix4()
    .makeBasis(basis.x, basis.y, basis.z)
    .scale(new THREE.Vector3(scale, scale, scale))
    .setPosition(point);
}

/** Citizens and animals: skipped where a quality tier has no life layer. */
const living =
  /^(person|walker|worker|guard|robed|porter|enhanced|astronaut|deer|bison|cow|sheep|horse|bird|whale|fish)/;

export class Props {
  private groups = new Map<string, { matrices: number[]; tints: number[] }>();
  constructor(
    private life = true,
    private furnish = true,
  ) {}

  /** Place a prop: `size` is in person units (1 = one citizen tall). */
  add(kind: string, point: THREE.Vector3, forward: THREE.Vector3 | null, size = 1, tint?: Tone) {
    this.addMatrix(kind, standing(point, forward, size * U), tint);
  }

  addMatrix(kind: string, matrix: THREE.Matrix4, tint?: Tone) {
    if (!this.furnish || (!this.life && living.test(kind))) return;
    let group = this.groups.get(kind);
    if (!group) this.groups.set(kind, (group = { matrices: [], tints: [] }));
    group.matrices.push(...matrix.elements);
    colour.set(tint ?? propTint(kind));
    group.tints.push(colour.r, colour.g, colour.b);
  }

  get count() {
    let n = 0;
    for (const group of this.groups.values()) n += group.matrices.length / 16;
    return n;
  }

  finish(frame: InstanceGroup['frame'] = 'surface'): InstanceGroup[] {
    return [...this.groups].map(([kind, group]) => ({
      kind,
      frame,
      matrices: new Float32Array(group.matrices),
      tints: new Float32Array(group.tints),
    }));
  }
}

export function makeRoute(points: THREE.Vector3[], loop = false): Route {
  const list = loop ? [...points, points[0]] : points;
  const flat = new Float32Array(list.length * 3);
  const cumulative = new Float32Array(list.length);
  let length = 0;
  list.forEach((p, i) => {
    flat.set([p.x, p.y, p.z], i * 3);
    if (i) length += p.distanceTo(list[i - 1]);
    cumulative[i] = length;
  });
  return { points: flat, cumulative, length };
}

export class Traffic {
  private groups = new Map<
    string,
    {
      routes: Route[];
      route: number[];
      speed: number[];
      phase: number[];
      scale: number[];
      pingpong: number[];
      tints: number[];
    }
  >();

  /**
   * Send `count` movers of a kind along one route. Speeds are in planet radii per second; sizes are
   * person units. Back-and-forth routes suit streets and roads; loops suit orbits and flocks.
   */
  add(
    kind: string,
    route: Route,
    options: {
      count?: number;
      speed: number;
      size?: number;
      tints?: Tone[];
      pingpong?: boolean;
      random?: () => number;
    },
  ) {
    if (route.length < 1e-4) return;
    let group = this.groups.get(kind);
    if (!group)
      this.groups.set(
        kind,
        (group = {
          routes: [],
          route: [],
          speed: [],
          phase: [],
          scale: [],
          pingpong: [],
          tints: [],
        }),
      );
    let index = group.routes.indexOf(route);
    if (index < 0) index = group.routes.push(route) - 1;
    const random = options.random ?? Math.random;
    const count = options.count ?? 1;
    for (let i = 0; i < count; i++) {
      group.route.push(index);
      group.speed.push(
        options.speed *
          (0.8 + random() * 0.4) *
          (random() < 0.5 && options.pingpong !== false ? -1 : 1),
      );
      group.phase.push(
        ((i + random() * 0.6) / count) * route.length * (options.pingpong === false ? 1 : 2),
      );
      group.scale.push((options.size ?? 1) * U * (0.92 + random() * 0.16));
      group.pingpong.push(options.pingpong === false ? 0 : 1);
      const tint = options.tints?.length
        ? options.tints[Math.floor(random() * options.tints.length)]
        : propTint(kind);
      colour.set(tint);
      group.tints.push(colour.r, colour.g, colour.b);
    }
  }

  finish(): MoverGroup[] {
    return [...this.groups].map(([kind, g]) => ({
      kind,
      routes: g.routes,
      route: new Uint16Array(g.route),
      speed: new Float32Array(g.speed),
      phase: new Float32Array(g.phase),
      scale: new Float32Array(g.scale),
      pingpong: new Uint8Array(g.pingpong),
      tints: new Float32Array(g.tints),
    }));
  }
}

const p0 = new THREE.Vector3(),
  p1 = new THREE.Vector3();

/** Position and forward direction at a travelled distance along a route. */
export function sample(
  route: Route,
  travelled: number,
  pingpong: boolean,
  position: THREE.Vector3,
  forward: THREE.Vector3,
) {
  const L = route.length;
  let d = travelled % (pingpong ? 2 * L : L);
  if (d < 0) d += pingpong ? 2 * L : L;
  let reverse = false;
  if (pingpong && d > L) {
    d = 2 * L - d;
    reverse = true;
  }
  const c = route.cumulative;
  let lo = 0,
    hi = c.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (c[mid] <= d) lo = mid;
    else hi = mid;
  }
  const span = c[hi] - c[lo] || 1;
  const t = (d - c[lo]) / span;
  p0.fromArray(route.points, lo * 3);
  p1.fromArray(route.points, hi * 3);
  position.lerpVectors(p0, p1, t);
  forward.subVectors(p1, p0);
  if (reverse) forward.negate();
  return position;
}

/** A flat strip following surface points, e.g. a road, street, rail or path. */
export function ribbon(mesh: Mesher, points: THREE.Vector3[], width: number, tone: Tone) {
  if (points.length < 2) return;
  const side = new THREE.Vector3(),
    tangent = new THREE.Vector3(),
    up = new THREE.Vector3();
  const left: THREE.Vector3[] = [],
    right: THREE.Vector3[] = [];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)],
      b = points[Math.min(points.length - 1, i + 1)];
    tangent.subVectors(b, a).normalize();
    up.copy(p).normalize();
    side
      .crossVectors(tangent, up)
      .normalize()
      .multiplyScalar(width / 2);
    left.push(p.clone().add(side));
    right.push(p.clone().sub(side));
  });
  for (let i = 0; i < points.length - 1; i++)
    mesh.quad(left[i], left[i + 1], right[i + 1], right[i], tone);
}

/** A flat disc on the ground, e.g. a plaza or a pad. */
export function disc(
  mesh: Mesher,
  centre: THREE.Vector3,
  ground: (dir: THREE.Vector3) => THREE.Vector3,
  radius: number,
  tone: Tone,
  sides = 10,
) {
  const up = centre.clone().normalize();
  const east = new THREE.Vector3(0, 1, 0).cross(up);
  if (east.lengthSq() < 1e-8) east.set(1, 0, 0);
  east.normalize();
  const north = up.clone().cross(east);
  const rim: THREE.Vector3[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    rim.push(
      ground(
        up
          .clone()
          .addScaledVector(east, Math.cos(a) * radius)
          .addScaledVector(north, Math.sin(a) * radius),
      ),
    );
  }
  const middle = ground(up);
  for (let i = 0; i < sides; i++) mesh.tri(middle, rim[i], rim[(i + 1) % sides], tone);
}
