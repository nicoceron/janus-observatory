import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Vec = [number, number, number];

/** Bake the small dioramas into one colored mesh per world, including their flat face normals. */
export class Sculpture {
  parts: THREE.BufferGeometry[] = [];
  add(
    geometry: THREE.BufferGeometry,
    color: string | null,
    position: Vec = [0, 0, 0],
    rotation: Vec = [0, 0, 0],
    scale: Vec = [1, 1, 1],
    parent?: THREE.Matrix4,
  ) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    g.deleteAttribute('uv');
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    if (parent) matrix.premultiply(parent);
    g.applyMatrix4(matrix);
    g.computeVertexNormals();
    if (color !== null) {
      const rgb = new THREE.Color(color),
        colors = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < g.attributes.position.count; i++) rgb.toArray(colors, i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    } else if (!g.attributes.color)
      throw new Error('A composed miniature must retain its vertex colors');
    this.parts.push(g);
  }
  box(size: Vec, color: string, pos: Vec, parent?: THREE.Matrix4, rotation: Vec = [0, 0, 0]) {
    this.add(new THREE.BoxGeometry(...size), color, pos, rotation, [1, 1, 1], parent);
  }
  ico(
    radius: number,
    color: string,
    pos: Vec,
    scale: Vec = [1, 1, 1],
    parent?: THREE.Matrix4,
    detail = 0,
  ) {
    this.add(new THREE.IcosahedronGeometry(radius, detail), color, pos, [0, 0, 0], scale, parent);
  }
  cone(radius: number, height: number, color: string, pos: Vec, parent?: THREE.Matrix4, sides = 5) {
    this.add(
      new THREE.ConeGeometry(radius, height, sides),
      color,
      pos,
      [0, 0, 0],
      [1, 1, 1],
      parent,
    );
  }
  cylinder(
    top: number,
    bottom: number,
    height: number,
    color: string,
    pos: Vec,
    parent?: THREE.Matrix4,
    sides = 8,
  ) {
    this.add(
      new THREE.CylinderGeometry(top, bottom, height, sides),
      color,
      pos,
      [0, 0, 0],
      [1, 1, 1],
      parent,
    );
  }
  bar(from: Vec, to: Vec, radius: number, color: string, parent?: THREE.Matrix4) {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to),
      d = b.clone().sub(a);
    const g = new THREE.CylinderGeometry(radius, radius, d.length(), 5);
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()),
    );
    this.add(g, color, a.add(b).multiplyScalar(0.5).toArray() as Vec, [0, 0, 0], [1, 1, 1], parent);
  }
  finish() {
    const g = mergeGeometries(this.parts);
    this.parts.forEach((p) => p.dispose());
    if (!g) throw new Error('Unable to build the miniature world');
    g.computeBoundingSphere();
    return g;
  }
}

export function surface(lon: number, lat: number, radius = 1.035) {
  const a = THREE.MathUtils.degToRad(lon),
    b = THREE.MathUtils.degToRad(lat);
  const n = new THREE.Vector3(Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b));
  return new THREE.Matrix4().compose(
    n.clone().multiplyScalar(radius),
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n),
    new THREE.Vector3(1, 1, 1),
  );
}

/**
 * Bend a diorama modelled in a flat tangent frame onto the globe. Horizontal offsets follow the
 * sphere and local height becomes height above `baseRadius`, so broad sites never float at
 * their edges the way a flat plate does on a small planet.
 */
export function wrapOnGlobe(
  s: Sculpture,
  frame: THREE.Matrix4,
  baseRadius: number,
  build: (local: Sculpture) => void,
) {
  const local = new Sculpture();
  build(local);
  const g = local.finish();
  const origin = new THREE.Vector3().setFromMatrixPosition(frame);
  const x = new THREE.Vector3().setFromMatrixColumn(frame, 0).normalize(),
    z = new THREE.Vector3().setFromMatrixColumn(frame, 2).normalize();
  const p = g.attributes.position,
    v = new THREE.Vector3(),
    direction = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    direction
      .copy(origin)
      .addScaledVector(x, v.x)
      .addScaledVector(z, v.z)
      .setLength(baseRadius + v.y);
    p.setXYZ(i, direction.x, direction.y, direction.z);
  }
  s.add(g, null);
}
