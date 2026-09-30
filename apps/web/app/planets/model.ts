import * as THREE from 'three';
import { frame, Mesher, type Tone } from './kit';
import type { Face } from './globe';
import { direction } from './continents';
import { rng, type Random } from './random';

export type Motion =
  /** Rotate about the layer's local +y axis, in radians per second. */
  | { kind: 'spin'; speed: number }
  /** Breathe glow brightness between `floor` and 1 over `period` seconds. */
  | { kind: 'pulse'; period: number; floor: number; phase?: number }
  /** Rock about local +y, used for a searchlight or a migrating band of camps. */
  | { kind: 'sway'; amplitude: number; period: number };

export type Layer = {
  name: string;
  /** Surface layers turn with the planet; orbit layers keep their own inclination. */
  frame: 'surface' | 'orbit';
  matrix?: THREE.Matrix4;
  motion?: Motion;
  /** A named landmark is kept as its own mesh so it can be selected in the explorer. */
  landmark?: string;
  solid?: THREE.BufferGeometry;
  sheen?: THREE.BufferGeometry;
  glow?: THREE.BufferGeometry;
  cloud?: THREE.BufferGeometry;
  /** Translucent additive light, such as a searchlight cone. */
  beam?: THREE.BufferGeometry;
};

export type Atmosphere = {
  /** Thin limb glow, always present on bodies with air. */
  rim: Tone;
  rimStrength: number;
  /** Whole-disc tint from pollution or dust; 0 is clear air. */
  haze: Tone;
  hazeOpacity: number;
  height: number;
};

export type WorldModel = {
  id: string;
  layers: Layer[];
  atmosphere: Atmosphere | null;
  /** Longitude turned toward the viewer, so each story's key place is in view. */
  facing: number;
  /** Axial lean in radians. */
  tilt: number;
  /** Tip toward the viewer in radians, so a northern key site is not on the horizon. */
  pitch: number;
  /** Radius that contains every layer, for framing and normalised portraits. */
  extent: number;
  /** Box centre and largest side, for standalone studies that are not centred on a globe. */
  bounds?: { centre: THREE.Vector3; size: number };
};

export type Quality = {
  /** Icosphere subdivision of the globe. */
  detail: number;
  /** 0..1 thinning of repeated props; landmarks and data-driven counts keep their identity. */
  density: number;
};

export const qualities = {
  overview: { detail: 9, density: 0.4 },
  story: { detail: 14, density: 1 },
  compact: { detail: 11, density: 0.7 },
  inspect: { detail: 16, density: 1 },
} satisfies Record<string, Quality>;

/** Collects the meshes of one layer by material. */
export class LayerBuilder {
  solid: Mesher;
  sheen: Mesher;
  glow: Mesher;
  cloud: Mesher;
  beam: Mesher;
  constructor(
    public name: string,
    public frameKind: Layer['frame'],
    seed: number,
    public options: Pick<Layer, 'matrix' | 'motion' | 'landmark'> = {},
  ) {
    this.solid = new Mesher(seed);
    this.sheen = new Mesher(seed + 1, 0.02);
    this.glow = new Mesher(seed + 2, 0);
    this.cloud = new Mesher(seed + 3, 0.05);
    this.beam = new Mesher(seed + 4, 0);
  }
  finish(): Layer {
    const pick = (mesh: Mesher) => (mesh.triangles ? mesh.geometry() : undefined);
    return {
      name: this.name,
      frame: this.frameKind,
      ...this.options,
      solid: pick(this.solid),
      sheen: pick(this.sheen),
      glow: pick(this.glow),
      cloud: pick(this.cloud),
      beam: pick(this.beam),
    };
  }
}

/** Shared helpers handed to every world recipe. */
export class WorldContext {
  random: Random;
  layers: LayerBuilder[] = [];
  /** Buildings, fields and props that turn with the planet. */
  ground: LayerBuilder;
  constructor(
    public faces: Face[],
    public quality: Quality,
    seed: number,
  ) {
    this.random = rng(seed);
    this.ground = this.layer('ground', 'surface');
  }

  layer(name: string, kind: Layer['frame'], options: LayerBuilder['options'] = {}) {
    const layer = new LayerBuilder(name, kind, this.random.int(1, 1e6), options);
    this.layers.push(layer);
    return layer;
  }

  /** The face nearest a latitude/longitude. */
  faceAt(lat: number, lon: number) {
    const target = direction(lat, lon);
    let best = this.faces[0],
      score = -Infinity;
    for (const face of this.faces) {
      const d = face.up.dot(target);
      if (d > score) {
        score = d;
        best = face;
      }
    }
    return best;
  }

  /** A frame standing on a face, a little sunk so props never float over slopes. */
  on(face: Face, spin = 0, scale = 1, sink = 0.004) {
    return frame(face.centre.clone().addScaledVector(face.up, -sink), face.up, spin, scale);
  }

  /** A frame on a face aligned to local east, so repeated blocks share one street grid. */
  aligned(face: Face, scale = 1, sink = 0.004) {
    const east = new THREE.Vector3(0, 1, 0).cross(face.up);
    if (east.lengthSq() < 1e-8) east.set(1, 0, 0);
    east.normalize();
    const south = east.clone().cross(face.up);
    return new THREE.Matrix4()
      .makeBasis(east, face.up, south)
      .scale(new THREE.Vector3(scale, scale, scale))
      .setPosition(face.centre.clone().addScaledVector(face.up, -sink));
  }

  /** Angular distance in radians between a face and a latitude/longitude. */
  distance(face: Face, lat: number, lon: number) {
    return Math.acos(THREE.MathUtils.clamp(face.up.dot(direction(lat, lon)), -1, 1));
  }

  /** A frame on a random point inside a face. */
  within(face: Face, spin = 0, scale = 1) {
    let a = this.random(),
      b = this.random();
    if (a + b > 1) [a, b] = [1 - a, 1 - b];
    const [p, q, r] = face.corners;
    const point = p
      .clone()
      .addScaledVector(q.clone().sub(p), a * 0.7 + 0.1)
      .addScaledVector(r.clone().sub(p), b * 0.7 + 0.1);
    return frame(point.addScaledVector(face.up, -0.004), face.up, spin, scale);
  }

  /** Faces within an angular radius (degrees) of a face, nearest first. */
  around(centre: Face, degrees: number) {
    const limit = Math.cos(THREE.MathUtils.degToRad(degrees));
    return this.faces
      .filter((face) => face.up.dot(centre.up) >= limit)
      .sort((a, b) => b.up.dot(centre.up) - a.up.dot(centre.up));
  }

  /** Spread `count` sites over eligible faces, keeping them at least `spacing` degrees apart. */
  scatter(eligible: Face[], count: number, spacing: number) {
    const limit = Math.cos(THREE.MathUtils.degToRad(spacing));
    const pool = [...eligible];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const chosen: Face[] = [];
    for (const face of pool) {
      if (chosen.length >= count) break;
      if (face.used) continue;
      if (chosen.every((other) => other.up.dot(face.up) < limit)) chosen.push(face);
    }
    return chosen;
  }

  /** Keep repeated decoration proportional to quality without changing data-driven totals. */
  thin(probability = 1) {
    return this.random() < probability * this.quality.density;
  }

  finish() {
    return this.layers.map((layer) => layer.finish());
  }
}

/** Orientation for an orbit inclined by `inclination` around an ascending node longitude. */
export function orbitMatrix(inclination: number, node = 0) {
  return new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(inclination, node, 0, 'YXZ'));
}

/** A frame on a circle of `radius` in the local xz plane, facing along the orbit. */
export function onOrbit(radius: number, angle: number, lift = 0) {
  const position = new THREE.Vector3(Math.cos(angle) * radius, lift, Math.sin(angle) * radius);
  const outward = position.clone().setY(0).normalize();
  return frame(position, outward, 0);
}

/** A small satellite: a box bus and two panels, oriented with its panels along the orbit. */
export function satellite(
  layer: LayerBuilder,
  m: THREE.Matrix4,
  size: number,
  body: Tone,
  wings: Tone,
  light?: Tone,
) {
  layer.sheen.box(m, size, size * 1.2, size, body);
  const wing = (x: number) =>
    m
      .clone()
      .multiply(
        new THREE.Matrix4().compose(
          new THREE.Vector3(x, size * 0.6, 0),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
  layer.sheen.panel(wing(size * 1.6), size * 0.2, size * 2.2, wings, body);
  layer.sheen.panel(wing(-size * 1.6), size * 0.2, size * 2.2, wings, body);
  if (light)
    layer.glow.box(
      m.clone().multiply(new THREE.Matrix4().makeTranslation(0, size * 1.2, 0)),
      size * 0.4,
      size * 0.4,
      size * 0.4,
      light,
    );
}

/** A puffy cloud of three or four faceted lobes. */
export function cloud(
  layer: LayerBuilder,
  m: THREE.Matrix4,
  size: number,
  tone: Tone,
  random: Random,
  flat = 0.42,
) {
  const lobes = random.int(3, 4);
  for (let i = 0; i < lobes; i++) {
    const x = (i - (lobes - 1) / 2) * size * 0.9 + random.range(-0.2, 0.2) * size;
    const r = size * random.range(0.55, 0.9) * (i === 1 || i === 2 ? 1.2 : 0.9);
    const lobe = m
      .clone()
      .multiply(
        new THREE.Matrix4().compose(
          new THREE.Vector3(x, r * 0.2, random.range(-0.3, 0.3) * size),
          new THREE.Quaternion(),
          new THREE.Vector3(1, flat, 0.85),
        ),
      );
    layer.cloud.blob(lobe, r, tone, 0.2, random.int(1, 1e6));
  }
}

/** Evenly spread directions (Fibonacci sphere), for drifting cloud fields and swarms. */
export function fibonacci(count: number, index: number, jitter = 0, random?: Random) {
  const y = 1 - ((index + 0.5) / count) * 2;
  const r = Math.sqrt(1 - y * y);
  const theta = index * Math.PI * (3 - Math.sqrt(5)) + (random ? random.range(-jitter, jitter) : 0);
  return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
}
