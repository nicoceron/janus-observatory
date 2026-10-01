import * as THREE from 'three';
import type { Face } from '../globe';

const ray = new THREE.Vector3(),
  hit = new THREE.Vector3(),
  ab = new THREE.Vector3(),
  ac = new THREE.Vector3(),
  ap = new THREE.Vector3();

/**
 * Exact ground on a faceted globe. Props, roads and walkers are placed on the face plane the ray
 * from the centre actually crosses, so nothing floats above or sinks into a terrace.
 */
export class Surface {
  private cells = new Map<string, Face[]>();
  private normals: THREE.Vector3[];
  private cell: number;

  constructor(public faces: Face[]) {
    this.cell = Math.max(0.03, faces[0].size * 1.1);
    this.normals = faces.map((face) => {
      const [a, b, c] = face.corners;
      return ab.subVectors(b, a).cross(ac.subVectors(c, a)).normalize().clone();
    });
    for (const face of faces) {
      const key = this.key(face.up.x, face.up.y, face.up.z);
      const list = this.cells.get(key);
      if (list) list.push(face);
      else this.cells.set(key, [face]);
    }
  }

  private key(x: number, y: number, z: number) {
    const c = this.cell;
    return `${Math.floor(x / c)},${Math.floor(y / c)},${Math.floor(z / c)}`;
  }

  private contains(face: Face, dir: THREE.Vector3) {
    const n = this.normals[face.index];
    const [a, b, c] = face.corners;
    const t = n.dot(a) / n.dot(dir);
    hit.copy(dir).multiplyScalar(t);
    for (const [p, q] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      ab.subVectors(q, p);
      ap.subVectors(hit, p);
      if (ab.cross(ap).dot(n) < -1e-7) return false;
    }
    return true;
  }

  private neighbourhood = new Map<number, Face[]>();
  private lastX = Number.NaN;
  private lastY = Number.NaN;
  private lastZ = Number.NaN;
  private lastFace: Face | null = null;

  /** All faces in the 27 cells around a cell, cached: lookups run thousands of times per world. */
  private around(cx: number, cy: number, cz: number) {
    const key = (cx + 64) * 16384 + (cy + 64) * 128 + (cz + 64);
    let list = this.neighbourhood.get(key);
    if (!list) {
      list = [];
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
          for (let z = -1; z <= 1; z++) {
            const cell = this.cells.get(`${cx + x},${cy + y},${cz + z}`);
            if (cell) list.push(...cell);
          }
      this.neighbourhood.set(key, list);
    }
    return list;
  }

  /** The face under a direction (unit or not). */
  face(direction: THREE.Vector3) {
    ray.copy(direction).normalize();
    if (ray.x === this.lastX && ray.y === this.lastY && ray.z === this.lastZ && this.lastFace)
      return this.lastFace;
    const c = this.cell;
    const candidates = this.around(
      Math.floor(ray.x / c),
      Math.floor(ray.y / c),
      Math.floor(ray.z / c),
    );
    if (!candidates.length) return this.faces[0];
    // The four nearest centroids, without sorting the whole neighbourhood.
    const best: Face[] = [];
    const score: number[] = [];
    for (const face of candidates) {
      const d = face.up.dot(ray);
      let k = best.length;
      while (k > 0 && score[k - 1] < d) k--;
      if (k >= 4) continue;
      best.splice(k, 0, face);
      score.splice(k, 0, d);
      if (best.length > 4) {
        best.pop();
        score.pop();
      }
    }
    let found = best[0];
    for (const face of best)
      if (this.contains(face, ray)) {
        found = face;
        break;
      }
    this.lastX = ray.x;
    this.lastY = ray.y;
    this.lastZ = ray.z;
    this.lastFace = found;
    return found;
  }

  /** The ground point under a direction, lifted along the radial by `lift`. */
  point(direction: THREE.Vector3, lift = 0, target = new THREE.Vector3()) {
    const face = this.face(direction);
    const n = this.normals[face.index];
    const d = ray.copy(direction).normalize();
    const t = n.dot(face.corners[0]) / Math.max(1e-6, n.dot(d));
    return target.copy(d).multiplyScalar(t + lift);
  }

  normal(face: Face) {
    return this.normals[face.index];
  }

  land(direction: THREE.Vector3) {
    return this.face(direction).land;
  }
}

/** East and north on the tangent plane at a unit direction. */
export function tangents(up: THREE.Vector3) {
  const east = new THREE.Vector3(0, 1, 0).cross(up);
  if (east.lengthSq() < 1e-8) east.set(1, 0, 0);
  east.normalize();
  const north = up.clone().cross(east).normalize();
  return { east, north };
}

/** Walk `distance` (radians) from a unit direction along a tangent heading. */
export function offset(up: THREE.Vector3, heading: number, distance: number) {
  const { east, north } = tangents(up);
  const axis = east.multiplyScalar(Math.cos(heading)).add(north.multiplyScalar(Math.sin(heading)));
  return up
    .clone()
    .multiplyScalar(Math.cos(distance))
    .addScaledVector(axis, Math.sin(distance))
    .normalize();
}

/** Points along the great circle between two directions, at roughly `step` radians apart. */
export function arc(from: THREE.Vector3, to: THREE.Vector3, step: number) {
  const a = from.clone().normalize(),
    b = to.clone().normalize();
  const angle = a.angleTo(b);
  const count = Math.max(1, Math.ceil(angle / step));
  const points: THREE.Vector3[] = [];
  const q = new THREE.Quaternion();
  const axis = a.clone().cross(b);
  if (axis.lengthSq() < 1e-10) return [a, b];
  axis.normalize();
  for (let i = 0; i <= count; i++)
    points.push(a.clone().applyQuaternion(q.setFromAxisAngle(axis, (angle * i) / count)));
  return points;
}
