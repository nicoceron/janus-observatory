'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { WorldArt } from './worlds';
import { terrainGeometry, terrainMaterial } from './terrain';
import { WorldStructures } from './WorldStructures';
import { WorldActivity } from './WorldActivity';
import { WorldClouds } from './WorldClouds';
import { WorldLandmarks } from './WorldLandmarks';
import { globeRadius } from './life-plan';
import { BlenderLibrary, BlenderPart, earthAssetParts } from './BlenderAssets';
import { isVisible } from './LifeActor';

export { presentEarth } from './origin-world';

/** Matte, colored polygon faces and authored landmarks. No raster surfaces or weather shells. */
export function Planet({
  art,
  reduced,
  mobile,
  onInspect,
  inspect = false,
  detailed = false,
}: {
  art: WorldArt;
  reduced: boolean;
  mobile: boolean;
  onInspect?: (id: string) => void;
  inspect?: boolean;
  detailed?: boolean;
}) {
  const spin = useRef<THREE.Group>(null);
  const time = useRef(0);
  useFrame((_, delta) => {
    if (inspect || reduced || !spin.current || !isVisible(spin.current)) return;
    time.current += Math.min(delta, 0.05);
    // Keep the authored landmark silhouette in view throughout a long reading pause.
    spin.current.rotation.y = art.turn + Math.sin(time.current * 0.22) * 0.18;
  });
  const globeScale = globeRadius(art);
  return (
    <BlenderLibrary
      art={art}
      required={earthAssetParts(art)}
      inspect={inspect}
      mobile={mobile}
      detailed={detailed}
    >
      <group rotation={[0, 0, art.tilt]}>
        <group ref={spin} rotation={[0, art.turn, 0]}>
          <BlenderPart name="Terrain">
            <Terrain art={art} mobile={mobile} scale={globeScale} />
          </BlenderPart>
          <BlenderPart name="Structures">
            <WorldStructures art={art} globeScale={globeScale} mobile={mobile} />
          </BlenderPart>
          <WorldLandmarks
            art={art}
            globeScale={globeScale}
            mobile={mobile}
            reduced={reduced}
            onInspect={onInspect}
          />
          <WorldActivity
            art={art}
            globeScale={globeScale}
            reduced={reduced}
            mobile={mobile}
            onInspect={onInspect}
          />
          <WorldClouds art={art} globeScale={globeScale} reduced={reduced} />
        </group>
      </group>
    </BlenderLibrary>
  );
}

/** Build procedural terrain only when the matching Blender part is unavailable. */
function Terrain({ art, mobile, scale }: { art: WorldArt; mobile: boolean; scale: number }) {
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
  return <mesh geometry={resources.geometry} material={resources.material} scale={scale} />;
}
