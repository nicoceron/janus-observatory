'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import { useEffect, useLayoutEffect } from 'react';
import * as THREE from 'three';
import type { SystemPortrait } from '../../lib/system-portrait';
import type { WorldSignals } from '../../lib/world-signals';
import type { Inspection } from '../planets/explore';
import { LowPolyBody, LowPolyLandmark, LowPolyWorld } from '../planets/LowPoly';
import { worlds } from './worlds';
import type { ViewAdjustment } from './Inspector';

/** A close, rotatable study of one world, body or landmark from the selected scenario. */
export function InspectionScene({
  inspection,
  signals,
  system,
  reduced,
  onSelect,
  view,
}: {
  inspection: Inspection;
  signals: WorldSignals;
  system: SystemPortrait;
  reduced: boolean;
  onSelect: (id: string) => void;
  view: ViewAdjustment;
}) {
  const { camera, size, invalidate, gl } = useThree();
  const scenario = worlds[inspection.world].id,
    id = inspection.selection;
  const body = system.bodies.some((b) => b.body === id) || system.features.some((f) => f === id);
  const landmark = id.startsWith('landmark:') ? id.slice(9) : null;
  useLayoutEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
    }
    camera.position.set(0, 0, Math.max(6.8, 6.6 / Math.max(0.55, size.width / size.height)));
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera, size.width, size.height, id, view.reset, invalidate]);
  useFrame(() => {
    gl.domElement.setAttribute('data-inspection', id);
    if (!reduced && !document.hidden) invalidate();
  });
  useEffect(
    () => () => {
      gl.domElement.removeAttribute('data-inspection');
      invalidate();
    },
    [gl, invalidate],
  );
  return (
    <>
      <OrbitControls
        key={id + ':' + view.reset}
        enablePan={false}
        enableDamping={!reduced}
        dampingFactor={0.12}
        minDistance={3.5}
        maxDistance={16}
        minPolarAngle={0.24}
        maxPolarAngle={Math.PI - 0.24}
        target={[0, 0, 0]}
      />
      <group
        rotation={[landmark ? 0.35 : 0, view.yaw + (landmark ? -0.5 : 0), 0]}
        scale={view.zoom}
      >
        {id === 'Earth' ? (
          <group scale={1.42}>
            <LowPolyWorld
              id={scenario}
              signals={signals}
              quality="inspect"
              reduced={reduced}
              sway={false}
              onSelect={(selected) => onSelect(`landmark:${selected}`)}
            />
          </group>
        ) : body ? (
          <LowPolyBody
            scenario={scenario}
            signals={signals}
            selection={id}
            quality="inspect"
            size={3.6}
            reduced={reduced}
          />
        ) : landmark ? (
          <LowPolyLandmark scenario={scenario} landmark={landmark} size={3.1} reduced={reduced} />
        ) : null}
      </group>
    </>
  );
}
