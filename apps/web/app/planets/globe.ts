import * as THREE from 'three';
import type { Tone } from './kit';
import { fbm } from './random';
import { continentField, dryField, latLon, lushField, rangeField } from './continents';

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
  /** Shared vertex ids of the corners, for blending colour across neighbouring faces. */
  vertices: [number, number, number];
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
  /**
   * The natural paint. While `tone` still equals it the face is open country and its colour is
   * blended with its neighbours; a repainted face keeps one crisp colour.
   */
  wild?: Tone;
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
  /**
   * Height of the bank where land meets water. When set, the mesh is pulled onto the coastline
   * (the zero contour of `height`), so coasts are clean curves instead of a sawtooth of faces,
   * and the land stands above the water by this much.
   */
  shore?: number;
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
  const shore = spec.shore ?? 0;
  const coast = new Uint8Array(unit.length);
  if (shore > 0) {
    // Pull the nearer end of every edge that crosses the coast onto the crossing.
    const sum = unit.map(() => new THREE.Vector3());
    const hits = new Uint16Array(unit.length);
    const seen = new Set<number>();
    const crossing = new THREE.Vector3();
    for (let f = 0; f < indices.length; f += 3)
      for (let k = 0; k < 3; k++) {
        const a = indices[f + k],
          b = indices[f + ((k + 1) % 3)];
        if (a > b) continue;
        const key = a * unit.length + b;
        if (seen.has(key)) continue;
        seen.add(key);
        const ea = elevation[a],
          eb = elevation[b];
        if (ea > 0 === eb > 0) continue;
        const t = ea / (ea - eb);
        crossing.lerpVectors(unit[a], unit[b], t);
        const moved = t < 0.5 ? a : b;
        sum[moved].add(crossing);
        hits[moved]++;
      }
    for (let i = 0; i < unit.length; i++)
      if (hits[i]) {
        unit[i].copy(sum[i]).normalize();
        elevation[i] = 0;
        coast[i] = 1;
      }
  }
  const lift = (e: number) =>
    e > 0 ? (0.25 + Math.floor(Math.min(1, e) * spec.steps)) / spec.steps : spec.flatten ? 0 : e;
  /** Where a vertex sits for a land face and for a sea face. */
  const landAt = unit.map((v, i) =>
    v
      .clone()
      .multiplyScalar(1 + shore + spec.relief * (coast[i] ? lift(1e-6) : lift(elevation[i]))),
  );
  const seaAt =
    shore > 0
      ? unit.map((v, i) =>
          v.clone().multiplyScalar(1 + spec.relief * lift(Math.min(0, elevation[i]))),
        )
      : landAt;

  const edgeOwners = new Map<number, number[]>();
  const faces: Face[] = [];
  const middle = new THREE.Vector3();
  for (let f = 0; f < indices.length / 3; f++) {
    const [ia, ib, ic] = [indices[f * 3], indices[f * 3 + 1], indices[f * 3 + 2]];
    const heights = [elevation[ia], elevation[ib], elevation[ic]];
    let land: boolean;
    if (shore > 0) {
      const above = heights.some((x) => x > 0),
        below = heights.some((x) => x < 0);
      // A face of three coast vertices is decided by the ground under its middle.
      land =
        above || below
          ? above
          : spec.height(middle.copy(unit[ia]).add(unit[ib]).add(unit[ic]).normalize()) > 0;
    } else land = heights.filter((x) => x > 0).length >= 2;
    const at = shore > 0 && !land ? seaAt : landAt;
    const corners: Face['corners'] = [at[ia].clone(), at[ib].clone(), at[ic].clone()];
    const centre = corners[0].clone().add(corners[1]).add(corners[2]).divideScalar(3);
    const up = centre.clone().normalize();
    const { lat, lon } = latLon(up);
    faces.push({
      index: f,
      corners,
      vertices: [ia, ib, ic],
      centre,
      up,
      lat,
      lon,
      elevation: (heights[0] + heights[1] + heights[2]) / 3,
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
      const key = x < y ? x * unit.length + y : y * unit.length + x;
      const owners = edgeOwners.get(key);
      if (owners) owners.push(f);
      else edgeOwners.set(key, [f]);
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

const parsed = new Map<Tone, THREE.Color>();
function colourOf(tone: Tone) {
  let colour = parsed.get(tone);
  if (!colour) parsed.set(tone, (colour = new THREE.Color(tone)));
  return colour;
}

export type GlobeLook = {
  /**
   * Draw faces below the datum as water: a smooth, glossy sea in its own geometry. Bodies whose
   * low ground is dry (crater floors) leave this off.
   */
  water?: boolean;
  /** Colour of the bank between land and water. */
  bank?: Tone;
};

/**
 * The globe's surface. Open country is coloured smoothly, each vertex taking the mean of the
 * faces around it, so biomes grade into one another; faces a scenario repainted stay crisp.
 * Land keeps flat facets. Water is one smooth sphere so it can catch a highlight.
 */
export function globeGeometry(faces: Face[], look: GlobeLook = {}) {
  let vertexCount = 0;
  for (const face of faces) vertexCount = Math.max(vertexCount, ...face.vertices);
  vertexCount += 1;
  // Mean colour of the open faces around each vertex, kept apart for land and water.
  const mix = [new Float32Array(vertexCount * 4), new Float32Array(vertexCount * 4)];
  const wet = (face: Face) => (look.water && !face.land ? 1 : 0);
  const open = (face: Face) => face.wild !== undefined && face.tone === face.wild;
  for (const face of faces) {
    if (!open(face)) continue;
    const colour = colourOf(face.tone),
      sums = mix[wet(face)];
    for (const v of face.vertices) {
      sums[v * 4] += colour.r;
      sums[v * 4 + 1] += colour.g;
      sums[v * 4 + 2] += colour.b;
      sums[v * 4 + 3] += 1;
    }
  }
  const land = { position: [] as number[], normal: [] as number[], color: [] as number[] };
  const sea = { position: [] as number[], normal: [] as number[], color: [] as number[] };
  const n = new THREE.Vector3(),
    u = new THREE.Vector3(),
    w = new THREE.Vector3();
  const push = (
    target: typeof land,
    p: THREE.Vector3,
    normal: THREE.Vector3,
    r: number,
    g: number,
    b: number,
  ) => {
    target.position.push(p.x, p.y, p.z);
    target.normal.push(normal.x, normal.y, normal.z);
    target.color.push(r, g, b);
  };
  for (const face of faces) {
    const water = wet(face) === 1;
    const target = water ? sea : land;
    const [a, b, c] = face.corners;
    n.crossVectors(u.subVectors(b, a), w.subVectors(c, a)).normalize();
    const blended = open(face);
    const flat = colourOf(face.tone);
    const sums = mix[wet(face)];
    for (let k = 0; k < 3; k++) {
      const p = face.corners[k],
        v = face.vertices[k];
      const count = sums[v * 4 + 3];
      // Water is shaded as a sphere; land keeps the facet's own normal.
      const normal = water ? u.copy(p).normalize() : n;
      if (blended && count > 0)
        push(
          target,
          p,
          normal,
          sums[v * 4] / count,
          sums[v * 4 + 1] / count,
          sums[v * 4 + 2] / count,
        );
      else push(target, p, normal, flat.r, flat.g, flat.b);
    }
  }
  if (look.water) {
    // The bank: a short wall wherever a land face meets a water face along a shared edge.
    const bank = colourOf(look.bank ?? '#d9c7a3');
    const mid = new THREE.Vector3();
    for (const face of faces) {
      if (!face.land) continue;
      for (const index of face.neighbours) {
        const other = faces[index];
        if (other.land) continue;
        const top: THREE.Vector3[] = [],
          low: THREE.Vector3[] = [];
        for (let k = 0; k < 3; k++) {
          const at = other.vertices.indexOf(face.vertices[k]);
          if (at < 0) continue;
          top.push(face.corners[k]);
          low.push(other.corners[at]);
        }
        if (top.length !== 2 || top[0].distanceToSquared(low[0]) < 1e-12) continue;
        n.crossVectors(u.subVectors(top[1], top[0]), w.subVectors(low[0], top[0])).normalize();
        // Face the wall away from the land it holds up.
        mid.addVectors(top[0], top[1]).multiplyScalar(0.5);
        const flip = n.dot(w.subVectors(face.centre, mid)) > 0;
        if (flip) n.negate();
        const tone = colourOf(face.tone);
        const r = (bank.r * 2 + tone.r) / 3,
          g = (bank.g * 2 + tone.g) / 3,
          b = (bank.b * 2 + tone.b) / 3;
        const quad = flip
          ? [top[0], low[0], low[1], top[0], low[1], top[1]]
          : [top[0], low[1], low[0], top[0], top[1], low[1]];
        for (const p of quad) {
          const wetEdge = p === low[0] || p === low[1] ? 0.72 : 1;
          push(land, p, n, r * wetEdge, g * wetEdge, b * wetEdge);
        }
      }
    }
  }
  const build = (data: typeof land) => {
    if (!data.position.length) return undefined;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.position, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normal, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.color, 3));
    geometry.computeBoundingSphere();
    return geometry;
  };
  return { solid: build(land), sheen: build(sea) };
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
    // The authored coastline, with only a whisper of noise so it keeps its drawn shape.
    const base = continentField(v) + 0.03 * fbm(v.x, v.y, v.z, EARTH_SEED, 3, 4) - sea;
    if (base <= 0) return Math.max(-1, base);
    const ridge = 1 - Math.abs(fbm(v.x, v.y, v.z, EARTH_SEED + 9, 3, 3.6));
    const range = rangeField(v);
    return Math.min(
      1,
      0.02 + Math.min(base, 0.8) * 0.2 + range * 0.72 + Math.max(0, ridge - 0.6) * 0.35 * range,
    );
  };
}

export function earthBiome(face: Face, climate: Climate): Biome {
  const { x, y, z } = face.up;
  const absLat = Math.abs(face.lat) + fbm(x, y, z, EARTH_SEED + 3, 3, 3) * 5;
  if (absLat > climate.iceLat) return face.land ? 'ice' : 'seaice';
  if (!face.land) {
    const depth = -face.elevation;
    return depth < 0.12 || face.coastal ? 'shallows' : depth < 0.5 ? 'ocean' : 'deep';
  }
  const h = face.elevation;
  if (h > 0.66) return 'peak';
  if (h > 0.46) return absLat > 48 ? 'peak' : 'mountain';
  if (h > 0.3) return 'upland';
  // The great deserts and forests are drawn in the relief; climate knobs shift their reach.
  const dry = dryField(face.up) + fbm(x, y, z, EARTH_SEED + 7, 3, 2.4) * 0.22 + climate.aridity;
  if (dry > 0.5) return 'desert';
  if (face.coastal && absLat < 42 && fbm(x, y, z, EARTH_SEED + 5, 2, 6) > 0.05) return 'shore';
  const lush = lushField(face.up) + fbm(x, y, z, EARTH_SEED + 13, 3, 3) * 0.3 + climate.greenery;
  if (absLat > 63 && lush < 0.75) return 'tundra';
  if (lush > 0.45) return absLat < 22 ? 'jungle' : 'forest';
  return 'lowland';
}

export function paintEarth(faces: Face[], climate: Climate, palette: Palette) {
  for (const face of faces) {
    face.biome = earthBiome(face, climate);
    face.tone = palette[face.biome];
    face.wild = face.tone;
  }
}
