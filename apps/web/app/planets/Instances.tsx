import { useFrame, useThree } from '@react-three/fiber';
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from 'react';
import * as THREE from 'three';
import { propExtent, propGeometry, propParts, type PropPart } from './props/library';
import { kitDark, kitVersion, subscribeKit } from './props/pack';
import { sample, type InstanceGroup, type MoverGroup } from './scene/collect';

/** One material per prop part, plus `pane`: the unlit glass that `lit` panes use on a -dark twin. */
export type PropMaterials = Record<PropPart | 'pane', THREE.Material>;
const tinted: PropPart[] = ['tint', 'metal'];

let shade: THREE.MeshBasicMaterial | null = null;
const pools = new Map<string, THREE.BufferGeometry>();

/**
 * The soft pool of shade a prop stands in: a rounded patch the size of its footprint, darkest
 * under the model and fading to nothing just past its edge. It rides the same instance matrices
 * as the model, so it costs one more draw per kind and grounds every building, tree and figure.
 */
function poolFor(kind: string) {
  let pool = pools.get(kind);
  if (pool) return pool;
  const { min, max } = propExtent(kind);
  const cx = (min[0] + max[0]) / 2,
    cz = (min[2] + max[2]) / 2;
  const hx = Math.max(0.12, (max[0] - min[0]) / 2),
    hz = Math.max(0.12, (max[2] - min[2]) / 2);
  // Slim things (a lamp post, a mast) still get a readable patch.
  const rx = Math.max(hx, hz * 0.45),
    rz = Math.max(hz, hx * 0.45);
  const sides = 20;
  // Seen from above, the model hides its own footprint, so the pool reaches well past it.
  const rings: [grow: number, alpha: number][] = [
    [0.7, 0.5],
    [1.05, 0.4],
    [1.4, 0.17],
    [1.8, 0],
  ];
  // Props are bedded a little into the ground, so the pool lies just above their origin.
  const lift = 0.06;
  const position: number[] = [cx, lift, cz];
  const color: number[] = [1, 1, 1, 0.5];
  const index: number[] = [];
  for (const [grow, alpha] of rings)
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      // A superellipse: nearly rectangular, like most footprints, with rounded corners.
      const c = Math.cos(a),
        s = Math.sin(a);
      const x = Math.sign(c) * Math.abs(c) ** 0.62,
        z = Math.sign(s) * Math.abs(s) ** 0.62;
      position.push(cx + x * rx * grow, lift, cz + z * rz * grow);
      color.push(1, 1, 1, alpha);
    }
  for (let i = 0; i < sides; i++) index.push(0, 1 + ((i + 1) % sides), 1 + i);
  for (let r = 0; r < rings.length - 1; r++)
    for (let i = 0; i < sides; i++) {
      const a = 1 + r * sides + i,
        b = 1 + r * sides + ((i + 1) % sides);
      index.push(a, b, b + sides, a, b + sides, a + sides);
    }
  pool = new THREE.BufferGeometry();
  pool.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  pool.setAttribute('color', new THREE.Float32BufferAttribute(color, 4));
  pool.setIndex(index);
  pools.set(kind, pool);
  return pool;
}

function meshesFor(
  kind: string,
  count: number,
  materials: PropMaterials,
  tints: Float32Array,
  grounded: boolean,
  unlit: boolean,
) {
  const parts = propGeometry(kind);
  // On an unlit world every prop is drawn as its dark twin, and nothing glows.
  const dark = unlit || kitDark(kind);
  const meshes = propParts
    .filter((part) => parts[part] && !(unlit && part === 'glow'))
    .map((part) => {
      const material = part === 'lit' && dark ? materials.pane : materials[part];
      const mesh = new THREE.InstancedMesh(parts[part]!, material, count);
      mesh.frustumCulled = false;
      if (tinted.includes(part)) mesh.instanceColor = new THREE.InstancedBufferAttribute(tints, 3);
      return mesh;
    });
  if (grounded && meshes.length) {
    shade ??= new THREE.MeshBasicMaterial({
      color: '#06101b',
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      // Drawn just proud of the ground it lies on, so it never fights a road or a plaza.
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    const pool = new THREE.InstancedMesh(poolFor(kind), shade, count);
    pool.frustumCulled = false;
    pool.renderOrder = -1;
    meshes.push(pool);
  }
  return meshes;
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
  grounded: boolean,
  unlit = false,
) {
  const root = useRef<THREE.Group>(null);
  const meshes = useRef<THREE.InstancedMesh[]>([]);
  // Kit geometry arrives after the first worlds are laid out: rebuild when a pack lands.
  const kit = useSyncExternalStore(subscribeKit, kitVersion, kitVersion);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;
    const created = meshesFor(kind, count, materials, tints, grounded, unlit);
    setMatrices(created, initial());
    for (const mesh of created) group.add(mesh);
    meshes.current = created;
    invalidate();
    return () => {
      for (const mesh of created) {
        group.remove(mesh);
        mesh.dispose();
      }
      meshes.current = [];
    };
  }, [kind, count, materials, tints, initial, grounded, unlit, kit, invalidate]);
  return { root, meshes };
}

/** Static props of one kind: one instanced mesh per material part. */
export function InstanceView({
  group,
  materials,
  unlit,
}: {
  group: InstanceGroup;
  materials: PropMaterials;
  /** The world reports no artificial illumination: draw no lamps or lit windows. */
  unlit?: boolean;
}) {
  const initial = useCallback(() => group.matrices, [group]);
  const { root } = useInstanced(
    group.kind,
    group.matrices.length / 16,
    materials,
    group.tints,
    initial,
    // Whatever stands on the planet casts a pool of shade; what orbits it does not.
    group.frame === 'surface',
    unlit && group.frame === 'surface',
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
  unlit,
}: {
  group: MoverGroup;
  materials: PropMaterials;
  clock: RefObject<number>;
  /** The world reports no artificial illumination: draw no headlights or lit windows. */
  unlit?: boolean;
}) {
  const scratch = useRef<Float32Array | null>(null);
  const last = useRef(Number.NaN);
  // Start at the rest pose; the first drawn frame moves everyone to the shared clock.
  const initial = useCallback(
    () => placeMovers(group, 0, new Float32Array(group.route.length * 16)),
    [group],
  );
  // Walkers, vehicles and vessels travel on the surface; aircraft and birds fly clear of it.
  const grounded = useMemo(() => {
    const points = group.routes[0]?.points;
    return !!points && Math.hypot(points[0], points[1], points[2]) < 1.06;
  }, [group]);
  const { root, meshes } = useInstanced(
    group.kind,
    group.route.length,
    materials,
    group.tints,
    initial,
    grounded,
    unlit,
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
