'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { WorldArt } from './worlds';
import { terrainGeometry, terrainMaterial } from './terrain';
import { WorldStructures } from './WorldStructures';
import { WorldActivity } from './WorldActivity';

export const presentEarth: WorldArt = {
  id: 'Earth',
  form: 'origin',
  color: '#b4d4e1',
  ocean: '#2086aa',
  land: '#9ec876',
  highland: '#ccd98c',
  shore: '#d7d99b',
  cloud: 7,
  tilt: -0.2,
  turn: 0.1,
  seed: 1048,
  seaLevel: -0.02,
  relief: 0.055,
  displayScale: 1,
  caption: 'The one world we know. An illustrative starting point.',
};

/** Matte, colored polygon faces and authored landmarks. No raster surfaces or weather shells. */
export function Planet({
  art,
  reduced,
  mobile,
}: {
  art: WorldArt;
  reduced: boolean;
  mobile: boolean;
}) {
  const spin = useRef<THREE.Group>(null);
  const time = useRef(0);
  const resources = useMemo(
    () => ({ geometry: terrainGeometry(art, mobile), material: terrainMaterial() }),
    [art, mobile],
  );
  useEffect(
    () => () => {
      resources.geometry.dispose();
      resources.material.dispose();
    },
    [resources],
  );
  useFrame((_, delta) => {
    if (reduced || !spin.current?.parent?.parent?.visible) return;
    time.current += Math.min(delta, 0.05);
    // Keep the authored landmark silhouette in view throughout a long reading pause.
    spin.current.rotation.y = art.turn + Math.sin(time.current * 0.22) * 0.18;
  });
  const globeScale =
    art.form === 'machine-swarm'
      ? 0.65
      : art.form === 'duality'
        ? 0.78
        : art.form === 'engineered'
          ? 0.84
          : 1;
  return (
    <group rotation={[0, 0, art.tilt]}>
      <group ref={spin} rotation={[0, art.turn, 0]}>
        <mesh geometry={resources.geometry} material={resources.material} scale={globeScale} />
        <WorldStructures art={art} globeScale={globeScale} mobile={mobile} />
        <WorldActivity art={art} globeScale={globeScale} reduced={reduced} mobile={mobile} />
      </group>
    </group>
  );
}
