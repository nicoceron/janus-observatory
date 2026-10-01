import * as THREE from 'three';
import type { Face } from '../globe';
import type { Tone } from '../kit';
import type { WorldContext } from '../model';
import { ribbon } from './collect';
import { offset, tangents } from './surface';
import type { Pick } from './towns';
import { choose } from './towns';

/** Land faces that suit a settlement: low, unfrozen and not yet taken. */
export function settleable(
  world: WorldContext,
  biomes = ['lowland', 'forest', 'shore', 'jungle', 'upland', 'tundra', 'desert'],
) {
  return world.faces.filter(
    (f) => f.land && !f.used && f.elevation < 0.42 && biomes.includes(f.biome),
  );
}

/** Nearest land face to a latitude/longitude, if one lies within `degrees`. */
export function landNear(world: WorldContext, lat: number, lon: number, degrees = 6) {
  return world.around(world.faceAt(lat, lon), degrees).find((f) => f.land && f.biome !== 'ice');
}

/** Paint one face as a ploughed field with darker furrows running along `along`. */
export function furrows(world: WorldContext, face: Face, tone: Tone, along: THREE.Vector3) {
  face.tone = tone;
  face.used = true;
  const furrow = new THREE.Color(tone).offsetHSL(0, 0.04, -0.1).getStyle();
  const across = along.clone().cross(face.up).normalize();
  const rows = 5;
  for (let i = 0; i < rows; i++) {
    const middle = face.up
      .clone()
      .addScaledVector(across, ((i - (rows - 1) / 2) * face.size * 0.55) / rows)
      .normalize();
    const points = [-0.32, -0.16, 0, 0.16, 0.32]
      .map((t) =>
        middle
          .clone()
          .addScaledVector(along, t * face.size)
          .normalize(),
      )
      .filter((dir) => world.surface.face(dir) === face)
      .map((dir) => world.surface.point(dir, 0.0007));
    if (points.length > 1) ribbon(world.ground.solid, points, face.size * 0.035, furrow);
  }
}

/** Fields around a settlement: painted faces plus rows of crops all ploughed one way. */
export function farmland(
  world: WorldContext,
  centre: THREE.Vector3,
  radius: number,
  tones: Tone[],
  crops: Pick[],
  share = 0.7,
) {
  const { east } = tangents(centre);
  for (const face of world.around(world.surface.face(centre), THREE.MathUtils.radToDeg(radius))) {
    if (!face.land || face.used || ['ice', 'peak', 'mountain'].includes(face.biome)) continue;
    if (world.random() > share) continue;
    const along = east.clone().cross(face.up).normalize();
    furrows(world, face, world.random.pick(tones), along);
    if (world.quality.life && world.random() < 0.5) {
      const pick = choose(crops, world.random);
      world.props.add(
        pick[0],
        world.surface.point(face.up, -0.0004),
        along,
        pick[2]?.[0] ?? 1.4,
        pick[3]?.[0],
      );
    }
  }
}

/** A harbour on the nearest coast: dock, crane, containers and a light. Returns the water point. */
export function harbour(
  world: WorldContext,
  centre: THREE.Vector3,
  kit: { crane?: boolean; light?: boolean; boats?: string[] } = {},
) {
  const coast = world
    .around(world.surface.face(centre), 6)
    .find((f: Face) => !f.land && f.neighbours.some((n) => world.faces[n].land));
  if (!coast) return null;
  const shore = coast.neighbours.map((n) => world.faces[n]).find((f) => f.land)!;
  const seaward = coast.up.clone().sub(shore.up);
  const edge = shore.up.clone().lerp(coast.up, 0.5).normalize();
  world.props.add('dock', world.surface.point(edge, -0.0015), seaward, 1.2);
  if (kit.crane) {
    world.props.add(
      'harbor-crane',
      world.surface.point(offset(shore.up, 0.5, 0.004), -0.0004),
      seaward,
      1.1,
    );
    world.props.add(
      'containers',
      world.surface.point(offset(shore.up, 2.5, 0.006), -0.0004),
      seaward,
      1,
    );
  }
  if (kit.light)
    world.props.add(
      'lighthouse',
      world.surface.point(offset(shore.up, 4, 0.006), -0.0004),
      null,
      1.2,
    );
  if (kit.boats && world.quality.life)
    for (let i = 0; i < 2; i++)
      world.props.add(
        world.random.pick(kit.boats),
        coast.up
          .clone()
          .multiplyScalar(1.0004)
          .add(
            seaward
              .clone()
              .normalize()
              .multiplyScalar(0.004 * (i + 1)),
          ),
        seaward.clone().cross(coast.up),
        1,
      );
  return coast.up.clone();
}

/** A ring of props, e.g. walls around an enclave or stones around a ritual site. */
export function ring(
  world: WorldContext,
  centre: THREE.Vector3,
  radius: number,
  kind: string,
  count: number,
  size = 1,
  tint?: Tone,
) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const dir = offset(centre, a, radius);
    if (!world.surface.land(dir)) continue;
    const next = offset(centre, a + 0.1, radius);
    world.props.add(kind, world.surface.point(dir, -0.0004), next.sub(dir), size, tint);
  }
}

/** A queue of people facing a building, e.g. a ration line. */
export function queue(
  world: WorldContext,
  start: THREE.Vector3,
  heading: number,
  length: number,
  kind: string,
  tints: Tone[],
) {
  for (let i = 0; i < length; i++) {
    const dir = offset(start, heading, 0.0028 * i);
    const ahead = offset(start, heading, 0.0028 * (i - 1));
    world.props.add(kind, world.surface.point(dir, 0), ahead.sub(dir), 1, world.random.pick(tints));
  }
}

/** Props sprinkled at random inside a disc. */
export function sprinkle(
  world: WorldContext,
  centre: THREE.Vector3,
  radius: number,
  picks: Pick[],
  count: number,
) {
  for (let i = 0; i < count; i++) {
    const dir = offset(centre, world.random() * Math.PI * 2, radius * Math.sqrt(world.random()));
    if (!world.surface.land(dir)) continue;
    const pick = choose(picks, world.random);
    const [lo, hi] = pick[2] ?? [1, 1];
    world.props.add(
      pick[0],
      world.surface.point(dir, -0.0004),
      offset(dir, world.random() * 6, 0.01).sub(dir),
      lo + (hi - lo) * world.random(),
      pick[3]?.length ? world.random.pick(pick[3]) : undefined,
    );
  }
}
