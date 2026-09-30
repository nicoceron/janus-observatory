import * as THREE from 'three';
import type { WorldArt } from './worlds';

/** Authored world seeds describe invented geography, never measured planetary surfaces. */
export function landform(x: number, y: number, z: number, seed: number) {
  const phase = seed * 0.037;
  return (
    Math.sin(x * 3.1 + phase) * 0.45 +
    Math.cos(y * 3.8 - phase * 0.7) * 0.32 +
    Math.sin(z * 3.4 + phase * 1.3) * 0.29 +
    Math.sin((x - y + z) * 4.2 + phase) * 0.1
  );
}

/** Radius of the raised land plate before scenario carving (quarry, rift) is applied. */
export function landRadius(art: WorldArt, n: THREE.Vector3) {
  const elevation = landform(n.x, n.y, n.z, art.seed) - art.seaLevel;
  return 1.025 + Math.max(0, elevation) * art.relief * 0.45;
}

/** S2's open pit, shared by the carved terrain and the bench construction above it. */
export const quarrySite = [-8, 19] as const;
export const quarryAxis = new THREE.Vector3(
  Math.sin(THREE.MathUtils.degToRad(quarrySite[0])) *
    Math.cos(THREE.MathUtils.degToRad(quarrySite[1])),
  Math.sin(THREE.MathUtils.degToRad(quarrySite[1])),
  Math.cos(THREE.MathUtils.degToRad(quarrySite[0])) *
    Math.cos(THREE.MathUtils.degToRad(quarrySite[1])),
);
/** Irregular bench outline of S2's pit in its tangent frame, shared by carving and benches. */
export function quarryOutline(radius: number, angle: number): [number, number] {
  return [
    Math.cos(angle) * radius * (1 + 0.1 * Math.sin(angle * 3 + 0.8)),
    Math.sin(angle) * radius * (0.83 + 0.08 * Math.cos(angle * 5)),
  ];
}
const quarryTurn = new THREE.Quaternion().setFromUnitVectors(
  new THREE.Vector3(0, 1, 0),
  quarryAxis,
);
const quarryX = new THREE.Vector3(1, 0, 0).applyQuaternion(quarryTurn),
  quarryZ = new THREE.Vector3(0, 0, 1).applyQuaternion(quarryTurn);
// The outline parameter is not its polar angle, so index the true edge radius by polar angle.
const quarryEdge = Array.from({ length: 721 }, (_, i) =>
  quarryOutline(0.51, (i / 720) * Math.PI * 2),
)
  .map(([x, z]) => ({ angle: Math.atan2(z, x), radius: Math.hypot(x, z) }))
  .sort((a, b) => a.angle - b.angle);
function quarryEdgeRadius(angle: number) {
  const after = quarryEdge.findIndex((sample) => sample.angle >= angle);
  const b = quarryEdge[after === -1 ? 0 : after],
    a = quarryEdge[after <= 0 ? quarryEdge.length - 1 : after - 1];
  const span = (b.angle - a.angle + Math.PI * 2) % (Math.PI * 2) || 1;
  const t = ((angle - a.angle + Math.PI * 2) % (Math.PI * 2)) / span;
  return THREE.MathUtils.lerp(a.radius, b.radius, t);
}

/**
 * Depth carved under the benches. It follows the bench outline rather than a circle, so the
 * ground drops away beneath every tier yet never leaves a visible ditch around the rim.
 */
export function quarryDepth(n: THREE.Vector3) {
  const along = n.dot(quarryAxis);
  if (along <= 0.7) return 0;
  // Gnomonic tangent coordinates match how the benches are wrapped onto the globe.
  const x = (n.dot(quarryX) / along) * 1.025,
    z = (n.dot(quarryZ) / along) * 1.025;
  const rho = Math.hypot(x, z) / quarryEdgeRadius(Math.atan2(z, x));
  return THREE.MathUtils.clamp((1.05 - rho) / 0.15, 0, 1) * 0.1 + Math.max(0, 1 - rho) * 0.3;
}

/** Ground level around the pit; the top bench sits flush with the lowest rim point. */
export function quarryBase(art: WorldArt) {
  let lowest = Infinity;
  for (let i = 0; i < 48; i++) {
    const [x, z] = quarryOutline(0.51, (i / 48) * Math.PI * 2);
    const direction = quarryAxis
      .clone()
      .multiplyScalar(1.025)
      .addScaledVector(quarryX, x)
      .addScaledVector(quarryZ, z)
      .normalize();
    lowest = Math.min(lowest, landRadius(art, direction));
  }
  return lowest - 0.004;
}

/**
 * Raised continental plates meet a lower faceted ocean with real, closed cliff geometry.
 * The coast follows the zero contour of the authored landform field through each facet, so
 * shorelines read as continuous curves instead of a triangle-by-triangle sawtooth.
 */
export function terrainGeometry(art: WorldArt, mobile: boolean) {
  const base = new THREE.IcosahedronGeometry(1, mobile ? 5 : 7);
  const p = base.attributes.position;
  const positions: number[] = [],
    colors: number[] = [];
  const ocean = new THREE.Color(art.ocean),
    shore = new THREE.Color(art.shore),
    land = new THREE.Color(art.land),
    highland = new THREE.Color(art.highland);
  const id = (v: THREE.Vector3) =>
    v
      .toArray()
      .map((n) => n.toFixed(5))
      .join(',');
  const emit = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.Color) => {
    positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    for (let j = 0; j < 3; j++) colors.push(color.r, color.g, color.b);
  };
  const height = (n: THREE.Vector3) => landform(n.x, n.y, n.z, art.seed) - art.seaLevel;
  // Both facets sharing an edge must place its coast crossing identically, so interpolate in
  // canonical endpoint order and keep the crossing clear of either vertex.
  const crossings = new Map<string, THREE.Vector3>();
  const crossing = (a: THREE.Vector3, b: THREE.Vector3) => {
    const [first, second] = id(a) < id(b) ? [a, b] : [b, a];
    const key = id(first) + '|' + id(second);
    let point = crossings.get(key);
    if (!point) {
      const ha = height(first),
        hb = height(second);
      const t = THREE.MathUtils.clamp(ha / (ha - hb), 0.08, 0.92);
      point = first.clone().lerp(second, t).normalize();
      crossings.set(key, point);
    }
    return point;
  };
  const tint = (face: number) => 0.9 + ((face * 17 + art.seed) % 13) * 0.013;
  const surface = (center: THREE.Vector3, face: number, raised: boolean) => {
    const elevation = height(center);
    const rift =
      art.form === 'fractured' && Math.abs(center.x + 0.14 * Math.sin(center.y * 5) - 0.03) < 0.12;
    return (
      rift
        ? new THREE.Color('#382e4b')
        : !raised
          ? ocean
          : elevation < 0.09
            ? shore
            : elevation > 0.56
              ? highland
              : land
    )
      .clone()
      .multiplyScalar(tint(face));
  };
  const cliff = shore.clone().lerp(land, 0.35).multiplyScalar(0.78);
  // A coast edge runs with land on its left, seen from outside; the wall faces the sea.
  // The beach band above it already supplies the light rim, so one quad keeps the budget.
  const wall = (a: THREE.Vector3, b: THREE.Vector3) => {
    const topA = point(a, true),
      topB = point(b, true),
      lowA = point(a, false),
      lowB = point(b, false);
    emit(topA, lowA, topB, cliff);
    emit(topB, lowA, lowB, cliff);
  };
  const point = (n: THREE.Vector3, raised: boolean) => {
    const elevation = landform(n.x, n.y, n.z, art.seed) - art.seaLevel;
    const rift = art.form === 'fractured' && Math.abs(n.x + 0.14 * Math.sin(n.y * 5) - 0.03) < 0.1;
    const quarry = art.form === 'extraction' ? quarryDepth(n) : 0;
    return n
      .clone()
      .multiplyScalar(
        (raised ? 1.025 + Math.max(0, elevation) * art.relief * 0.45 : 0.925) -
          (rift ? 0.13 : 0) -
          quarry,
      );
  };
  for (let i = 0; i < p.count; i += 3) {
    const face = i / 3;
    const v = [0, 1, 2].map((j) => {
      // Weld duplicate seam coordinates before raising adjacent faces to different levels.
      const n = new THREE.Vector3().fromBufferAttribute(p, i + j);
      n.set(Math.round(n.x * 1e6) / 1e6, Math.round(n.y * 1e6) / 1e6, Math.round(n.z * 1e6) / 1e6);
      return n.normalize();
    });
    const raised = v.map((n) => height(n) > 0);
    const landCount = raised.filter(Boolean).length;
    if (landCount === 0 || landCount === 3) {
      const center = v[0].clone().add(v[1]).add(v[2]).normalize();
      const color = surface(center, face, landCount === 3);
      emit(point(v[0], !!landCount), point(v[1], !!landCount), point(v[2], !!landCount), color);
      continue;
    }
    // Split the facet at the coast: one lone vertex and two on the opposite side.
    const lone = raised.findIndex((r) => r === (landCount === 1));
    const loneLand = raised[lone];
    const l = v[lone],
      q = v[(lone + 1) % 3],
      r = v[(lone + 2) % 3];
    const x = crossing(l, q),
      y = crossing(l, r);
    const loneCenter = l.clone().add(x).add(y).normalize(),
      otherCenter = x.clone().add(q).add(r).add(y).normalize();
    // Land beside a new contour is always a beach band; the sea keeps its facet colour.
    const loneColor = loneLand
      ? shore.clone().multiplyScalar(tint(face))
      : surface(loneCenter, face, false);
    const otherColor = loneLand
      ? surface(otherCenter, face, false)
      : shore.clone().multiplyScalar(tint(face));
    emit(point(l, loneLand), point(x, loneLand), point(y, loneLand), loneColor);
    emit(point(x, !loneLand), point(q, !loneLand), point(r, !loneLand), otherColor);
    emit(point(x, !loneLand), point(r, !loneLand), point(y, !loneLand), otherColor);
    if (loneLand) wall(x, y);
    else wall(y, x);
  }
  base.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function terrainMaterial() {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.84,
    metalness: 0,
  });
}
