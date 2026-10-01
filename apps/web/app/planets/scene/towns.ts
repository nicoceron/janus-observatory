import * as THREE from 'three';
import type { Tone } from '../kit';
import type { WorldContext } from '../model';
import { propFootprint, U } from '../props/library';
import { disc, makeRoute, ribbon } from './collect';
import { offset, tangents } from './surface';

/** [kind, weight, size range in person units, optional tints]. */
export type Pick = [kind: string, weight: number, size?: [number, number], tints?: Tone[]];

export type TownStyle = {
  layout: 'radial' | 'grid' | 'camp';
  /** Town radius in planet radii. */
  radius: number;
  streets?: number;
  /** Grid street spacing in planet radii. */
  block?: number;
  street?: { width: number; tone: Tone };
  plaza?: { radius: number; tone: Tone; centre?: Pick[] };
  /** Lot spacing along streets, in planet radii. */
  lot: { spacing: number };
  /** Buildings near the centre (r < 0.45) and toward the edge. */
  core: Pick[];
  edge: Pick[];
  /** Height multiplier by normalised distance from the centre, for skylines that rise inward. */
  rise?: (r: number) => number;
  people?: { standing: number; walking: number; kinds: string[]; walkers: string[]; tints: Tone[] };
  cars?: { count: number; kinds: string[]; tints: Tone[]; speed?: number; size?: number };
  trees?: { count: number; kinds: string[]; tints?: Tone[]; size?: [number, number] };
  lamps?: string;
  perimeter?: { kind: string; size?: number; tint?: Tone };
  /** Ground paint for faces under the town. */
  ground?: Tone;
};

export type Town = {
  centre: THREE.Vector3;
  radius: number;
  lots: THREE.Vector3[];
  style: TownStyle;
};

export function choose(picks: Pick[], random: () => number) {
  const total = picks.reduce((sum, p) => sum + p[1], 0);
  let r = random() * total;
  for (const pick of picks) {
    r -= pick[1];
    if (r <= 0) return pick;
  }
  return picks[picks.length - 1];
}

const STEP = 0.0025;

/** Lay out one settlement around a unit direction and fill it with buildings, people and traffic. */
export function buildTown(
  world: WorldContext,
  centre: THREE.Vector3,
  style: TownStyle,
  scale = 1,
): Town {
  const { surface, props, traffic, random } = world;
  const up = centre.clone().normalize();
  const R = style.radius * scale;
  const ground = (dir: THREE.Vector3, h = 0.0012) => surface.point(dir, h);
  const life = world.quality.life;
  const half = (style.street?.width ?? 1.2 * U) / 2;
  const placed: { dir: THREE.Vector3; r: number }[] = [];
  const streets: THREE.Vector3[][] = [];
  const pathPoints: THREE.Vector3[] = [];

  if (style.ground)
    for (const face of world.around(surface.face(up), THREE.MathUtils.radToDeg(R) * 0.9))
      if (face.land) {
        face.tone = style.ground;
        face.used = true;
      }

  const line = (from: THREE.Vector3, heading: number, length: number) => {
    const dirs: THREE.Vector3[] = [];
    for (let d = 0; d <= length; d += STEP) {
      const dir = offset(from, heading, d);
      if (!surface.land(dir)) break;
      dirs.push(dir);
    }
    return dirs;
  };
  if (style.layout === 'radial') {
    const n = style.streets ?? 4;
    const base = random() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const heading = base + (k / n) * Math.PI * 2 + (random() - 0.5) * 0.4;
      const dirs = line(up, heading, R);
      if (dirs.length > 3) streets.push(dirs);
    }
    // Larger towns add a ring road joining the radials.
    let ring: THREE.Vector3[] = [];
    const steps = Math.max(16, Math.round((R * 0.6 * Math.PI * 2) / STEP));
    if (n >= 5)
      for (let i = 0; i <= steps; i++) {
        const dir = offset(up, (i / steps) * Math.PI * 2, R * 0.6);
        if (surface.land(dir)) ring.push(dir);
        else {
          if (ring.length > 3) streets.push(ring);
          ring = [];
        }
      }
    if (ring.length > 3) streets.push(ring);
  } else if (style.layout === 'grid') {
    const g = style.block ?? 10 * U;
    const { east, north } = tangents(up);
    for (const [axis, across] of [
      [east, north],
      [north, east],
    ] as const)
      for (let k = -Math.floor(R / g); k <= Math.floor(R / g); k++) {
        const span = Math.sqrt(Math.max(0, R * R - (k * g) ** 2));
        if (span < g * 0.6) continue;
        let dirs: THREE.Vector3[] = [];
        for (let d = -span; d <= span; d += STEP) {
          const dir = up
            .clone()
            .addScaledVector(axis, d)
            .addScaledVector(across, k * g)
            .normalize();
          if (surface.land(dir)) dirs.push(dir);
          else {
            if (dirs.length > 3) streets.push(dirs);
            dirs = [];
          }
        }
        if (dirs.length > 3) streets.push(dirs);
      }
  }
  for (const dirs of streets) pathPoints.push(...dirs.filter((_, i) => i % 2 === 0));

  // Distances are compared as chord lengths, which match angles closely at these scales.
  const clearOfStreets = (dir: THREE.Vector3, r: number) => {
    const limit = (half + r * 0.85) ** 2;
    for (const q of pathPoints) if (q.distanceToSquared(dir) < limit) return false;
    return true;
  };
  const clearOfLots = (dir: THREE.Vector3, r: number) => {
    for (const other of placed)
      if (other.dir.distanceToSquared(dir) < ((other.r + r) * 0.92) ** 2) return false;
    return true;
  };
  const place = (pick: Pick, dir: THREE.Vector3, facing: THREE.Vector3, sizeScale = 1) => {
    const [lo, hi] = pick[2] ?? [1, 1];
    const size = (lo + (hi - lo) * random()) * sizeScale;
    const tint = pick[3]?.length ? pick[3][Math.floor(random() * pick[3].length)] : undefined;
    props.add(pick[0], ground(dir, -0.0006), facing, size, tint);
  };
  const footprint = (pick: Pick) => propFootprint(pick[0]) * (pick[2]?.[1] ?? 1) * U;

  // Line streets with buildings that face them, never overlapping a street or a neighbour.
  const stride = Math.max(1, Math.round(style.lot.spacing / STEP));
  for (const dirs of streets) {
    const points = dirs.map((dir) => ground(dir));
    if (style.street) ribbon(world.ground.solid, points, style.street.width, style.street.tone);
    for (let i = Math.max(1, Math.round(stride / 2)); i < dirs.length - 1; i += stride) {
      const here = dirs[i];
      const along = dirs[i + 1]
        .clone()
        .sub(dirs[i - 1])
        .normalize();
      const side = along.clone().cross(here).normalize();
      for (const s of [-1, 1]) {
        const r = here.angleTo(up) / R;
        const pick = choose(r < 0.45 ? style.core : style.edge, random);
        const fp = footprint(pick);
        const lot = here
          .clone()
          .addScaledVector(side, s * (half + fp + 0.4 * U))
          .normalize();
        if (lot.angleTo(up) > R * 1.05 || !surface.land(lot)) continue;
        if (!clearOfLots(lot, fp) || !clearOfStreets(lot, fp)) continue;
        placed.push({ dir: lot, r: fp });
        place(pick, lot, here.clone().sub(lot), style.rise?.(r) ?? 1);
        if (style.lamps && random() < 0.4)
          props.add(
            style.lamps,
            ground(
              here
                .clone()
                .addScaledVector(side, s * (half + 0.3 * U))
                .normalize(),
              0,
            ),
            side.clone().multiplyScalar(-s),
            1,
          );
        if (style.people && life && random() < 0.45)
          props.add(
            world.random.pick(style.people.kinds),
            ground(
              here
                .clone()
                .addScaledVector(side, s * (half + 0.6 * U))
                .normalize(),
              0,
            ),
            along.clone().multiplyScalar(random() < 0.5 ? 1 : -1),
            1,
            world.random.pick(style.people.tints),
          );
      }
    }
    if (!life) continue;
    if (style.people?.walking) {
      const sidewalk = dirs.map((dir, i) => {
        const next = dirs[Math.min(dirs.length - 1, i + 1)],
          prev = dirs[Math.max(0, i - 1)];
        const side = next.clone().sub(prev).normalize().cross(dir).normalize();
        return ground(
          dir
            .clone()
            .addScaledVector(side, half + 0.5 * U)
            .normalize(),
          0.0002,
        );
      });
      traffic.add(world.random.pick(style.people.walkers), makeRoute(sidewalk), {
        count: Math.max(1, Math.round((style.people.walking * dirs.length) / 24)),
        speed: 0.0012,
        tints: style.people.tints,
        random,
      });
    }
    if (style.cars && dirs.length > 8)
      traffic.add(
        world.random.pick(style.cars.kinds),
        makeRoute(dirs.map((dir) => ground(dir, 0.0014))),
        {
          count: Math.max(1, Math.round((style.cars.count * dirs.length) / 40)),
          speed: style.cars.speed ?? 0.004,
          size: style.cars.size ?? 1,
          tints: style.cars.tints,
          random,
        },
      );
  }

  if (style.plaza) {
    disc(
      world.ground.solid,
      up,
      (dir) => ground(dir, 0.0014),
      style.plaza.radius * scale,
      style.plaza.tone,
      12,
    );
    placed.push({ dir: up, r: style.plaza.radius * scale });
    if (style.plaza.centre)
      place(choose(style.plaza.centre, random), up, offset(up, 0, 0.01).sub(up));
  }

  // Camps and loose settlements: dwellings in rings around a shared centre.
  if (style.layout === 'camp')
    for (const ringR of [0.4, 0.7, 0.95])
      for (let i = 0; i < 12; i++) {
        const dir = offset(
          up,
          (i / 12) * Math.PI * 2 + random() * 0.3 + ringR * 3,
          R * ringR * (0.9 + random() * 0.2),
        );
        if (!surface.land(dir)) continue;
        const pick = choose(ringR < 0.5 ? style.core : style.edge, random);
        const fp = footprint(pick);
        if (!clearOfLots(dir, fp)) continue;
        placed.push({ dir, r: fp });
        place(pick, dir, up.clone().sub(dir));
      }

  if (style.perimeter) {
    const fp = propFootprint(style.perimeter.kind) * (style.perimeter.size ?? 1) * U * 2;
    const count = Math.max(6, Math.round((Math.PI * 2 * R * 1.08) / fp));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const dir = offset(up, a, R * 1.08);
      if (!surface.land(dir)) continue;
      props.add(
        style.perimeter.kind,
        ground(dir, -0.0004),
        offset(up, a + 0.05, R * 1.08).sub(dir),
        style.perimeter.size ?? 1,
        style.perimeter.tint,
      );
    }
  }

  if (style.people && life) {
    for (let i = 0; i < style.people.standing; i++) {
      const spot = offset(
        up,
        random() * Math.PI * 2,
        (style.plaza?.radius ?? R * 0.25) * scale * (0.3 + random() * 0.8),
      );
      if (!surface.land(spot)) continue;
      props.add(
        world.random.pick(style.people.kinds),
        ground(spot, 0),
        up
          .clone()
          .sub(spot)
          .add(offset(spot, random() * 6, 0.003).sub(spot)),
        1,
        world.random.pick(style.people.tints),
      );
    }
    if (style.layout === 'camp' && style.people.walking) {
      const loop: THREE.Vector3[] = [];
      for (let i = 0; i < 18; i++)
        loop.push(ground(offset(up, (i / 18) * Math.PI * 2, R * 0.55), 0.0002));
      traffic.add(world.random.pick(style.people.walkers), makeRoute(loop, true), {
        count: style.people.walking,
        speed: 0.0009,
        tints: style.people.tints,
        pingpong: false,
        random,
      });
    }
  }
  if (style.trees) {
    const count = Math.round(style.trees.count * scale * scale * world.quality.density);
    for (let i = 0; i < count; i++) {
      const spot = offset(up, random() * Math.PI * 2, R * Math.sqrt(random()) * 1.05);
      const pick: Pick = [
        world.random.pick(style.trees.kinds),
        1,
        style.trees.size ?? [0.9, 1.3],
        style.trees.tints,
      ];
      const fp = footprint(pick) * 0.6;
      if (!surface.land(spot) || !clearOfLots(spot, fp) || !clearOfStreets(spot, fp)) continue;
      placed.push({ dir: spot, r: fp });
      place(pick, spot, offset(spot, random() * 6, 0.01).sub(spot));
    }
  }
  world.occupy(up, R * 1.12);
  return { centre: up, radius: R, lots: placed.map((p) => p.dir), style };
}
