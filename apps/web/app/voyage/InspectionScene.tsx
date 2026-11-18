'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { worlds } from './worlds';
import { Planet } from './Planet';
import {
  buildCompanionGeometry,
  buildSystemFeatureGeometry,
  orbitalHabitat,
  venusSurfaceFacility,
  venusMachineAperture,
} from './SystemGeometry';
import { landmarkGeometry, LandmarkActor } from './WorldLandmarks';
import { Sculpture } from './sculpture';
import { lunarBase, aerostat } from './HabitatModels';
import { machineStation } from './MachineModels';
import { LifeActor, type LifeSubject } from './LifeActor';
import { lifeGeometry } from './life-geometry';
import type { ObjectKind } from './ScenarioObjects';
import type { SystemPortrait } from '../../lib/system-portrait';
import { companionStudy, type Inspection } from './inspection';
import { BlenderLibrary, BlenderPortrait, earthAssetParts } from './BlenderAssets';
import type { ViewAdjustment } from './Inspector';

export function InspectionScene({
  inspection,
  system,
  reduced,
  onSelect,
  view,
}: {
  inspection: Inspection;
  system: SystemPortrait;
  reduced: boolean;
  onSelect: (id: string) => void;
  view: ViewAdjustment;
}) {
  const { camera, size, invalidate, gl } = useThree();
  const art = worlds[inspection.world],
    id = inspection.selection;
  const companion = system.bodies.find((b) => b.body === id),
    feature = system.features.find((f) => f === id);
  const life = /^(animal|vessel|vehicle|aircraft|machine):/.test(id);
  const geometry = useMemo(() => {
    if (id === 'Earth') return null;
    if (life)
      return lifeGeometry({ type: id.split(':')[0], kind: id.split(':')[1] } as LifeSubject);
    if (companion) return buildCompanionGeometry(art, companion, false);
    if (feature) return buildSystemFeatureGeometry(art, feature);
    if (id.startsWith('landmark:')) return landmarkGeometry(id.slice(9) as ObjectKind);
    const s = new Sculpture();
    if (id === 'machine-station' || id === 'machine-facility')
      machineStation(s, new THREE.Matrix4(), id === 'machine-facility');
    else if (id === 'orbital-habitat') orbitalHabitat(s, new THREE.Matrix4(), 1);
    else if (id === 'aerostat') aerostat(s, new THREE.Matrix4());
    else if (id === 'venus-facility')
      (art.id === 'S9' ? venusMachineAperture : venusSurfaceFacility)(s, new THREE.Matrix4());
    else lunarBase(s, new THREE.Matrix4(), art, id === 'mars-base' ? 'Mars' : 'Moon');
    return s.finish();
  }, [art, id, companion, feature, life]);
  const fitSize = life || id.startsWith('landmark:') ? 3.0 : 3.25;
  const bounds = useMemo(() => {
    if (!geometry) return null;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    return {
      center: box.getCenter(new THREE.Vector3()).negate(),
      scale: fitSize / Math.max(...box.getSize(new THREE.Vector3()).toArray()),
    };
  }, [geometry, fitSize]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
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
  const detail = !(id === 'Earth' || companion || feature);
  return (
    <BlenderLibrary
      art={art}
      selection={companion || feature ? id : 'Earth'}
      required={
        companion || feature
          ? []
          : [
              ...earthAssetParts(art),
              ...(!(id === 'Earth' || life || id.startsWith('landmark:')) ? ['Study_' + id] : []),
            ]
      }
      inspect
    >
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
        rotation={[life ? 0.2 : detail ? 0.35 : 0, view.yaw + (life ? 2.35 : detail ? -0.5 : 0), 0]}
        scale={view.zoom}
        position={[0, detail && !life ? 0.15 : 0, 0]}
      >
        {id === 'Earth' ? (
          <group scale={1.42}>
            <Planet art={art} mobile={false} reduced={reduced} onInspect={onSelect} inspect />
          </group>
        ) : life && bounds ? (
          <group scale={bounds.scale}>
            <group position={bounds.center}>
              <LifeActor
                subject={{ type: id.split(':')[0], kind: id.split(':')[1] } as LifeSubject}
                reduced={reduced}
              />
            </group>
          </group>
        ) : id.startsWith('landmark:') && bounds ? (
          id === 'landmark:watermill' || id === 'landmark:windmill' ? (
            <group scale={bounds.scale}>
              <group position={bounds.center}>
                <LandmarkActor kind={id.slice(9) as ObjectKind} reduced={reduced} />
              </group>
            </group>
          ) : (
            <BlenderPortrait size={fitSize} name={'Landmark_' + id.slice(9)}>
              <group scale={bounds.scale}>
                <group position={bounds.center}>
                  <LandmarkActor kind={id.slice(9) as ObjectKind} reduced={reduced} />
                </group>
              </group>
            </BlenderPortrait>
          )
        ) : geometry && bounds ? (
          <group
            onClick={
              companion
                ? (event) => {
                    event.stopPropagation();
                    const study = companionStudy(inspection.world, id, system);
                    if (study) onSelect(study);
                  }
                : undefined
            }
          >
            <BlenderPortrait size={3.25} name={companion || feature ? undefined : 'Study_' + id}>
              <group scale={bounds.scale}>
                <mesh geometry={geometry} position={bounds.center}>
                  <meshStandardMaterial
                    vertexColors
                    roughness={0.76}
                    metalness={0.025}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </group>
            </BlenderPortrait>
          </group>
        ) : null}
      </group>
    </BlenderLibrary>
  );
}
