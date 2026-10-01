import * as THREE from 'three';
import type { WorldSignals } from '../../lib/world-signals';
import type { Tone } from './kit';
import {
  buildFaces,
  earthHeight,
  globeGeometry,
  paintEarth,
  type Climate,
  type Face,
  type Palette,
} from './globe';
import {
  cloud,
  fibonacci,
  WorldContext,
  type Atmosphere,
  type Layer,
  type Quality,
  type WorldModel,
} from './model';
import { frame } from './kit';
import { animals, plant, type Fauna, type Flora } from './scene/wilds';

export type EarthBrief = {
  id: string;
  seed: number;
  facing: number;
  tilt: number;
  pitch?: number;
  relief: number;
  climate: Climate;
  palette: Palette;
  clouds: { count: number; tone: Tone; speed: number; size?: number; flat?: number };
  /** Wild plants by biome, planted after settlements so forests stay out of towns. */
  flora?: Flora;
  fauna?: Fauna;
  atmosphere: (signals: WorldSignals) => Atmosphere;
  decorate: (world: WorldContext, signals: WorldSignals) => void;
};

/** Radius that contains every vertex, after each layer's own placement. */
export function extentOf(layers: Layer[]) {
  let extent = 1;
  const v = new THREE.Vector3();
  for (const layer of layers)
    for (const geometry of [layer.solid, layer.sheen, layer.glow, layer.cloud, layer.beam]) {
      if (!geometry) continue;
      const position = geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i);
        if (layer.matrix) v.applyMatrix4(layer.matrix);
        extent = Math.max(extent, v.length());
      }
    }
  return extent;
}

export function buildEarthWorld(
  brief: EarthBrief,
  signals: WorldSignals,
  quality: Quality,
): WorldModel {
  const faces = buildFaces({
    detail: quality.detail,
    relief: brief.relief,
    steps: 6,
    height: earthHeight(brief.climate.sea),
    flatten: true,
  });
  paintEarth(faces, brief.climate, brief.palette);
  const world = new WorldContext(faces, quality, brief.seed);
  brief.decorate(world, signals);

  if (brief.flora) plant(world, brief.flora);
  if (brief.fauna) animals(world, brief.fauna);

  const sky = world.layer('clouds', 'surface', {
    motion: { kind: 'spin', speed: brief.clouds.speed },
  });
  const clouds = Math.round(brief.clouds.count * 1.7 * (0.5 + quality.density * 0.5));
  for (let i = 0; i < clouds; i++) {
    const up = fibonacci(clouds, i, 0.6, world.random).normalize();
    // Keep weather out of the polar caps, where puffs would read as floating ice.
    if (Math.abs(up.y) > 0.86) continue;
    const size = (brief.clouds.size ?? 0.05) * 0.62 * world.random.range(0.7, 1.35);
    cloud(
      sky,
      frame(up.clone().multiplyScalar(1.036 + world.random() * 0.018), up, world.random() * 6),
      size,
      brief.clouds.tone,
      world.random,
      brief.clouds.flat,
    );
  }

  const layers: Layer[] = [
    { name: 'globe', frame: 'surface', solid: globeGeometry(faces, brief.seed) },
    ...world.finish(),
  ];
  return {
    id: brief.id,
    layers,
    atmosphere: brief.atmosphere(signals),
    facing: brief.facing,
    tilt: brief.tilt,
    pitch: brief.pitch ?? 0.2,
    extent: extentOf(layers),
    instances: world.props.finish(),
    movers: world.traffic.finish(),
  };
}

/** Rank faces by a score (highest first) and take the leading `count`. */
export function claim(faces: Face[], count: number, score: (face: Face) => number | null) {
  return faces
    .map((face) => ({ face, score: face.used ? null : score(face) }))
    .filter((entry): entry is { face: Face; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((entry) => entry.face);
}
