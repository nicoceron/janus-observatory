import * as THREE from 'three';
import type { Mesher, Tone } from '../kit';
import {
  living,
  propFootprint,
  propGroup,
  propScale,
  propTint,
  U,
  type PropGroup,
} from '../props/library';

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

/**
 * How many props of each group a world keeps at story density. Worlds are dioramas of a few large
 * models, not crowds: when a recipe offers more, spacing between same-group props grows evenly
 * until the budget fits, so every settlement keeps a few buildings rather than some vanishing.
 */
const budgets: Record<PropGroup, number> = {
  structure: 60,
  vehicle: 6,
  person: 12,
  robot: 10,
  animal: 8,
  plant: 36,
  decor: 8,
};
const order: PropGroup[] = ['structure', 'vehicle', 'robot', 'person', 'animal', 'plant', 'decor'];
/** Footprints are half-widths of bounding boxes, so a little overlap still reads as touching. */
const TOUCH = 0.8;

/** A sphere that props keep out of, e.g. a landmark drawn as its own layer. */
export type KeepOut = { centre: THREE.Vector3; radius: number };

/** A strip of ground that traffic uses: a road, street or rail of half-width `half` (radii). */
export type Lane = { points: THREE.Vector3[]; half: number };

const LANE_CELL = 0.08;
const LANE_STEP = 0.004;

/** Lanes as unit-sphere samples in a grid, so each prop only tests the road near it. */
function laneIndex(lanes: Lane[]) {
  const cells = new Map<string, number[]>();
  const add = (p: THREE.Vector3, half: number) => {
    const key = `${Math.floor(p.x / LANE_CELL)},${Math.floor(p.y / LANE_CELL)},${Math.floor(p.z / LANE_CELL)}`;
    const list = cells.get(key);
    if (list) list.push(p.x, p.y, p.z, half);
    else cells.set(key, [p.x, p.y, p.z, half]);
  };
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    p = new THREE.Vector3();
  for (const lane of lanes)
    for (let i = 0; i < lane.points.length; i++) {
      a.copy(lane.points[i]).normalize();
      add(a, lane.half);
      if (i + 1 === lane.points.length) break;
      b.copy(lane.points[i + 1]).normalize();
      const steps = Math.floor(a.distanceTo(b) / LANE_STEP);
      for (let k = 1; k <= steps; k++)
        add(p.lerpVectors(a, b, k / (steps + 1)).normalize(), lane.half);
    }
  const unit = new THREE.Vector3();
  /** Whether a prop of footprint `radius` at `position` stands in a lane. */
  return (position: THREE.Vector3, radius: number) => {
    if (!cells.size) return false;
    unit.copy(position).normalize();
    const reach = Math.ceil((radius + 0.03) / LANE_CELL);
    const cx = Math.floor(unit.x / LANE_CELL),
      cy = Math.floor(unit.y / LANE_CELL),
      cz = Math.floor(unit.z / LANE_CELL);
    for (let x = -reach; x <= reach; x++)
      for (let y = -reach; y <= reach; y++)
        for (let z = -reach; z <= reach; z++) {
          const list = cells.get(`${cx + x},${cy + y},${cz + z}`);
          if (!list) continue;
          for (let i = 0; i < list.length; i += 4) {
            const limit = list[i + 3] + Math.min(radius, LANE_BODY) * LANE_FIT;
            const dx = list[i] - unit.x,
              dy = list[i + 1] - unit.y,
              dz = list[i + 2] - unit.z;
            if (dx * dx + dy * dy + dz * dz < limit * limit) return true;
          }
        }
    return false;
  };
}
/** Footprints are bounding half-widths, so only a prop well into the roadway counts as on it. */
const LANE_FIT = 0.5;
/** Long props (a crane's boom, a dock) are far narrower than their bounding half-width. */
const LANE_BODY = 1.4 * U;

type Entry = {
  kind: string;
  group: PropGroup;
  matrix: THREE.Matrix4;
  tint: [number, number, number];
  position: THREE.Vector3;
  radius: number;
  /** Placed on purpose where traffic runs, e.g. a rail pylon or a gate. */
  free: boolean;
};

function clear(entry: Entry, pool: Entry[], spacing: number) {
  for (const other of pool) {
    const limit = (other.radius + entry.radius) * spacing;
    if (other.position.distanceToSquared(entry.position) < limit * limit) return false;
  }
  return true;
}

/** Keep props off roads and from overlapping each other or a landmark, within group budgets. */
function declutter(entries: Entry[], density: number, keepOut: KeepOut[], lanes: Lane[]) {
  const kept: Entry[] = [];
  const onLane = laneIndex(lanes);
  for (const group of order) {
    const budget = Math.max(1, Math.round(budgets[group] * density));
    if ((globalThis as { KIT_DEBUG?: boolean }).KIT_DEBUG) {
      const mine = entries.filter((e) => e.group === group);
      const tally: Record<string, string> = {};
      for (const kind of new Set(mine.map((e) => e.kind)))
        tally[kind] =
          `${mine.filter((e) => e.kind === kind && !e.free && onLane(e.position, e.radius)).length}` +
          `/${mine.filter((e) => e.kind === kind).length}`;
      console.log('DEBUG', group, 'budget', budget, JSON.stringify(tally));
    }
    const free = entries.filter(
      (e) =>
        e.group === group &&
        keepOut.every((k) => k.centre.distanceToSquared(e.position) > k.radius * k.radius) &&
        // People may stand in a street; buildings, trees and herds may not.
        (e.free || group === 'person' || !onLane(e.position, e.radius)) &&
        clear(e, kept, TOUCH),
    );
    // Accept in recipe order with a given spacing; stop early once the budget is exceeded.
    const run = (spacing: number) => {
      const mine: Entry[] = [];
      for (const e of free) {
        if (!clear(e, mine, spacing)) continue;
        mine.push(e);
        if (mine.length > budget) break;
      }
      return mine;
    };
    let chosen = run(TOUCH);
    if (chosen.length > budget) {
      let lo = TOUCH,
        hi = TOUCH * 2;
      chosen = run(hi);
      while (chosen.length > budget && hi < 400) chosen = run((hi *= 2));
      for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2;
        const trial = run(mid);
        if (trial.length > budget) lo = mid;
        else [hi, chosen] = [mid, trial];
      }
    }
    kept.push(...chosen.slice(0, budget));
  }
  return kept;
}

export class Props {
  private entries: Entry[] = [];
  constructor(
    private life = true,
    private furnish = true,
  ) {}

  /**
   * Place a prop: `size` is in person units (1 = one citizen tall). `free` lets it stand where
   * traffic runs (a rail pylon, a gate); everything else is kept off roads and streets.
   */
  add(
    kind: string,
    point: THREE.Vector3,
    forward: THREE.Vector3 | null,
    size = 1,
    tint?: Tone,
    free = false,
  ) {
    this.addMatrix(kind, standing(point, forward, size * U * propScale(kind)), tint, free);
  }

  addMatrix(kind: string, matrix: THREE.Matrix4, tint?: Tone, free = false) {
    if (!this.furnish || (!this.life && living.test(kind))) return;
    colour.set(tint ?? propTint(kind));
    const scale = new THREE.Vector3().setFromMatrixColumn(matrix, 0).length();
    this.entries.push({
      kind,
      group: propGroup(kind),
      matrix,
      tint: [colour.r, colour.g, colour.b],
      position: new THREE.Vector3().setFromMatrixPosition(matrix),
      radius: propFootprint(kind) * scale,
      free,
    });
  }

  get count() {
    return this.entries.length;
  }

  /**
   * Group the kept props by kind. Surface props are decluttered against each other, the group
   * budgets scaled by `density` (1 at story quality) and any landmark keep-out spheres.
   */
  finish(
    frame: InstanceGroup['frame'] = 'surface',
    options: { density?: number; keepOut?: KeepOut[]; lanes?: Lane[] } = {},
  ): InstanceGroup[] {
    const kept =
      frame === 'surface'
        ? declutter(this.entries, options.density ?? 1, options.keepOut ?? [], options.lanes ?? [])
        : this.entries;
    const groups = new Map<string, { matrices: number[]; tints: number[] }>();
    for (const e of kept) {
      let group = groups.get(e.kind);
      if (!group) groups.set(e.kind, (group = { matrices: [], tints: [] }));
      group.matrices.push(...e.matrix.elements);
      group.tints.push(...e.tint);
    }
    return [...groups].map(([kind, group]) => ({
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
      group.scale.push((options.size ?? 1) * U * propScale(kind) * (0.92 + random() * 0.16));
      group.pingpong.push(options.pingpong === false ? 0 : 1);
      const tint = options.tints?.length
        ? options.tints[Math.floor(random() * options.tints.length)]
        : propTint(kind);
      colour.set(tint);
      group.tints.push(colour.r, colour.g, colour.b);
    }
  }

  /**
   * Keep at most a group budget of movers (scaled by `density`, 1 at story quality), taking turns
   * between kinds so a world keeps its variety: a few walkers, a few vehicles, a few animals.
   */
  finish(density = 1): MoverGroup[] {
    const keep = new Map<string, Set<number>>();
    const byGroup = new Map<PropGroup, { kind: string; i: number; rank: number; hash: number }[]>();
    for (const [kind, g] of this.groups) {
      const order = g.route
        .map((_, i) => ({ i, hash: hash(kind, i) }))
        .sort((a, b) => a.hash - b.hash);
      const list = byGroup.get(propGroup(kind)) ?? [];
      order.forEach((m, rank) => list.push({ kind, i: m.i, rank, hash: m.hash }));
      byGroup.set(propGroup(kind), list);
    }
    for (const [group, list] of byGroup) {
      const budget = Math.round((moverBudgets[group] ?? 0) * density);
      list.sort((a, b) => a.rank - b.rank || a.hash - b.hash);
      for (const m of list.slice(0, budget)) {
        if (!keep.has(m.kind)) keep.set(m.kind, new Set());
        keep.get(m.kind)!.add(m.i);
      }
    }
    return [...this.groups]
      .filter(([kind]) => keep.has(kind))
      .map(([kind, g]) => {
        const indices = [...keep.get(kind)!].sort((a, b) => a - b);
        const pick = (values: number[]) => indices.map((i) => values[i]);
        return {
          kind,
          routes: g.routes,
          route: new Uint16Array(pick(g.route)),
          speed: new Float32Array(pick(g.speed)),
          phase: new Float32Array(pick(g.phase)),
          scale: new Float32Array(pick(g.scale)),
          pingpong: new Uint8Array(pick(g.pingpong)),
          tints: new Float32Array(indices.flatMap((i) => g.tints.slice(i * 3, i * 3 + 3))),
        };
      });
  }
}

const moverBudgets: Partial<Record<PropGroup, number>> = {
  person: 8,
  robot: 8,
  vehicle: 12,
  animal: 8,
  structure: 4,
};

/** A stable pseudo-random number for the i-th mover of a kind. */
function hash(kind: string, i: number) {
  let h = 2166136261 ^ i;
  for (let c = 0; c < kind.length; c++) h = Math.imul(h ^ kind.charCodeAt(c), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return (h ^ (h >>> 13)) >>> 0;
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

/**
 * A paved way following surface points: the roadway with a kerb line down each side and, on a
 * `lined` road, a dashed centre line. Dark surfaces get pale markings and pale ones dark edges.
 */
export function road(
  mesh: Mesher,
  points: THREE.Vector3[],
  width: number,
  tone: Tone,
  lined = false,
  plain = false,
) {
  if (points.length < 2) return;
  // The light quality tiers draw the roadway alone.
  if (plain) {
    ribbon(mesh, points, width, tone);
    return;
  }
  // Paving is even: without this the per-face jitter turns a road into planks.
  const variance = mesh.variance;
  mesh.variance = Math.min(variance, 0.006);
  try {
    pave(mesh, points, width, tone, lined);
  } finally {
    mesh.variance = variance;
  }
}

function pave(mesh: Mesher, all: THREE.Vector3[], width: number, tone: Tone, lined: boolean) {
  ribbon(mesh, all, width, tone);
  // Markings follow every third point: they lie on the roadway, so they need not trace the
  // ground as closely as it does.
  const points = all.filter((_, i) => i % 3 === 0 || i === all.length - 1);
  const hsl = { h: 0, s: 0, l: 0 };
  colour.set(tone).getHSL(hsl);
  const dark = hsl.l < 0.42;
  const edge = `#${colour
    .clone()
    .offsetHSL(0, 0, dark ? 0.16 : -0.1)
    .getHexString()}`;
  const side = new THREE.Vector3(),
    tangent = new THREE.Vector3(),
    up = new THREE.Vector3();
  const lift = 0.0005;
  const across = (i: number) => {
    const a = points[Math.max(0, i - 1)],
      b = points[Math.min(points.length - 1, i + 1)];
    tangent.subVectors(b, a).normalize();
    up.copy(points[i]).normalize();
    return side.crossVectors(tangent, up).normalize();
  };
  for (const at of [-1, 1]) {
    const strip = points.map((p, i) =>
      p
        .clone()
        .addScaledVector(across(i), at * width * 0.43)
        .addScaledVector(up, lift),
    );
    ribbon(mesh, strip, width * 0.07, edge);
  }
  if (!lined || !dark) return;
  // Centre dashes about half a road-width long.
  let run: THREE.Vector3[] = [];
  let travelled = 0;
  for (let i = 0; i < points.length; i++) {
    if (i) travelled += points[i].distanceTo(points[i - 1]);
    const on = Math.floor(travelled / (width * 0.55)) % 2 === 0;
    if (on) run.push(points[i].clone().addScaledVector(up.copy(points[i]).normalize(), lift));
    if (!on || i === points.length - 1) {
      ribbon(mesh, run, width * 0.07, '#ece5cc');
      run = [];
    }
  }
}

/** A flat strip following surface points, e.g. a rail, a path or a furrow. */
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
