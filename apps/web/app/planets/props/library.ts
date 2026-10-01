import * as THREE from 'three';
import { Mesher, type Tone } from '../kit';
import { buildings } from './buildings';
import { nature } from './nature';
import { people } from './people';
import { scifi } from './scifi';
import { vehicles } from './vehicles';

/**
 * Every prop is built once, in person units (a citizen is 1 tall, facing +z, standing on y = 0),
 * and drawn as instances. Parts split by material: `tint` and `metal` take a per-instance colour,
 * so one model serves many palettes; `base`, `glass` and `glow` keep their authored colours.
 */
export type PropPart = 'base' | 'tint' | 'glass' | 'metal' | 'glow';
export const propParts: PropPart[] = ['base', 'tint', 'glass', 'metal', 'glow'];
export type PropMeshers = Record<PropPart, Mesher>;
export type PropDef = { tint?: Tone; build: (p: PropMeshers) => void };

/**
 * Planet radii per person unit. Worlds are drawn at toy scale, like a diorama: a house stands
 * about a fourteenth of the planet radius tall, so each model reads on the globe at story distance.
 */
export const U = 0.026;

/** Citizens, animals and robots: figures, which a quality tier without a life layer leaves out. */
export const living =
  /^(person|walker|worker|guard|robed|porter|enhanced|astronaut|deer|bison|cow|sheep|horse|bird|whale|fish|robot$|robot-walk|sentinel|mech|spider-bot)/;
const robot = /^(robot|robot-walk|sentinel|mech|spider-bot)$/;
const animal = /^(deer|bison|cow|sheep|horse|bird|whale|fish)/;
const vehicle =
  /^(car|taxi|van|truck|haul-truck|bus|tram|maglev|rover|cart|bicycle|ship|tanker|ferry|sailboat|fishing|canoe|bio-skiff|plane|airship|glider|machine-walker|drone|hover-car|hover-bus|cargo-drone)$/;
const plant =
  /^(pine|pine-tall|spruce|oak|oak-small|birch|cypress|palm|bush|shrub|cactus|dead-tree|bio-tree|bio-shroom|coral)$/;
const decor =
  /^(stump|flowers|grass|reeds|crop|vine|boulder|rocks|ice-block|lamp|bench|fence|campfire|haystack|scrap|well|totem|statue|fountain)$/;

export type PropGroup = 'structure' | 'vehicle' | 'person' | 'robot' | 'animal' | 'plant' | 'decor';

export function propGroup(kind: string): PropGroup {
  if (animal.test(kind)) return 'animal';
  if (robot.test(kind)) return 'robot';
  if (living.test(kind)) return 'person';
  if (vehicle.test(kind)) return 'vehicle';
  if (plant.test(kind)) return 'plant';
  if (decor.test(kind)) return 'decor';
  return 'structure';
}

/** Toy proportions: citizens, animals and vehicles are drawn larger than life so they stay legible. */
export function propScale(kind: string) {
  const group = propGroup(kind);
  return group === 'person' || group === 'animal' || group === 'robot'
    ? 1.5
    : group === 'vehicle'
      ? 1.3
      : 1;
}

const defs: Record<string, PropDef> = { ...people, ...nature, ...buildings, ...vehicles, ...scifi };
const cache = new Map<string, Partial<Record<PropPart, THREE.BufferGeometry>>>();

export function hasProp(kind: string) {
  return kind in defs;
}

export function propGeometry(kind: string) {
  let parts = cache.get(kind);
  if (parts) return parts;
  const def = defs[kind];
  if (!def) throw new Error(`Unknown prop ${kind}.`);
  const meshers: PropMeshers = {
    base: new Mesher(kind.length * 31 + 1),
    tint: new Mesher(kind.length * 31 + 2, 0.06),
    glass: new Mesher(kind.length * 31 + 3, 0.02),
    metal: new Mesher(kind.length * 31 + 4, 0.04),
    glow: new Mesher(kind.length * 31 + 5, 0),
  };
  def.build(meshers);
  parts = {};
  for (const part of propParts) if (meshers[part].triangles) parts[part] = meshers[part].geometry();
  cache.set(kind, parts);
  return parts;
}

const footprints = new Map<string, number>();

/** Half-width of a prop's ground footprint, in person units. */
export function propFootprint(kind: string) {
  let r = footprints.get(kind);
  if (r !== undefined) return r;
  const box = new THREE.Box3();
  for (const geometry of Object.values(propGeometry(kind))) {
    geometry!.computeBoundingBox();
    box.union(geometry!.boundingBox!);
  }
  r = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z));
  footprints.set(kind, r);
  return r;
}

export function propTint(kind: string): Tone {
  return defs[kind]?.tint ?? '#ffffff';
}

export function propTriangles(kind: string) {
  return Object.values(propGeometry(kind)).reduce(
    (sum, geometry) => sum + geometry!.getAttribute('position').count / 3,
    0,
  );
}

export const propKinds = Object.keys(defs);
