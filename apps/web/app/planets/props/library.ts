import * as THREE from 'three';
import type { Tone } from '../kit';
import { kitGeometry, kitInfo, kitKinds, kitParts, type KitGeometry, type KitPart } from './pack';

/**
 * Every prop is a Blender kit model (Decision 036) in person units: a citizen is 1 tall, faces
 * +z and stands on y = 0. Props are drawn as instances, one draw per material part. `tint` and
 * `metal` take a per-instance colour, so one model serves many palettes; `base`, `glass` and
 * `glow` keep their authored colours. `lit` holds window panes: they glow, or are dark glass on
 * a `-dark` twin, which shares all its geometry with the lit model.
 */
export type PropPart = KitPart;
export const propParts: PropPart[] = kitParts;

/**
 * Planet radii per person unit. Worlds are drawn at toy scale, like a diorama: a house stands
 * about an eighth of the planet radius tall, so each model reads on the globe at story distance.
 */
export const U = 0.045;

/** Citizens, animals and robots: figures, which a quality tier without a life layer leaves out. */
export const living =
  /^(person|walker|worker$|worker-walk|guard|robed|porter|enhanced|astronaut|deer|bison|cow|sheep|horse|bird|whale|fish$|robot$|robot-walk|sentinel|mech|spider-bot|gardener-bot)/;
const robot = /^(robot|robot-walk|sentinel|mech|spider-bot|gardener-bot)$/;
const animal = /^(deer|bison|cow|sheep|horse|bird|whale|fish)$/;
const vehicle =
  /^(car|taxi|van|truck|haul-truck|bus|tram|maglev|rover|cart|bicycle|ship|tanker|ferry|sailboat|fishing|canoe|bio-skiff|plane|airship|glider|machine-walker|drone|hover-car|hover-bus|cargo-drone|hunter-drone|ore-hauler)$/;
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

/**
 * Toy proportions: figures and vehicles are drawn half as large again as life so they read on a
 * globe, and robots largest of all, as tall as the houses they walk between. The Blender kit's
 * figures carry their own detail, so the exaggeration is gentler than for the first drawn props.
 */
export function propScale(kind: string) {
  // Aircraft fly above everything else and stay near life size, or they would dwarf the towns.
  if (/^(plane|airship|glider)$/.test(kind)) return 0.8;
  // Ships are long and sit low on open water; near life size they still read clearly.
  if (/^(ship|tanker|ferry|ore-hauler)$/.test(kind)) return 0.75;
  if (/^(sailboat|fishing|canoe|bio-skiff)$/.test(kind)) return 1;
  if (kind === 'mech') return 1.4;
  if (kind === 'spider-bot') return 1.7;
  // A whale is already the length of a ship.
  if (kind === 'whale') return 1.3;
  const group = propGroup(kind);
  if (group === 'robot') return 1.9;
  if (group === 'person' || group === 'animal') return 1.5;
  if (group === 'vehicle') return 1.3;
  return 1;
}

const empty: KitGeometry = {};

export function hasProp(kind: string) {
  return kitInfo(kind) !== undefined;
}

/**
 * Geometry of a prop by material part. A kit model is empty until its pack has loaded; callers
 * that draw it re-read when `kitVersion()` changes.
 */
export function propGeometry(kind: string): KitGeometry {
  return kitGeometry(known(kind).name) ?? empty;
}

type Extent = { min: number[]; max: number[] };

/** A model's manifest entry. A recipe that names a model the kit lacks is a bug: fail loudly. */
function known(kind: string) {
  const info = kitInfo(kind);
  if (!info) throw new Error(`Unknown prop ${kind}: the Blender kit has no such model.`);
  return { name: kind, info };
}

/** Bounding box of a prop, from the kit manifest: known before any geometry has loaded. */
export function propExtent(kind: string): Extent {
  return known(kind).info;
}

const extent = propExtent;

/** Height of a prop above its ground, in person units. */
export function propHeight(kind: string) {
  return extent(kind).max[1];
}

/** Half-width of a prop's ground footprint, in person units. */
export function propFootprint(kind: string) {
  const { min, max } = extent(kind);
  return Math.max(Math.abs(min[0]), Math.abs(max[0]), Math.abs(min[2]), Math.abs(max[2]));
}

/** Largest dimension of a prop, in person units. */
export function propSize(kind: string) {
  const { min, max } = extent(kind);
  return Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
}

export function propCentre(kind: string, target = new THREE.Vector3()) {
  const { min, max } = extent(kind);
  return target.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
}

export function propTint(kind: string): Tone {
  return known(kind).info.tint;
}

export function propTriangles(kind: string) {
  return known(kind).info.triangles;
}

export const propKinds = kitKinds;

/** The four citizens, standing and walking: one model per skin tone. */
export const citizenKinds = [0, 1, 2, 3].map((i) => `person-${i}`);
export const walkerKinds = [0, 1, 2, 3].map((i) => `walker-${i}`);
