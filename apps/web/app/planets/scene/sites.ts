import * as THREE from 'three';
import type { Face } from '../globe';
import type { Tone } from '../kit';
import type { WorldContext } from '../model';
import { propFootprint, propHeight, U } from '../props/library';
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
  if (world.random() < 0.5)
    world.props.add('dock', world.surface.point(edge, -0.0015), seaward, 0.55);
  if (kit.crane) {
    world.props.add(
      'harbor-crane',
      world.surface.point(offset(shore.up, 0.5, 2.5 * U), -0.0004),
      seaward,
      1.1,
    );
    world.props.add(
      'containers',
      world.surface.point(offset(shore.up, 2.5, 3 * U), -0.0004),
      seaward,
      0.6,
    );
  }
  if (kit.light)
    world.props.add(
      'lighthouse',
      world.surface.point(offset(shore.up, 4, 3 * U), -0.0004),
      null,
      1.2,
    );
  if (kit.boats && world.quality.life)
    for (let i = 0; i < 1; i++)
      world.props.add(
        world.random.pick(kit.boats),
        coast.up
          .clone()
          .multiplyScalar(1.0004)
          .add(
            seaward
              .clone()
              .normalize()
              .multiplyScalar(3 * U * (i + 1)),
          ),
        seaward.clone().cross(coast.up),
        1,
      );
  return coast.up.clone();
}

/**
 * A world's set pieces: large signature models spread round the globe so every view shows one,
 * each on cleared ground with an optional escort. Call before settlements so they always stay.
 * Each is drawn so its larger extent, height or half-length, is about `reach` planet radii,
 * landmark-sized whatever scale it was authored at; a pick's size range scales that.
 */
export function setPieces(
  world: WorldContext,
  picks: Pick[],
  count: number,
  options: {
    spacing?: number;
    eligible?: (face: Face) => boolean;
    escort?: Pick;
    escorts?: number;
    reach?: number;
  } = {},
) {
  const eligible = world.faces.filter(
    (f) =>
      f.land &&
      !f.used &&
      f.elevation < 0.45 &&
      !['ice', 'peak'].includes(f.biome) &&
      (options.eligible?.(f) ?? true),
  );
  // Prefer ground near the limb of the story view, where a tall model stands in profile rather
  // than being seen from straight above; fill from anywhere if the limb runs short.
  const view = world.view;
  const limb = view
    ? eligible.filter((f) => {
        const angle = THREE.MathUtils.radToDeg(f.up.angleTo(view));
        return angle > 50 && angle < 78;
      })
    : [];
  const sites = world.scatter(limb, count, options.spacing ?? 40);
  if (sites.length < count)
    sites.push(
      ...world
        .scatter(eligible, count, options.spacing ?? 40)
        .filter((f) => sites.every((s) => s.up.angleTo(f.up) > 0.5))
        .slice(0, count - sites.length),
    );
  sites.forEach((face, i) => {
    const pick = picks[i % picks.length];
    const [lo, hi] = pick[2] ?? [1, 1];
    const extent = Math.max(propHeight(pick[0]), propFootprint(pick[0]));
    const size = ((options.reach ?? 0.32) / U / extent) * (lo + (hi - lo) * world.random());
    world.props.add(
      pick[0],
      world.surface.point(face.up, -0.001),
      offset(face.up, world.random() * 6, 0.01).sub(face.up),
      size,
      pick[3]?.length ? world.random.pick(pick[3]) : undefined,
    );
    face.used = true;
    world.occupy(face.up, 0.16);
    const escort = options.escort;
    if (escort && world.quality.life)
      for (let k = 0; k < (options.escorts ?? 2); k++) {
        const a = world.random() * Math.PI * 2;
        const dir = offset(face.up, a, 0.2 + world.random() * 0.04);
        if (!world.surface.land(dir)) continue;
        world.props.add(
          escort[0],
          world.surface.point(dir, 0),
          face.up.clone().sub(dir),
          escort[2]?.[0] ?? 1,
          escort[3]?.length ? world.random.pick(escort[3]) : undefined,
        );
      }
  });
  return sites;
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
    const dir = offset(start, heading, 0.9 * U * i);
    const ahead = offset(start, heading, 0.9 * U * (i - 1));
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
