'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SystemPortrait } from '../../lib/system-portrait';
import type { WorldArt } from './worlds';
import { buildCompanionGeometry, buildSystemFeatureGeometry } from './SystemGeometry';
import { isVisible } from './LifeActor';
import { BlenderLibrary, BlenderPortrait } from './BlenderAssets';

/** A source-selected body with normalized bounds, composed into the visible system. */
export function StoryBody({
  art,
  system,
  selection,
  reduced,
  mobile,
  size = 2.25,
  embedded = false,
}: {
  art: WorldArt;
  system: SystemPortrait;
  selection: string;
  reduced: boolean;
  mobile: boolean;
  size?: number;
  embedded?: boolean;
}) {
  const root = useRef<THREE.Group>(null),
    time = useRef(0);
  const portraitSize = size;
  const model = useMemo(() => {
    const body = system.bodies.find((b) => b.body === selection);
    const feature = system.features.find((f) => f === selection);
    const geometry = body
      ? buildCompanionGeometry(art, body, mobile)
      : feature
        ? buildSystemFeatureGeometry(art, feature)
        : null;
    if (!geometry) return null;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    return {
      geometry,
      center: box.getCenter(new THREE.Vector3()).negate(),
      scale: portraitSize / Math.max(...box.getSize(new THREE.Vector3()).toArray()),
    };
  }, [art, system, selection, mobile, portraitSize]);
  useEffect(() => () => model?.geometry.dispose(), [model]);
  useFrame((_, dt) => {
    if (!root.current || !isVisible(root.current)) return;
    if (!reduced) time.current += Math.min(dt, 0.05);
    root.current.rotation.y = reduced ? 0 : Math.sin(time.current * 0.18) * 0.13;
  });
  if (!model) return null;
  return (
    <BlenderLibrary art={art} selection={selection} embedded={embedded}>
      <group ref={root} position={[0, 0, 0]}>
        <BlenderPortrait size={portraitSize}>
          <group scale={model.scale}>
            <mesh geometry={model.geometry} position={model.center}>
              <meshStandardMaterial vertexColors roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </BlenderPortrait>
      </group>
    </BlenderLibrary>
  );
}
