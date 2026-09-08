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

/** Raised continental plates meet a lower faceted ocean with real, closed cliff geometry. */
export function terrainGeometry(art: WorldArt, mobile: boolean) {
  const base = new THREE.IcosahedronGeometry(1, mobile ? 5 : 7);
  const p = base.attributes.position;
  const positions: number[] = [],
    colors: number[] = [];
  const ocean = new THREE.Color(art.ocean),
    shore = new THREE.Color(art.shore),
    land = new THREE.Color(art.land),
    highland = new THREE.Color(art.highland);
  const edges = new Map<
    string,
    { a: THREE.Vector3; b: THREE.Vector3; land: boolean; border: boolean }
  >();
  const id = (v: THREE.Vector3) =>
    v
      .toArray()
      .map((n) => n.toFixed(5))
      .join(',');
  const emit = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.Color) => {
    positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    for (let j = 0; j < 3; j++) colors.push(color.r, color.g, color.b);
  };
  const point = (n: THREE.Vector3, raised: boolean) => {
    const elevation = landform(n.x, n.y, n.z, art.seed) - art.seaLevel;
    const rift = art.form === 'fractured' && Math.abs(n.x + 0.14 * Math.sin(n.y * 5) - 0.03) < 0.1;
    const quarry =
      art.form === 'extraction'
        ? Math.max(0, (n.x * -0.131 + n.y * 0.326 + n.z * 0.937 - 0.87) / 0.13) * 0.25
        : 0;
    return n
      .clone()
      .multiplyScalar(
        (raised ? 1.025 + Math.max(0, elevation) * art.relief * 0.45 : 0.925) -
          (rift ? 0.13 : 0) -
          quarry,
      );
  };
  for (let i = 0; i < p.count; i += 3) {
    const v = [0, 1, 2].map((j) => {
      // Weld duplicate seam coordinates before raising adjacent faces to different levels.
      const n = new THREE.Vector3().fromBufferAttribute(p, i + j);
      n.set(Math.round(n.x * 1e6) / 1e6, Math.round(n.y * 1e6) / 1e6, Math.round(n.z * 1e6) / 1e6);
      return n.normalize();
    });
    const center = v[0].clone().add(v[1]).add(v[2]).normalize();
    const elevation = landform(center.x, center.y, center.z, art.seed) - art.seaLevel;
    const raised = elevation > 0;
    const rift =
      art.form === 'fractured' && Math.abs(center.x + 0.14 * Math.sin(center.y * 5) - 0.03) < 0.12;
    const color = (
      rift
        ? new THREE.Color('#382e4b')
        : !raised
          ? ocean
          : elevation < 0.09
            ? shore
            : elevation > 0.56
              ? highland
              : land
    ).clone();
    color.multiplyScalar(0.9 + (((i / 3) * 17 + art.seed) % 13) * 0.013);
    emit(point(v[0], raised), point(v[1], raised), point(v[2], raised), color);
    for (let j = 0; j < 3; j++) {
      const a = v[j],
        b = v[(j + 1) % 3],
        key = [id(a), id(b)].sort().join('|');
      const before = edges.get(key);
      if (!before) edges.set(key, { a, b, land: raised, border: false });
      else if (before.land !== raised)
        edges.set(key, {
          a: raised ? a : before.a,
          b: raised ? b : before.b,
          land: true,
          border: true,
        });
    }
  }
  for (const { a, b, border } of edges.values()) {
    if (!border) continue;
    const topA = point(a, true),
      topB = point(b, true),
      lowA = point(a, false),
      lowB = point(b, false);
    const midA = topA.clone().lerp(lowA, 0.23),
      midB = topB.clone().lerp(lowB, 0.23);
    emit(topA, midA, topB, shore);
    emit(topB, midA, midB, shore);
    const cliff = shore.clone().lerp(land, 0.35).multiplyScalar(0.72);
    emit(midA, lowA, midB, cliff);
    emit(midB, lowA, lowB, cliff);
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
