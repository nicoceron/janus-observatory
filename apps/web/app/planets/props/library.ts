import * as THREE from 'three';
import { Mesher, type Tone } from '../kit';
import { buildings } from './buildings';
import { nature } from './nature';
import { people } from './people';
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

/** Planet radii per person unit. Everything on every world shares this one scale. */
export const U = 0.0075;

const defs: Record<string, PropDef> = { ...people, ...nature, ...buildings, ...vehicles };
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
