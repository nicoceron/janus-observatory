import * as THREE from 'three';
import { Sculpture, type Vec } from './sculpture';

/** Authored cross sections, lofted along Z. Flat faces retain an intentionally modeled silhouette. */
export function loft(
  sections: [z: number, halfWidth: number, bottom: number, top: number][],
  sides = 8,
) {
  const rings = sections.map(([z, w, bottom, top]) =>
    Array.from({ length: sides }, (_, i) => {
      const a = (i * Math.PI * 2) / sides;
      return new THREE.Vector3(
        Math.cos(a) * w,
        (bottom + top) / 2 + (Math.sin(a) * (top - bottom)) / 2,
        z,
      );
    }),
  );
  const vertices: number[] = [];
  const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) =>
    vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());
  for (let r = 0; r < rings.length - 1; r++)
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      triangle(rings[r][i], rings[r][j], rings[r + 1][j]);
      triangle(rings[r][i], rings[r + 1][j], rings[r + 1][i]);
    }
  for (const r of [0, rings.length - 1]) {
    const center = rings[r].reduce((a, b) => a.add(b), new THREE.Vector3()).divideScalar(sides);
    for (let i = 0; i < sides; i++)
      if (r === 0) triangle(center, rings[r][(i + 1) % sides], rings[r][i]);
      else triangle(center, rings[r][i], rings[r][(i + 1) % sides]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.computeVertexNormals();
  return g;
}

export function curveTube(
  s: Sculpture,
  points: Vec[],
  radius: number,
  color: string,
  m?: THREE.Matrix4,
  segments = 12,
) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  s.add(
    new THREE.TubeGeometry(curve, segments, radius, 5, false),
    color,
    undefined,
    undefined,
    undefined,
    m,
  );
}

/** A cambered leaf, sail or wing with a designed outline, rather than a flattened solid primitive. */
export function membrane(
  rows: [x: number, width: number, y: number][],
  length: number,
  camber: number,
) {
  const points = rows.map(([x, w, y], i) =>
    Array.from({ length: 5 }, (_, j) => {
      const v = j / 4;
      return new THREE.Vector3(
        x,
        y + Math.sin(v * Math.PI) * camber,
        (v - 0.5) * w + (length * i) / (rows.length - 1),
      );
    }),
  );
  const coords: number[] = [];
  for (let i = 0; i < points.length - 1; i++)
    for (let j = 0; j < 4; j++)
      for (const p of [
        points[i][j],
        points[i + 1][j],
        points[i][j + 1],
        points[i][j + 1],
        points[i + 1][j],
        points[i + 1][j + 1],
      ])
        coords.push(...p.toArray());
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
  g.computeVertexNormals();
  return g;
}

export function panel(
  s: Sculpture,
  m: THREE.Matrix4,
  w: number,
  d: number,
  pos: Vec,
  tilt = -0.22,
) {
  const base = m
    .clone()
    .multiply(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...pos),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)),
        new THREE.Vector3(1, 1, 1),
      ),
    );
  s.box([w, 0.008, d], '#bcc5bf', [0, 0, 0], base);
  s.box([w * 0.95, 0.01, d * 0.93], '#335d7d', [0, 0.002, 0], base);
  for (let i = 1; i < 5; i++)
    s.box([0.0025, 0.012, d * 0.95], '#8faebc', [(i / 5 - 0.5) * w, 0.003, 0], base);
  for (let i = 1; i < 3; i++)
    s.box([w * 0.96, 0.012, 0.0025], '#8faebc', [0, 0.003, (i / 3 - 0.5) * d], base);
}

export function porthole(s: Sculpture, m: THREE.Matrix4, p: Vec, radius = 0.015) {
  s.add(
    new THREE.CylinderGeometry(radius * 1.22, radius * 1.22, 0.005, 10),
    '#bec8c3',
    p,
    [Math.PI / 2, 0, 0],
    undefined,
    m,
  );
  s.add(
    new THREE.CylinderGeometry(radius, radius, 0.008, 10),
    '#264958',
    [p[0], p[1], p[2] + 0.003],
    [Math.PI / 2, 0, 0],
    undefined,
    m,
  );
}
