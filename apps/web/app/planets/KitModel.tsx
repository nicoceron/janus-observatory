import { useThree, type ThreeElements } from '@react-three/fiber';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { createPropMaterials, reflect, type PropMaterialSet } from './materials';
import {
  kitDark,
  kitGeometry,
  kitInfo,
  kitParts,
  kitVersion,
  loadKit,
  subscribeKit,
} from './props/pack';

let shared: PropMaterialSet | null = null;
const tinted = new Map<string, THREE.Material>();

/**
 * One long-lived material set for single kit models; programs stay compiled between mounts. Its
 * glass and metal reflect the same studio environment as the worlds' props, set before any
 * tinted copy is cloned from them.
 */
function materialFor(
  gl: THREE.WebGLRenderer,
  part: (typeof kitParts)[number],
  dark: boolean,
  tint?: string,
) {
  if (!shared) {
    shared = createPropMaterials();
    reflect(gl, undefined, shared);
  }
  const base = part === 'lit' && dark ? shared.pane : shared[part];
  if (!tint || (part !== 'tint' && part !== 'metal')) return base;
  const key = `${part}:${tint}`;
  let material = tinted.get(key);
  if (!material) {
    material = base.clone();
    (material as THREE.MeshStandardMaterial).color.set(tint);
    tinted.set(key, material);
  }
  return material;
}

/**
 * One Blender kit model as ordinary meshes, in its authored units and frame. `tint` colours its
 * tint and metal parts (default: the model's own). Nothing is drawn until its pack has loaded.
 */
export function KitModel({
  kind,
  tint,
  ...props
}: { kind: string; tint?: string } & ThreeElements['group']) {
  useSyncExternalStore(subscribeKit, kitVersion, kitVersion);
  const invalidate = useThree((state) => state.invalidate);
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    loadKit().catch(() => undefined);
  }, []);
  const parts = kitGeometry(kind);
  const colour = tint ?? kitInfo(kind)?.tint;
  const dark = kitDark(kind);
  const meshes = useMemo(
    () =>
      parts
        ? kitParts
            .filter((part) => parts[part])
            .map((part) => ({
              part,
              geometry: parts[part]!,
              material: materialFor(gl, part, dark, colour),
            }))
        : [],
    [gl, parts, dark, colour],
  );
  useEffect(() => {
    invalidate();
  }, [meshes, invalidate]);
  return (
    <group {...props}>
      {meshes.map(({ part, geometry, material }) => (
        <mesh key={part} geometry={geometry} material={material} />
      ))}
    </group>
  );
}
