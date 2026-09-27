'use client';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Sculpture } from './sculpture';
import { isVisible } from './LifeActor';
import type { WorldArt } from './worlds';
import { BlenderPart } from './BlenderAssets';
import { cloudPose } from './cloud-motion';
export function cloudGeometry(variant: number) {
  const s = new Sculpture();
  const lobes = [
    [-0.105, 0.025, 0.012, 0.064],
    [-0.025, 0.056, 0, 0.082],
    [0.104, 0.021, 0.005, 0.057],
    [0.044, 0.092, -0.012, 0.073],
    [-0.067, 0.092, 0.018, 0.043],
    [0.064, 0.019, 0.049, 0.05],
  ];
  lobes
    .slice(0, 4 + (variant % 3))
    .forEach(([x, y, z, r], i) =>
      s.ico(
        r,
        i % 2 ? '#ffffff' : '#e7f1f7',
        [x, y, z],
        [1.08, i === 3 ? 0.92 : 0.76, 0.94],
        undefined,
        1,
      ),
    );
  return s.finish();
}
/** Elevated, separately clocked cloud banks. No cloud is baked into the terrain mesh. */
export function WorldClouds({
  art,
  globeScale,
  reduced,
}: {
  art: WorldArt;
  globeScale: number;
  reduced: boolean;
}) {
  const root = useRef<THREE.Group>(null),
    banks = useRef<(THREE.Group | null)[]>([]),
    time = useRef(0);
  const count = Math.min(art.cloud, 5);
  const geometries = useMemo(
    () => Array.from({ length: count }, (_, i) => cloudGeometry(i)),
    [count],
  );
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  const n = useMemo(() => new THREE.Vector3(), []),
    up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  useFrame((_, dt) => {
    if (!isVisible(root.current)) return;
    if (!reduced) time.current += Math.min(dt, 0.05);
    const t = reduced ? 0 : time.current;
    banks.current.forEach((bank, i) => {
      if (!bank) return;
      const pose = cloudPose(i, t, globeScale);
      bank.position.set(...(pose.position as [number, number, number]));
      n.copy(bank.position).normalize();
      bank.quaternion.setFromUnitVectors(up, n);
      bank.rotateY(pose.yaw);
      bank.scale.setScalar(pose.scale);
    });
  });
  return (
    <group ref={root}>
      {geometries.map((g, i) => (
        <group
          key={i}
          ref={(n) => {
            banks.current[i] = n;
          }}
          scale={globeScale * (i === 4 ? 0.78 : 1)}
        >
          <BlenderPart name={'Cloud_' + i}>
            <mesh geometry={g}>
              <meshStandardMaterial vertexColors roughness={1} />
            </mesh>
          </BlenderPart>
        </group>
      ))}
    </group>
  );
}
