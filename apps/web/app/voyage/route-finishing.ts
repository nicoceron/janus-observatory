import * as THREE from 'three';
import { Ground, type MapPoint } from './planet-surface';
import { Sculpture } from './sculpture';
import type { WorldArt } from './worlds';

/** Visibility string-pulling removes grid zigzags without cutting through an obstacle.
 * Corner cutting is accepted only when both replacement segments remain traversable. */
export function refineRoad(
  directions: THREE.Vector3[],
  safe: (a: THREE.Vector3, b: THREE.Vector3) => boolean,
) {
  const simple = [directions[0]];
  for (let i = 0; i < directions.length - 1;) {
    let next = directions.length - 1;
    while (next > i + 1 && !safe(directions[i], directions[next])) next--;
    simple.push(directions[next]);
    i = next;
  }
  let points = simple;
  for (let pass = 0; pass < 4; pass++) {
    const rounded = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i]
        .clone()
        .lerp(points[i - 1], 0.23)
        .normalize();
      const b = points[i]
        .clone()
        .lerp(points[i + 1], 0.23)
        .normalize();
      if (safe(rounded.at(-1)!, a) && safe(a, b) && safe(b, points[i + 1])) rounded.push(a, b);
      else rounded.push(points[i]);
    }
    rounded.push(points.at(-1)!);
    points = rounded;
  }
  return points;
}
const mapPoint = (n: THREE.Vector3): MapPoint => [
  THREE.MathUtils.radToDeg(Math.atan2(n.x, n.z)),
  THREE.MathUtils.radToDeg(Math.asin(n.clone().normalize().y)),
];

/** A transport surface with a readable purpose, continuous edges and road-specific detailing. */
export function finishRoad(g: Ground, art: WorldArt, points: THREE.Vector3[], width: number) {
  const s = new Sculpture();
  const normals = points.map((p) => p.clone().normalize());
  const path = (offset: number) =>
    normals.map((n, i) => {
      const tangent = normals[Math.min(i + 1, normals.length - 1)]
        .clone()
        .sub(normals[Math.max(0, i - 1)]);
      const across = new THREE.Vector3().crossVectors(n, tangent).normalize();
      return mapPoint(n.clone().addScaledVector(across, offset).normalize());
    });
  const urban = art.form === 'ecumenopolis';
  const local = art.form === 'reclaimed';
  const quarry = art.form === 'extraction';
  const center = path(0);
  // Dark inset and modest shoulders read as a constructed road rather than a broad painted ribbon.
  g.trail(
    s,
    center,
    width * 1.1,
    urban ? '#87918d' : local ? '#9a9971' : quarry ? '#97714b' : '#6e6460',
    0.004,
  );
  g.trail(
    s,
    center,
    width,
    urban ? '#394b54' : local ? '#ac9870' : quarry ? '#a7865c' : '#998675',
    0.006,
  );
  if (urban) {
    for (const side of [-1, 1])
      g.trail(s, path(side * width * 0.89), width * 0.027, '#d5c9a3', 0.009);
    // Fine lane markings establish direction and scale; never mark a village trail as a highway.
    for (let i = 8; i < points.length - 9; i += 17)
      g.trail(s, center.slice(i, i + 7), width * 0.032, '#d8c492', 0.01);
  } else {
    for (const side of [-1, 1])
      g.trail(
        s,
        path(side * width * 0.46),
        width * (local ? 0.17 : 0.2),
        local ? '#786f51' : quarry ? '#816a4c' : '#635e59',
        0.009,
      );
    // Separated shoulder stones/berms leave the carriageway clear.
    for (let i = 12; i < points.length - 12; i += quarry ? 15 : 29) {
      const side = i % 2 ? 1 : -1;
      const n = g.direction(...path(side * width * 1.05)[i]);
      const p = g.project(n, 0.004);
      const m = new THREE.Matrix4().compose(
        p,
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n),
        new THREE.Vector3(1, 1, 1),
      );
      s.ico(
        local ? 0.007 : 0.012,
        quarry ? '#c6a47a' : '#aaa38a',
        [0, 0.003, 0],
        [1.6, 0.65, 1],
        m,
        0,
      );
    }
  }
  return s;
}
