import * as THREE from 'three';
import type { Face } from '../globe';
import type { WorldContext } from '../model';
import { U } from '../props/library';
import { kitInfo } from '../props/pack';

/**
 * Natural relief as Blender kit models (Decision 038): peaks, hills, mesas, dunes, a volcano,
 * icebergs and craters. They are merged into one static layer and take the colour of the ground
 * they stand on, so each scenario's palette recolours its own mountains. Relief is placed after
 * a world's story, only on ground the story left untouched, and is interpretive scenery.
 */
type Pick = {
  kinds: string[];
  faces: Face[];
  count: number;
  spacing: number;
  size: [number, number];
};

function place(world: WorldContext, picks: Pick[]) {
  const layer = world.layer('relief', 'surface');
  const density = 0.35 + 0.65 * world.quality.density;
  let placed = 0;
  for (const pick of picks) {
    const kinds = pick.kinds.filter((kind) => kitInfo(kind));
    if (!kinds.length) continue;
    const sites = world.scatter(
      pick.faces.filter((face) => !face.used && !world.occupied(face.up)),
      Math.max(1, Math.round(pick.count * density)),
      pick.spacing,
    );
    sites.forEach((face, i) => {
      const kind = kinds[(i + placed) % kinds.length];
      const info = kitInfo(kind)!;
      const size = world.random.range(pick.size[0], pick.size[1]) * U;
      face.used = true;
      // Half the model's footprint, in radians on the unit globe.
      const reach = (Math.max(info.max[0] - info.min[0], info.max[2] - info.min[2]) / 2) * size;
      world.occupy(face.up, reach * 0.9);
      world.keepOut.push({ centre: face.centre.clone(), radius: reach * 0.8 });
      layer.kit(kind, world.on(face, world.random() * Math.PI * 2, 1, 0), size, {
        tint: face.tone,
      });
    });
    placed += sites.length;
  }
}

export function earthRelief(world: WorldContext, iceLat: number) {
  const { faces } = world;
  const land = faces.filter((face) => face.land);
  const picks: Pick[] = [
    {
      kinds: ['mountain-snow', 'mountain-b'],
      faces: land.filter((face) => face.biome === 'peak'),
      count: 9,
      spacing: 7,
      size: [0.55, 0.72],
    },
    {
      kinds: ['mountain-a', 'mountain-b'],
      faces: land.filter((face) => face.biome === 'mountain'),
      count: 9,
      spacing: 8,
      size: [0.42, 0.58],
    },
    {
      kinds: ['hill'],
      faces: land.filter((face) => face.biome === 'upland'),
      count: 9,
      spacing: 9,
      size: [0.5, 0.7],
    },
    {
      kinds: ['dune', 'mesa', 'dune'],
      faces: land.filter((face) => face.biome === 'desert' && !face.coastal),
      count: 9,
      spacing: 9,
      size: [0.5, 0.68],
    },
    {
      kinds: ['iceberg', 'ice-floe'],
      faces: faces.filter(
        (face) =>
          !face.land &&
          !face.coastal &&
          face.biome !== 'seaice' &&
          Math.abs(face.lat) > iceLat - 13 &&
          Math.abs(face.lat) < iceLat - 2,
      ),
      count: 7,
      spacing: 16,
      size: [0.45, 0.7],
    },
  ];
  // One volcano on the northern Pacific rim, where the drawn coast has a peninsula for it.
  const rim = world.faceAt(56, 160);
  if (rim.land && !rim.used)
    picks.unshift({ kinds: ['volcano'], faces: [rim], count: 1, spacing: 1, size: [0.5, 0.5] });
  place(world, picks);
}

export function bodyRelief(world: WorldContext, body: 'Moon' | 'Mars' | 'Venus') {
  if (body === 'Venus') return;
  const { faces } = world;
  // Off Earth, models are drawn at twice the toy scale, as their props are.
  if (body === 'Moon')
    return place(world, [
      { kinds: ['crater-l', 'crater-s'], faces, count: 9, spacing: 28, size: [0.9, 1.3] },
    ]);
  const dry = faces.filter((face) => face.land && Math.abs(face.lat) < 65);
  const shield = new THREE.Vector3(-0.75, 0.3, 0.58).normalize();
  let summit = dry[0];
  for (const face of dry) if (face.up.dot(shield) > summit.up.dot(shield)) summit = face;
  place(world, [
    { kinds: ['volcano'], faces: summit ? [summit] : [], count: 1, spacing: 1, size: [1.5, 1.5] },
    { kinds: ['crater-s', 'crater-l'], faces: dry, count: 5, spacing: 32, size: [0.9, 1.2] },
    { kinds: ['mesa', 'dune', 'dune'], faces: dry, count: 8, spacing: 22, size: [0.8, 1.1] },
  ]);
}
