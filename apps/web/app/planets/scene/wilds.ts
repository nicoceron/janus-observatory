import * as THREE from 'three';
import type { Biome, Face } from '../globe';
import type { Tone } from '../kit';
import type { WorldContext } from '../model';
import { makeRoute } from './collect';
import { offset } from './surface';
import { choose, type Pick } from './towns';

/** Per biome: how many plants per face, and which species with which weights, sizes and tints. */
export type Flora = Partial<Record<Biome, { per: number; picks: Pick[] }>>;

export type Fauna = {
  herds?: {
    kind: string;
    biomes: Biome[];
    count: number;
    size: [number, number];
    tints?: Tone[];
    roam?: boolean;
    scale?: number;
  }[];
  flocks?: { count: number; kind?: string; tints?: Tone[]; size?: number };
  whales?: number;
  fish?: { count: number; tints: Tone[] };
};

const point = new THREE.Vector3();

function inside(face: Face, random: () => number) {
  let a = random(),
    b = random();
  if (a + b > 1) [a, b] = [1 - a, 1 - b];
  const [p, q, r] = face.corners;
  return point
    .copy(p)
    .addScaledVector(q.clone().sub(p), a)
    .addScaledVector(r.clone().sub(p), b)
    .clone()
    .normalize();
}

/** Forests, scrub, flowers and rocks across every free land face, by biome. */
export function plant(world: WorldContext, flora: Flora) {
  const { surface, props, random } = world;
  for (const face of world.faces) {
    const rule = flora[face.biome];
    if (!rule || face.used) continue;
    const count = rule.per * world.quality.density * (0.6 + random() * 0.8);
    const n = Math.floor(count) + (random() < count % 1 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const dir = inside(face, random);
      if (world.occupied(dir)) continue;
      const pick = choose(rule.picks, random);
      const [lo, hi] = pick[2] ?? [0.8, 1.2];
      const tint = pick[3]?.length ? pick[3][Math.floor(random() * pick[3].length)] : undefined;
      props.add(
        pick[0],
        surface.point(dir, -0.0005),
        offset(dir, random() * 6, 0.01).sub(dir),
        lo + (hi - lo) * random(),
        tint,
      );
    }
  }
}

/** Herds that graze or roam, birds that circle, and life in the sea. */
export function animals(world: WorldContext, fauna: Fauna) {
  if (!world.quality.life) return;
  const { surface, props, traffic, random } = world;
  for (const herd of fauna.herds ?? []) {
    const homes = world.faces.filter((f) => f.land && !f.used && herd.biomes.includes(f.biome));
    for (const home of world.scatter(homes, herd.count, 6)) {
      const centre = home.up.clone();
      if (world.occupied(centre)) continue;
      const members = herd.size[0] + Math.floor(random() * (herd.size[1] - herd.size[0] + 1));
      if (herd.roam) {
        const loop: THREE.Vector3[] = [];
        for (let i = 0; i < 14; i++) {
          const dir = offset(centre, (i / 14) * Math.PI * 2, 0.018 + random() * 0.006);
          if (!surface.land(dir)) continue;
          loop.push(surface.point(dir, 0));
        }
        if (loop.length > 5)
          traffic.add(herd.kind, makeRoute(loop, true), {
            count: members,
            speed: 0.0012,
            size: herd.scale ?? 1,
            tints: herd.tints,
            pingpong: false,
            random,
          });
      } else
        for (let i = 0; i < members; i++) {
          const dir = offset(centre, random() * Math.PI * 2, random() * 0.014);
          if (!surface.land(dir)) continue;
          props.add(
            herd.kind,
            surface.point(dir, 0),
            offset(dir, random() * 6, 0.01).sub(dir),
            (herd.scale ?? 1) * (0.85 + random() * 0.3),
            herd.tints ? world.random.pick(herd.tints) : undefined,
          );
        }
    }
  }
  if (fauna.flocks) {
    const land = world.faces.filter(
      (f) => f.land && ['forest', 'jungle', 'lowland', 'shore', 'upland'].includes(f.biome),
    );
    for (const home of world.scatter(land, fauna.flocks.count, 12)) {
      const loop: THREE.Vector3[] = [];
      const height = 1.03 + random() * 0.02;
      for (let i = 0; i < 18; i++)
        loop.push(offset(home.up, (i / 18) * Math.PI * 2, 0.025).multiplyScalar(height));
      traffic.add(fauna.flocks.kind ?? 'bird', makeRoute(loop, true), {
        count: 5 + Math.floor(random() * 5),
        speed: 0.01,
        size: fauna.flocks.size ?? 1.3,
        tints: fauna.flocks.tints,
        pingpong: false,
        random,
      });
    }
  }
  const deep = world.faces.filter((f) => !f.land && (f.biome === 'deep' || f.biome === 'ocean'));
  for (const home of world.scatter(deep, fauna.whales ?? 0, 20)) {
    const loop: THREE.Vector3[] = [];
    for (let i = 0; i < 16; i++)
      loop.push(offset(home.up, (i / 16) * Math.PI * 2, 0.03).multiplyScalar(0.9995));
    traffic.add('whale', makeRoute(loop, true), {
      count: 1 + Math.floor(random() * 2),
      speed: 0.003,
      size: 1.6,
      pingpong: false,
      random,
    });
  }
  if (fauna.fish) {
    const shallow = world.faces.filter((f) => !f.land && f.biome === 'shallows');
    for (const home of world.scatter(shallow, fauna.fish.count, 10)) {
      const loop: THREE.Vector3[] = [];
      for (let i = 0; i < 12; i++)
        loop.push(offset(home.up, (i / 12) * Math.PI * 2, 0.008).multiplyScalar(1.0003));
      traffic.add('fish', makeRoute(loop, true), {
        count: 6,
        speed: 0.003,
        size: 1,
        tints: fauna.fish.tints,
        pingpong: false,
        random,
      });
    }
  }
}
