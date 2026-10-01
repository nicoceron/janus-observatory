import { useFrame } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';
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

function setMatrices(meshes: THREE.InstancedMesh[], matrices: Float32Array) {
  for (const mesh of meshes) {
    (mesh.instanceMatrix.array as Float32Array).set(matrices);
    mesh.instanceMatrix.needsUpdate = true;
  }
}

/**
 * Instanced meshes for one prop kind, attached to the returned group while it is mounted. The
 * meshes are created and released imperatively; React only owns the group.
 */
function useInstanced(
  kind: string,
  count: number,
  materials: PropMaterials,
  tints: Float32Array,
  initial: () => Float32Array,
) {
  const root = useRef<THREE.Group>(null);
  const meshes = useRef<THREE.InstancedMesh[]>([]);
  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;
    const created = meshesFor(kind, count, materials, tints);
    setMatrices(created, initial());
    for (const mesh of created) group.add(mesh);
    meshes.current = created;
    return () => {
      for (const mesh of created) {
        group.remove(mesh);
        mesh.dispose();
      }
      meshes.current = [];
    };
  }, [kind, count, materials, tints, initial]);
  return { root, meshes };
}

/** Static props of one kind: one instanced mesh per material part. */
export function InstanceView({
  group,
  materials,
}: {
  group: InstanceGroup;
  materials: PropMaterials;
}) {
  const initial = useCallback(() => group.matrices, [group]);
  const { root } = useInstanced(
    group.kind,
    group.matrices.length / 16,
    materials,
    group.tints,
    initial,
  );
  return <group ref={root} />;
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

/** Fill `array` with every mover's matrix at time `t`. */
export function placeMovers(group: MoverGroup, t: number, array: Float32Array) {
  for (let i = 0; i < group.route.length; i++) {
    sample(
      group.routes[group.route[i]],
      group.phase[i] + group.speed[i] * t,
      group.pingpong[i] === 1,
      position,
      forward,
    );
    write(array, i, group.scale[i]);
  }
  return array;
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
  const scratch = useRef<Float32Array | null>(null);
  const last = useRef(Number.NaN);
  // Start at the rest pose; the first drawn frame moves everyone to the shared clock.
  const initial = useCallback(
    () => placeMovers(group, 0, new Float32Array(group.route.length * 16)),
    [group],
  );
  const { root, meshes } = useInstanced(
    group.kind,
    group.route.length,
    materials,
    group.tints,
    initial,
  );
  useFrame(() => {
    const t = clock.current ?? 0;
    if (t === last.current || !meshes.current.length) return;
    for (let node: THREE.Object3D | null = root.current; node; node = node.parent)
      if (!node.visible) return;
    last.current = t;
    if (!scratch.current || scratch.current.length !== group.route.length * 16)
      scratch.current = new Float32Array(group.route.length * 16);
    setMatrices(meshes.current, placeMovers(group, t, scratch.current));
  });
  return <group ref={root} />;
}
