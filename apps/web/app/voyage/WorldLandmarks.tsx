'use client';
import { landmarkCoordinates } from './landmark-plan';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mechanismGeometry, mechanismPosition } from './Mechanisms';
import { isVisible } from './LifeActor';
import { Sculpture } from './sculpture';
import { scenarioObject, type ObjectKind } from './ScenarioObjects';
import { objectFamilies } from './ScenarioBiomes';
import { Ground } from './planet-surface';
import type { WorldArt } from './worlds';
import { lifePlans } from './life-plan';
import { BlenderPart } from './BlenderAssets';
export function landmarkGeometry(kind: ObjectKind, variant = 0, movingParts = true) {
  const s = new Sculpture();
  scenarioObject(s, new THREE.Matrix4(), kind, variant, movingParts);
  return s.finish();
}
export function landmarkSites(art: WorldArt, scale: number, mobile: boolean) {
  if (art.form === 'origin') return [];
  const kinds = objectFamilies[art.form];
  const sites = landmarkCoordinates(art.form);
  const g = new Ground(art, scale, mobile, art.form === 'engineered' ? 'shell' : 'terrain');
  try {
    const objects = kinds
      .map((kind, i) => {
        const [lon, lat] = sites[i];
        let matrix: THREE.Matrix4 | null = null;
        if (art.form === 'engineered') matrix = g.pose(lon, lat, 0.025);
        else
          for (const [dx, dy] of [
            [0, 0],
            [7, 2],
            [-7, -2],
            [14, 4],
            [-14, -4],
            [21, 5],
            [-21, -5],
            [0, 14],
            [0, -14],
            [21, 18],
            [-21, 18],
            [28, -14],
          ]) {
            const dir = g.direction(lon + dx, lat + dy);
            if (g.project(dir, 0).length() >= scale * (art.form === 'fractured' ? 0.85 : 0.99)) {
              matrix = g.pose(lon + dx, lat + dy);
              break;
            }
          }
        if (!matrix) return null;
        const size = art.form === 'machine-swarm' ? 1.0 : art.form === 'duality' ? 1.13 : 1.38;
        return {
          kind,
          matrix: matrix.scale(new THREE.Vector3(scale * size, scale * size, scale * size)),
          variant: i,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    // Loading faces and entrances face the actual connection, rather than the default globe axis.
    for (const job of lifePlans[art.form].filter((job) => job.route === 'road')) {
      for (const [stop, other] of [
        [job.from, job.to],
        [job.to, job.from],
      ]) {
        const object = objects.find((o) => o.kind === stop.landmark);
        if (!object || !stop.access) continue;
        const destination = objects.find((o) => o.kind === other.landmark);
        const position = new THREE.Vector3().setFromMatrixPosition(object.matrix);
        const target = destination
          ? new THREE.Vector3().setFromMatrixPosition(destination.matrix)
          : g.project(g.direction(...other.at), 0);
        const up = position.clone().normalize();
        const forward = target
          .sub(position)
          .projectOnPlane(up)
          .normalize()
          .applyAxisAngle(up, -Math.atan2(stop.access[0], stop.access[1]));
        const right = new THREE.Vector3().crossVectors(up, forward).normalize();
        const size = new THREE.Vector3().setFromMatrixScale(object.matrix);
        object.matrix.makeBasis(right, up, forward).scale(size).setPosition(position);
      }
    }
    return objects;
  } finally {
    g.dispose();
  }
}
export function LandmarkActor({
  kind,
  variant = 0,
  reduced,
  onInspect,
}: {
  kind: ObjectKind;
  variant?: number;
  reduced: boolean;
  onInspect?: () => void;
}) {
  const rotor = useRef<THREE.Group>(null),
    time = useRef(0);
  const mechanism = kind === 'watermill' || kind === 'windmill' ? kind : null;
  const base = useMemo(() => landmarkGeometry(kind, variant, false), [kind, variant]);
  const gear = useMemo(() => (mechanism ? mechanismGeometry(mechanism) : null), [mechanism]);
  useEffect(
    () => () => {
      base.dispose();
      gear?.dispose();
    },
    [base, gear],
  );
  useFrame((_, dt) => {
    if (!rotor.current || !isVisible(rotor.current)) return;
    if (!reduced) time.current += Math.min(dt, 0.05);
    const t = reduced ? 0 : time.current;
    if (kind === 'watermill') rotor.current.rotation.x = t * 0.55;
    else rotor.current.rotation.z = t * 0.43;
  });
  return (
    <group
      onClick={
        onInspect
          ? (e) => {
              e.stopPropagation();
              onInspect();
            }
          : undefined
      }
    >
      <BlenderPart name={'Landmark_' + kind}>
        <mesh geometry={base}>
          <meshStandardMaterial vertexColors roughness={0.82} side={THREE.DoubleSide} />
        </mesh>
      </BlenderPart>
      {mechanism && gear && (
        <group ref={rotor} position={mechanismPosition(mechanism)}>
          <BlenderPart name={'Mechanism_' + mechanism}>
            <mesh geometry={gear}>
              <meshStandardMaterial vertexColors roughness={0.78} />
            </mesh>
          </BlenderPart>
        </group>
      )}
    </group>
  );
}
export function WorldLandmarks({
  art,
  globeScale,
  mobile,
  reduced,
  onInspect,
}: {
  art: WorldArt;
  globeScale: number;
  mobile: boolean;
  reduced: boolean;
  onInspect?: (id: string) => void;
}) {
  const objects = useMemo(() => landmarkSites(art, globeScale, mobile), [art, globeScale, mobile]);
  return (
    <>
      {objects.map((o) => (
        <group key={o.kind} matrix={o.matrix} matrixAutoUpdate={false}>
          <LandmarkActor
            kind={o.kind}
            variant={o.variant}
            reduced={reduced}
            onInspect={onInspect ? () => onInspect('landmark:' + o.kind) : undefined}
          />
        </group>
      ))}
    </>
  );
}
