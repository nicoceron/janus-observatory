import * as THREE from 'three';
import { frame, Mesher, type Tone } from './kit';
import type { Face } from './globe';
import { direction } from './continents';
import { rng, type Random } from './random';
import {
  Props,
  Traffic,
  type InstanceGroup,
  type KeepOut,
  type Lane,
  type MoverGroup,
} from './scene/collect';
import { Surface } from './scene/surface';
import { kitGeometry, kitInfo } from './props/pack';

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
  /** Glossy glazing: windows, visors, solar cells. */
  glass?: THREE.BufferGeometry;
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
  /** Library props placed on the surface: buildings, plants, citizens, parked vehicles. */
  instances: InstanceGroup[];
  /** Props travelling along routes: walkers, traffic, ships, aircraft, herds and flocks. */
  movers: MoverGroup[];
  /**
   * The published table reports no artificial illumination for this body, so nothing on its
   * surface is drawn alight: props show no lamps or lit windows. Not detected is not absent;
   * the drawing simply adds no light the source does not report.
   */
  unlit?: boolean;
};

export type Quality = {
  /** Icosphere subdivision of the globe. */
  detail: number;
  /** 0..1 thinning of repeated props; landmarks and data-driven counts keep their identity. */
  density: number;
  /** Citizens, animals and traffic. Off for the ten-world overview, where they cannot be seen. */
  life: boolean;
  /** Instanced props (buildings, plants, machinery). Off only for software rasterizers. */
  furnish?: boolean;
};

export const qualities = {
  /** Terrain, landmarks and light only: the tier for software WebGL, where every triangle is CPU work. */
  minimal: { detail: 9, density: 0.35, life: false, furnish: false },
  overview: { detail: 9, density: 0.35, life: false },
  story: { detail: 14, density: 0.75, life: true },
  compact: { detail: 11, density: 0.6, life: true },
  inspect: { detail: 16, density: 1, life: true },
} satisfies Record<string, Quality>;

/** Collects the meshes of one layer by material. */
export class LayerBuilder {
  solid: Mesher;
  sheen: Mesher;
  glass: Mesher;
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
    this.glass = new Mesher(seed + 5, 0);
  }

  /** Set by an unlit world: kit models on its surface are merged without their lights. */
  dim = false;
  /**
   * Set at the light quality tiers (the overview constellation and software rendering): swarms
   * use their light models throughout, and the shared ground carries no repeats of a landmark,
   * so a world costs what its hero pieces cost.
   */
  lean = false;
  /** Satellites merged so far: the first few of a belt are drawn in full, the rest light. */
  satellites = 0;

  /**
   * Merge a Blender kit model into this layer. `m` is its frame (y up, front toward +z) and
   * `scale` its size; landmark models are authored ten times life size, so pass `s / 10`.
   * `tint` colours the model's tint part (default: the model's own colour) and `metal` its
   * metal part. `dark` draws its window panes unlit. `puff` sends the tint part to the cloud
   * surface instead of solid.
   */
  kit(
    kind: string,
    m: THREE.Matrix4,
    scale: number | [number, number, number] = 1,
    options: { tint?: Tone; metal?: Tone; dark?: boolean; lights?: boolean; puff?: boolean } = {},
  ) {
    if (this.lean && this.name === 'ground' && kind.startsWith('lm-')) return;
    const parts = kitGeometry(kind);
    if (!parts) throw new Error(`Kit model ${kind} is not loaded.`);
    const [sx, sy, sz] = typeof scale === 'number' ? [scale, scale, scale] : scale;
    const placed = m.clone().scale(new THREE.Vector3(sx, sy, sz));
    const tint = options.tint ?? kitInfo(kind)!.tint;
    // On an unlit world nothing on the surface shines, whatever the caller asked for.
    const dim = this.dim && this.frameKind === 'surface';
    this.solid.model(parts.base, placed);
    (options.puff ? this.cloud : this.solid).model(parts.tint, placed, tint);
    this.sheen.model(parts.metal, placed, options.metal);
    this.glass.model(parts.glass, placed);
    if (options.lights !== false && !dim) this.glow.model(parts.glow, placed);
    if (options.dark || dim) this.glass.model(parts.lit, placed, '#1b2733');
    else this.glow.model(parts.lit, placed);
  }

  finish(): Layer {
    const pick = (mesh: Mesher) => (mesh.triangles ? mesh.geometry() : undefined);
    return {
      name: this.name,
      frame: this.frameKind,
      ...this.options,
      solid: pick(this.solid),
      sheen: pick(this.sheen),
      glass: pick(this.glass),
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
  /** Merged ground detail that turns with the planet: streets, plazas, fields, plating. */
  ground: LayerBuilder;
  surface: Surface;
  props: Props;
  traffic = new Traffic();
  /** Direction to the story camera in the planet's own frame, when the recipe knows its pose. */
  view?: THREE.Vector3;
  /** Ground that instanced props stay off: merged relief such as mountains. */
  keepOut: KeepOut[] = [];
  /** Roads, streets and rails: traffic runs here, so standing props keep off. */
  lanes: Lane[] = [];
  private unlit = false;

  /** Whether the body's surface is drawn without any artificial light (see `WorldModel.unlit`). */
  get dim() {
    return this.unlit;
  }

  set dim(value: boolean) {
    this.unlit = value;
    for (const layer of this.layers) layer.dim = value;
  }
  private taken = new Map<string, { dir: THREE.Vector3; cos: number }[]>();
  constructor(
    public faces: Face[],
    public quality: Quality,
    seed: number,
  ) {
    this.random = rng(seed);
    this.ground = this.layer('ground', 'surface');
    this.surface = new Surface(faces);
    this.props = new Props(quality.life, quality.furnish !== false);
  }

  /** Reserve a disc of ground (radius in radians) so wild plants keep out of settlements. */
  occupy(dir: THREE.Vector3, radius: number) {
    const entry = { dir: dir.clone().normalize(), cos: Math.cos(radius) };
    const span = Math.ceil(radius / 0.12);
    const [cx, cy, cz] = this.cellOf(entry.dir);
    for (let x = -span; x <= span; x++)
      for (let y = -span; y <= span; y++)
        for (let z = -span; z <= span; z++) {
          const key = `${cx + x},${cy + y},${cz + z}`;
          const list = this.taken.get(key);
          if (list) list.push(entry);
          else this.taken.set(key, [entry]);
        }
  }

  occupied(dir: THREE.Vector3) {
    const [cx, cy, cz] = this.cellOf(dir);
    const list = this.taken.get(`${cx},${cy},${cz}`);
    if (!list) return false;
    const unit = dir.lengthSq() > 1.0001 || dir.lengthSq() < 0.9999 ? dir.clone().normalize() : dir;
    for (const t of list) if (t.dir.dot(unit) > t.cos) return true;
    return false;
  }

  private cellOf(dir: THREE.Vector3) {
    const n = dir.clone().normalize();
    return [Math.floor(n.x / 0.12), Math.floor(n.y / 0.12), Math.floor(n.z / 0.12)];
  }

  layer(name: string, kind: Layer['frame'], options: LayerBuilder['options'] = {}) {
    const layer = new LayerBuilder(name, kind, this.random.int(1, 1e6), options);
    layer.dim = this.unlit;
    layer.lean = this.quality.detail <= qualities.overview.detail;
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

  /**
   * The world's props and movers within the quality's budgets, kept off every landmark so each
   * landmark stands clear on its own ground.
   */
  population(layers: Layer[]) {
    const density = this.quality.density / qualities.story.density;
    const keepOut: KeepOut[] = [...this.keepOut];
    const v = new THREE.Vector3(),
      centre = new THREE.Vector3();
    for (const layer of layers) {
      if (!layer.landmark || layer.frame !== 'surface' || layer.matrix) continue;
      const geometries = [layer.solid, layer.sheen, layer.glow].filter((g) => !!g);
      // The landmark's axis: the mean direction of its vertices.
      centre.set(0, 0, 0);
      for (const geometry of geometries) {
        const position = geometry.getAttribute('position');
        for (let i = 0; i < position.count; i++) centre.add(v.fromBufferAttribute(position, i));
      }
      if (centre.lengthSq() < 1e-12) continue;
      centre.normalize();
      // Its ground footprint: the widest point within a little of the surface.
      let radius = 0;
      for (const geometry of geometries) {
        const position = geometry.getAttribute('position');
        for (let i = 0; i < position.count; i++) {
          v.fromBufferAttribute(position, i);
          const along = v.dot(centre);
          if (along > 1.04) continue;
          radius = Math.max(radius, v.addScaledVector(centre, -along).length());
        }
      }
      // Orbital and planet-wide structures are not ground to keep clear.
      if (radius > 0 && radius < 0.3)
        keepOut.push({ centre: centre.clone(), radius: radius * 1.05 });
    }
    return {
      instances: this.props.finish('surface', { density, keepOut, lanes: this.lanes }),
      movers: this.traffic.finish(density),
    };
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

/**
 * A satellite, oriented with its panels along the orbit. `body` tints its bus; `light` shows its
 * status lamp. `wings` is kept for callers that vary a fleet's look; the models carry their own
 * solar cells.
 */
export function satellite(
  layer: LayerBuilder,
  m: THREE.Matrix4,
  size: number,
  body: Tone,
  wings: Tone,
  light?: Tone,
) {
  // Toy scale: satellites are drawn well above life size so they read beside the larger props.
  size *= 1.6;
  // Three designs, chosen by where the satellite sits. A belt holds dozens, so only its first
  // two are drawn in full; the rest are the light model with the same frame and span.
  const p0 = m.elements;
  const pick = Math.abs(Math.round((p0[12] * 7.3 + p0[13] * 3.1 + p0[14] * 5.7) * 1000)) % 5;
  const full = !layer.lean && layer.satellites++ < 2;
  const kind = layer.lean
    ? 'sat-speck'
    : !full
      ? 'sat-mini'
      : pick < 2
        ? 'sat-a'
        : pick < 4
          ? 'sat-c'
          : 'sat-b';
  layer.kit(kind, m, size, { tint: body, lights: !!light });
}

/** A cloud: one of four shapes, tinted by the world's weather. */
export function cloud(
  layer: LayerBuilder,
  m: THREE.Matrix4,
  size: number,
  tone: Tone,
  random: Random,
  flat = 0.42,
) {
  const shape = ['cloud-a', 'cloud-b', 'cloud-c', 'cloud-d'][Math.floor(random() * 4) % 4];
  layer.kit(shape, m, [size, (size * flat) / 0.42, size], { tint: tone, puff: true });
}

/** Evenly spread directions (Fibonacci sphere), for drifting cloud fields and swarms. */
export function fibonacci(count: number, index: number, jitter = 0, random?: Random) {
  const y = 1 - ((index + 0.5) / count) * 2;
  const r = Math.sqrt(1 - y * y);
  const theta = index * Math.PI * (3 - Math.sqrt(5)) + (random ? random.range(-jitter, jitter) : 0);
  return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
}
