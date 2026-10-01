import * as THREE from 'three';
import type { Tone } from '../kit';
import type { WorldContext } from '../model';
import { makeRoute, ribbon } from './collect';
import { arc } from './surface';
import type { Town } from './towns';

type Fleet = { kinds: string[]; tints?: Tone[]; per: number; speed: number; size?: number };

/** Join neighbouring towns by roads across land, with short causeways over water. */
export function roads(
  world: WorldContext,
  towns: Town[],
  options: {
    width: number;
    tone: Tone;
    neighbours: number;
    reach: number;
    traffic?: Fleet;
    pylons?: string;
  },
) {
  const { surface, traffic, random } = world;
  const done = new Set<string>();
  const links: [Town, Town][] = [];
  for (const town of towns) {
    const near = towns
      .filter((other) => other !== town)
      .map((other) => ({ other, angle: town.centre.angleTo(other.centre) }))
      .filter((n) => n.angle < options.reach)
      .sort((a, b) => a.angle - b.angle)
      .slice(0, options.neighbours);
    for (const { other } of near) {
      const key = [towns.indexOf(town), towns.indexOf(other)].sort().join(':');
      if (done.has(key)) continue;
      done.add(key);
      // Roads run between town edges; inside, the town's own streets take over.
      const dirs = arc(town.centre, other.centre, 0.004).filter(
        (dir) =>
          dir.angleTo(town.centre) > town.radius * 0.7 &&
          dir.angleTo(other.centre) > other.radius * 0.7,
      );
      if (dirs.length < 3) continue;
      const wet = dirs.filter((dir) => !surface.land(dir)).length;
      if (wet > dirs.length * 0.18) continue;
      const points = dirs.map((dir) =>
        surface.land(dir) ? surface.point(dir, 0.0016) : dir.clone().multiplyScalar(1.006),
      );
      ribbon(world.ground.solid, points, options.width, options.tone);
      dirs.forEach((dir, i) => {
        if (i % 3 === 0) world.occupy(dir, options.width * 1.5);
        if (!surface.land(dir) && i % 4 === 0)
          world.ground.solid.beam(
            dir.clone().multiplyScalar(0.995),
            dir.clone().multiplyScalar(1.006),
            0.0012,
            '#8a8580',
          );
        else if (options.pylons && world.quality.life && i % 16 === 8 && surface.land(dir))
          world.props.add(
            options.pylons,
            surface.point(
              dir
                .clone()
                .add(
                  points[Math.min(points.length - 1, i + 1)]
                    .clone()
                    .sub(points[i])
                    .cross(dir)
                    .normalize()
                    .multiplyScalar(0.005),
                )
                .normalize(),
              -0.0004,
            ),
            points[Math.min(points.length - 1, i + 1)].clone().sub(points[i]),
            0.7,
          );
      });
      links.push([town, other]);
      if (options.traffic && world.quality.life)
        traffic.add(
          world.random.pick(options.traffic.kinds),
          makeRoute(points.map((p) => p.clone().multiplyScalar(1 + 0.0004))),
          {
            count: options.traffic.per,
            speed: options.traffic.speed,
            size: options.traffic.size,
            tints: options.traffic.tints,
            random,
          },
        );
    }
  }
  return links;
}

/** Elevated rail between towns, with pylons and trains. */
export function rails(
  world: WorldContext,
  links: [Town, Town][],
  options: { tone: Tone; pylon: string; train: string; tints?: Tone[] },
) {
  for (const [a, b] of links) {
    const dirs = arc(a.centre, b.centre, 0.006);
    const points = dirs.map((dir) => world.surface.point(dir, 0.012));
    ribbon(world.ground.sheen, points, 0.003, options.tone);
    dirs.forEach((dir, i) => {
      if (i % 4 === 2)
        world.props.add(
          options.pylon,
          world.surface.point(dir, -0.0004),
          points[Math.min(points.length - 1, i + 1)].clone().sub(points[i]),
          1,
        );
    });
    if (world.quality.life)
      world.traffic.add(
        options.train,
        makeRoute(points.map((p) => p.clone().multiplyScalar(1.0008))),
        {
          count: 1,
          speed: 0.012,
          size: 1.1,
          tints: options.tints,
          random: world.random,
        },
      );
  }
}

/** Shipping between coastal towns, over open water, plus vessels that circle offshore. */
export function seaLanes(world: WorldContext, ports: THREE.Vector3[], fleet: Fleet, lanes = 2) {
  if (!world.quality.life) return;
  const { surface, traffic, random } = world;
  for (const port of ports) {
    const near = ports
      .filter((p) => p !== port)
      .sort((a, b) => a.angleTo(port) - b.angleTo(port))
      .slice(0, lanes);
    for (const other of near) {
      if (ports.indexOf(other) < ports.indexOf(port)) continue;
      const dirs = arc(port, other, 0.008).filter((dir) => !surface.land(dir));
      if (dirs.length < 6) continue;
      // Keep the longest contiguous run of open water.
      const runs: THREE.Vector3[][] = [[]];
      for (let i = 0; i < dirs.length; i++) {
        if (i && dirs[i].angleTo(dirs[i - 1]) > 0.012) runs.push([]);
        runs[runs.length - 1].push(dirs[i]);
      }
      const run = runs.sort((a, b) => b.length - a.length)[0];
      if (run.length < 6) continue;
      traffic.add(
        world.random.pick(fleet.kinds),
        makeRoute(run.map((d) => d.clone().multiplyScalar(1.0004))),
        {
          count: fleet.per,
          speed: fleet.speed,
          size: fleet.size,
          tints: fleet.tints,
          random,
        },
      );
    }
  }
}

/** Small loops just offshore for fishing and harbour craft. */
export function harbourLoops(world: WorldContext, ports: THREE.Vector3[], fleet: Fleet) {
  if (!world.quality.life) return;
  for (const port of ports) {
    const water = world.around(world.surface.face(port), 7).find((f) => !f.land && f.coastal);
    if (!water) continue;
    const centre = water.up.clone();
    const { east, north } = (() => {
      const e = new THREE.Vector3(0, 1, 0).cross(centre).normalize();
      return { east: e, north: centre.clone().cross(e) };
    })();
    const loop: THREE.Vector3[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const dir = centre
        .clone()
        .addScaledVector(east, Math.cos(a) * 0.02)
        .addScaledVector(north, Math.sin(a) * 0.014)
        .normalize();
      if (world.surface.land(dir)) continue;
      loop.push(dir.multiplyScalar(1.0004));
    }
    if (loop.length < 6) continue;
    world.traffic.add(world.random.pick(fleet.kinds), makeRoute(loop, true), {
      count: fleet.per,
      speed: fleet.speed,
      size: fleet.size,
      tints: fleet.tints,
      pingpong: false,
      random: world.random,
    });
  }
}

/** Aircraft on arcs between large towns. */
export function flights(
  world: WorldContext,
  hubs: THREE.Vector3[],
  fleet: Fleet,
  routes = 6,
  altitude = 0.045,
) {
  if (!world.quality.life || hubs.length < 2) return;
  for (let r = 0; r < routes; r++) {
    const a = world.random.pick(hubs),
      b = world.random.pick(hubs.filter((h) => h !== a));
    if (!b || a.angleTo(b) < 0.25) continue;
    const dirs = arc(a, b, 0.01);
    const points = dirs.map((dir, i) => {
      const t = i / (dirs.length - 1);
      return dir.clone().multiplyScalar(1.01 + altitude * Math.sin(Math.PI * t) ** 0.6);
    });
    world.traffic.add(world.random.pick(fleet.kinds), makeRoute(points), {
      count: fleet.per,
      speed: fleet.speed,
      size: fleet.size,
      tints: fleet.tints,
      random: world.random,
    });
  }
}
