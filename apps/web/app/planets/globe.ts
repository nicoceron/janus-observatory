import * as THREE from 'three';
import { Mesher, type Tone } from './kit';
import { fbm } from './random';
import { continentField, latLon, rangeField } from './continents';

export type Biome =
  | 'deep'
  | 'ocean'
  | 'shallows'
  | 'shore'
  | 'lowland'
  | 'forest'
  | 'jungle'
  | 'upland'
  | 'mountain'
  | 'peak'
  | 'desert'
  | 'tundra'
  | 'ice'
  | 'seaice';
export type Palette = Record<Biome, Tone>;

export type Face = {
  index: number;
  corners: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  centre: THREE.Vector3;
  up: THREE.Vector3;
  lat: number;
  lon: number;
  /** Signed elevation: land above zero, sea below. */
  elevation: number;
  land: boolean;
  coastal: boolean;
  neighbours: number[];
  biome: Biome;
  /** Final paint. Scenario styles overwrite it for built, cultivated or engineered faces. */
  tone: Tone;
  /** Occupied by a scenario structure, so later decoration skips it. */
  used: boolean;
  /** Edge length of the face; props scale with it so density survives quality changes. */
  size: number;
};

export type GlobeSpec = {
  detail: number;
  /** Maximum radial rise of the highest terrain, relative to a unit sphere. */
  relief: number;
  /** Terrace count: quantised heights give the stepped silhouette of hand-built dioramas. */
  steps: number;
  height: (v: THREE.Vector3) => number;
  /** Clamp everything below zero to a flat datum, as calm water or a smooth plain. */
  flatten: boolean;
};

export function buildFaces(spec: GlobeSpec): Face[] {
  const icosahedron = new THREE.IcosahedronGeometry(1, spec.detail);
  const source = icosahedron.getAttribute('position');
  const keys = new Map<string, number>();
  const unit: THREE.Vector3[] = [];
  const indices: number[] = [];
  for (let i = 0; i < source.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(source, i).normalize();
    const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
    let index = keys.get(key);
    if (index === undefined) {
      index = unit.length;
      keys.set(key, index);
      unit.push(v);
    }
    indices.push(index);
  }
  icosahedron.dispose();
  const elevation = unit.map((v) => spec.height(v));
  const placed = unit.map((v, i) => {
    const e = elevation[i];
    const lift =
      e > 0 ? (0.25 + Math.floor(Math.min(1, e) * spec.steps)) / spec.steps : spec.flatten ? 0 : e;
    return v.clone().multiplyScalar(1 + spec.relief * lift);
  });

  const edgeOwners = new Map<string, number[]>();
  const faces: Face[] = [];
  for (let f = 0; f < indices.length / 3; f++) {
    const [ia, ib, ic] = [indices[f * 3], indices[f * 3 + 1], indices[f * 3 + 2]];
    const corners: Face['corners'] = [placed[ia].clone(), placed[ib].clone(), placed[ic].clone()];
    const centre = corners[0].clone().add(corners[1]).add(corners[2]).divideScalar(3);
    const up = centre.clone().normalize();
    const { lat, lon } = latLon(up);
    const e = (elevation[ia] + elevation[ib] + elevation[ic]) / 3;
    const land = [elevation[ia], elevation[ib], elevation[ic]].filter((x) => x > 0).length >= 2;
    faces.push({
      index: f,
      corners,
      centre,
      up,
      lat,
      lon,
      elevation: e,
      land,
      coastal: false,
      neighbours: [],
      biome: land ? 'lowland' : 'ocean',
      tone: '#888888',
      used: false,
      size: corners[0].distanceTo(corners[1]),
    });
    for (const [x, y] of [
      [ia, ib],
      [ib, ic],
      [ic, ia],
    ]) {
      const key = x < y ? `${x}:${y}` : `${y}:${x}`;
      const owners = edgeOwners.get(key) ?? [];
      owners.push(f);
      edgeOwners.set(key, owners);
    }
  }
  for (const owners of edgeOwners.values())
    if (owners.length === 2) {
      faces[owners[0]].neighbours.push(owners[1]);
      faces[owners[1]].neighbours.push(owners[0]);
    }
  for (const face of faces) face.coastal = face.neighbours.some((n) => faces[n].land !== face.land);
  return faces;
}

export function globeGeometry(faces: Face[], seed: number, variance = 0.045) {
  const mesh = new Mesher(seed, variance);
  for (const face of faces) mesh.tri(face.corners[0], face.corners[1], face.corners[2], face.tone);
  return mesh.geometry();
}

/** Scenario climate knobs. Each is an interpretation of a story, never a measured quantity. */
export type Climate = {
  /** Positive values drown coasts, negative values expose shelves. */
  sea: number;
  /** Absolute latitude where permanent ice begins. */
  iceLat: number;
  /** Shifts the desert belt: positive is drier. */
  aridity: number;
  /** Shifts forest cover: positive is greener. */
  greenery: number;
};

const EARTH_SEED = 2081;

/** One shared elevation field, so every future is recognisably the same Earth. */
export function earthHeight(sea: number) {
  return (v: THREE.Vector3) => {
    const base = continentField(v) + 0.2 * fbm(v.x, v.y, v.z, EARTH_SEED, 4, 2.3) - 0.04 - sea;
    if (base <= 0) return Math.max(-1, base);
    const ridge = 1 - Math.abs(fbm(v.x, v.y, v.z, EARTH_SEED + 9, 3, 3.6));
    return Math.min(
      1,
      0.02 + base * 0.45 + rangeField(v) * 0.75 + Math.max(0, ridge - 0.55) * 0.55,
    );
  };
}

const gaussian = (x: number, mean: number, width: number) =>
  Math.exp(-((x - mean) ** 2) / (2 * width * width));

export function earthBiome(face: Face, climate: Climate): Biome {
  const { x, y, z } = face.up;
  const absLat = Math.abs(face.lat) + fbm(x, y, z, EARTH_SEED + 3, 3, 3) * 7;
  if (absLat > climate.iceLat) return face.land ? 'ice' : 'seaice';
  if (!face.land) {
    const depth = -face.elevation;
    return depth < 0.1 || face.coastal ? 'shallows' : depth < 0.42 ? 'ocean' : 'deep';
  }
  const h = face.elevation;
  if (h > 0.7) return 'peak';
  if (h > 0.5) return absLat > 48 ? 'peak' : 'mountain';
  if (h > 0.34) return 'upland';
  const arid =
    gaussian(absLat, 24, 10) * 0.95 + fbm(x, y, z, EARTH_SEED + 7, 3, 2.4) * 0.6 + climate.aridity;
  if (arid > 0.62) return 'desert';
  if (face.coastal && absLat < 42 && fbm(x, y, z, EARTH_SEED + 5, 2, 6) > 0.05) return 'shore';
  if (absLat > 57) return 'tundra';
  const wet = fbm(x, y, z, EARTH_SEED + 13, 3, 3) * 0.7 + climate.greenery;
  if (absLat < 15 && wet > 0.05) return 'jungle';
  if (wet > 0.08) return 'forest';
  return 'lowland';
}

export function paintEarth(faces: Face[], climate: Climate, palette: Palette) {
  for (const face of faces) {
    face.biome = earthBiome(face, climate);
    face.tone = palette[face.biome];
  }
}
