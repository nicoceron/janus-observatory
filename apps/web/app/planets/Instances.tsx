import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { propGeometry, propParts, type PropPart } from './props/library';
import { sample, type InstanceGroup, type MoverGroup } from './scene/collect';

export type PropMaterials = Record<PropPart, THREE.Material>;
const tinted: PropPart[] = ['tint', 'metal'];

function meshesFor(kind: string, count: number, materials: PropMaterials, tints: Float32Array) {
  const parts = propGeometry(kind);
  return propParts
    .filter((part) => parts[part])
    .map((part) => {
      const mesh = new THREE.InstancedMesh(parts[part]!, materials[part], count);
      mesh.frustumCulled = false;
      if (tinted.includes(part)) mesh.instanceColor = new THREE.InstancedBufferAttribute(tints, 3);
      return mesh;
    });
}

/** Static props of one kind: one instanced mesh per material part. */
export function InstanceView({ group, materials }: { group: InstanceGroup; materials: PropMaterials }) {
  const meshes = useMemo(
    () => meshesFor(group.kind, group.matrices.length / 16, materials, group.tints),
    [group, materials],
  );
  useLayoutEffect(() => {
    for (const mesh of meshes) {
      (mesh.instanceMatrix.array as Float32Array).set(group.matrices);
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, [meshes, group]);
  useEffect(() => () => meshes.forEach((mesh) => mesh.dispose()), [meshes]);
  return (
    <>
      {meshes.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </>
  );
}

const position = new THREE.Vector3(),
  forward = new THREE.Vector3(),
  x = new THREE.Vector3(),
  y = new THREE.Vector3(),
  z = new THREE.Vector3();

function write(array: Float32Array, i: number, s: number) {
  y.copy(position).normalize();
  z.copy(forward).addScaledVector(y, -forward.dot(y));
  if (z.lengthSq() < 1e-12) z.set(0, 1, 0).cross(y);
  z.normalize();
  x.crossVectors(y, z);
  const o = i * 16;
  array[o] = x.x * s;
  array[o + 1] = x.y * s;
  array[o + 2] = x.z * s;
  array[o + 3] = 0;
  array[o + 4] = y.x * s;
  array[o + 5] = y.y * s;
  array[o + 6] = y.z * s;
  array[o + 7] = 0;
  array[o + 8] = z.x * s;
  array[o + 9] = z.y * s;
  array[o + 10] = z.z * s;
  array[o + 11] = 0;
  array[o + 12] = position.x;
  array[o + 13] = position.y;
  array[o + 14] = position.z;
  array[o + 15] = 1;
}

/** Travelling props of one kind, advanced along their routes by the shared world clock. */
export function MoverView({
  group,
  materials,
  clock,
}: {
  group: MoverGroup;
  materials: PropMaterials;
  clock: RefObject<number>;
}) {
  const count = group.route.length;
  const meshes = useMemo(() => meshesFor(group.kind, count, materials, group.tints), [group, materials, count]);
  const array = useMemo(() => new Float32Array(count * 16), [count]);
  const root = useRef<THREE.Group>(null);
  const last = useRef(Number.NaN);
  const place = (t: number) => {
    last.current = t;
    for (let i = 0; i < count; i++) {
      sample(group.routes[group.route[i]], group.phase[i] + group.speed[i] * t, group.pingpong[i] === 1, position, forward);
      write(array, i, group.scale[i]);
    }
    for (const mesh of meshes) {
      (mesh.instanceMatrix.array as Float32Array).set(array);
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
  useLayoutEffect(() => place(clock.current ?? 0));
  useFrame(() => {
    const t = clock.current ?? 0;
    if (t === last.current) return;
    for (let node: THREE.Object3D | null = root.current; node; node = node.parent) if (!node.visible) return;
    place(t);
  });
  useEffect(() => () => meshes.forEach((mesh) => mesh.dispose()), [meshes]);
  return (
    <group ref={root}>
      {meshes.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </group>
  );
}
