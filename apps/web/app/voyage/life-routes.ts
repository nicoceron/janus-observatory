import * as THREE from 'three';
import paths from './activity-paths.generated.json';
import type { WorldArt } from './worlds';
import type { LifePlan } from './life-plan';
import type { MapPoint } from './planet-surface';
type BakedGeometry = {
  positions: number[];
  colorIds: number[];
  indices: number[];
  palette: number[][];
};
type BakedRoute = {
  points: number[][];
  rotations: number[][];
  map: MapPoint[];
  road: BakedGeometry | null;
  stops: BakedGeometry | null;
  length: number;
  width: number;
};
function geometry(data: BakedGeometry | null) {
  if (!data) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  g.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(
      data.colorIds.flatMap((i) => data.palette[i]),
      3,
    ),
  );
  g.setIndex(data.indices);
  const flat = g.toNonIndexed();
  g.dispose();
  flat.computeVertexNormals();
  flat.computeBoundingSphere();
  return flat;
}
/** Original-art paths are prepared by generate-activity-paths.ts, avoiding terrain planning on scroll. */
export function lifeRoute(art: WorldArt, scale: number, mobile: boolean, job: LifePlan) {
  if (scale !== (art.form === 'engineered' ? 0.84 : 1))
    throw new Error('Activity scale must match its authored world');
  const key = [art.id, mobile ? 'mobile' : 'desktop', job.subject.type, job.subject.kind].join(':');
  const data = (paths as unknown as Record<string, BakedRoute>)[key];
  if (!data) throw new Error('Missing authored activity path: ' + key);
  return {
    points: data.points.map((p) => new THREE.Vector3(...p)),
    rotations: data.rotations.map((q) => new THREE.Quaternion(...q).normalize()),
    map: data.map,
    road: geometry(data.road),
    stops: geometry(data.stops),
    length: data.length,
    width: data.width,
  };
}
