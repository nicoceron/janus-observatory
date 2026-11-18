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
  // A low-poly cumulus: a broad base, a taller crown and shoulder puffs, all clipped flat
  // underneath so the bank reads as weather lit from above rather than a floating boulder.
  const lobes = [
    [-0.098, 0.03, 0.01, 0.062],
    [-0.022, 0.058, 0, 0.084],
    [0.088, 0.034, 0.004, 0.066],
    [0.036, 0.09, -0.01, 0.07],
    [-0.066, 0.078, 0.016, 0.05],
    [0.056, 0.03, 0.05, 0.052],
  ];
  lobes
    .slice(0, 4 + (variant % 3))
    .forEach(([x, y, z, r], i) =>
      s.ico(r, i % 2 ? '#ffffff' : '#eef5fa', [x, y, z], [1.12, 0.86, 1], undefined, 1),
    );
  const geometry = s.finish();
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) position.setY(i, Math.max(position.getY(i), 0.012));
  geometry.computeVertexNormals();
  return geometry;
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
              <meshStandardMaterial
                vertexColors
                roughness={1}
                emissive="#a9bdd6"
                emissiveIntensity={0.32}
              />
            </mesh>
          </BlenderPart>
        </group>
      ))}
    </group>
  );
}
