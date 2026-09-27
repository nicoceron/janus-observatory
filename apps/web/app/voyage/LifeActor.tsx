'use client';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { Sculpture } from './sculpture';
import {
  animalBody,
  animalHead,
  animalLeg,
  truckBed,
  truckLoad,
  vehicle,
  wheel,
  wheelSites,
  wing,
  type AnimalKind,
  type VehicleKind,
} from './LifeModels';
import { vessel, canoePaddle, type VesselKind } from './Vessels';
import {
  flyingMachine,
  propeller,
  machineBody,
  walkerLeg,
  serviceTool,
  craneBoom,
  salvageLoad,
  type AircraftKind,
  type MachineKind,
} from './WorkingModels';
import type { ActivityMotion } from './activity-motion';
import { BlenderPart } from './BlenderAssets';
export type LifeSubject =
  | { type: 'vehicle'; kind: VehicleKind }
  | { type: 'vessel'; kind: VesselKind }
  | { type: 'animal'; kind: AnimalKind }
  | { type: 'aircraft'; kind: AircraftKind }
  | { type: 'machine'; kind: MachineKind };
export function isVisible(object: THREE.Object3D | null) {
  for (let p = object; p; p = p.parent) if (!p.visible) return false;
  return true;
}
/** Boat-local shoulder and grip points; the same deterministic bend is used in Blender previews. */
export function canoeArmPoints(
  paddle: THREE.Matrix4,
  arm: number,
  shoulder: THREE.Vector3,
  elbow: THREE.Vector3,
  wrist: THREE.Vector3,
) {
  const side = arm === 0 ? -1 : 1;
  shoulder.set(side * 0.019, 0.108, 0.014);
  wrist.set(0, arm === 0 ? 0.016 : -0.008, arm === 0 ? -0.0255 : -0.0064).applyMatrix4(paddle);
  elbow.lerpVectors(shoulder, wrist, 0.48);
  elbow.x += side * 0.012;
  elbow.y -= 0.019;
  elbow.z += 0.01;
}
/** Local geometry and pivot offsets shared by the live fallback and Blender source export. */
export function lifeResources(subject: LifeSubject) {
  const s = new Sculpture(),
    extra: THREE.BufferGeometry[] = [];
  const add = (build: (part: Sculpture) => void, offset?: [number, number, number]) => {
    const part = new Sculpture();
    build(part);
    const geo = part.finish();
    if (offset) geo.translate(...offset);
    extra.push(geo);
  };
  if (subject.type === 'vehicle') {
    vehicle(s, subject.kind, false, false);
    add((p) => wheel(p, subject.kind));
    if (subject.kind === 'haul-truck') {
      add((p) => truckBed(p, false), [0, -0.096, -0.112]);
      add(truckLoad, [0, -0.096, -0.112]);
    }
  } else if (subject.type === 'vessel') {
    vessel(s, subject.kind, false);
    if (subject.kind === 'canoe') {
      add(canoePaddle);
      add((part) => part.cylinder(1, 1, 1, '#88a47b', [0, 0.5, 0], undefined, 6));
      add((part) => part.cylinder(1, 1, 1, '#c19860', [0, 0.5, 0], undefined, 6));
      add((part) => part.ico(1, '#c19860', [0, 0, 0], [0.005, 0.006, 0.005], undefined, 1));
    }
  } else if (subject.type === 'aircraft') {
    flyingMachine(s, subject.kind);
    add((p) => propeller(p, subject.kind));
  } else if (subject.type === 'machine') {
    machineBody(s, subject.kind);
    if (subject.kind === 'maintenance-walker') {
      for (const side of [-1, 1]) add((p) => walkerLeg(p, side));
      add(serviceTool);
    } else {
      add((p) => craneBoom(p, false));
      add(salvageLoad);
    }
  } else {
    animalBody(s, subject.kind, false);
    if (subject.kind === 'crane' || subject.kind === 'bio-ray')
      for (const side of [-1, 1]) add((p) => wing(p, subject.kind, side));
    else {
      for (const lower of [false, true]) add((p) => animalLeg(p, subject.kind, lower));
      add((p) => animalHead(p, subject.kind), [0, -0.164, 0.062]);
    }
  }
  return {
    body: s.finish(),
    extra,
    material: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.75,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
  };
}
export function LifeActor({
  subject,
  reduced,
  onInspect,
  motion,
}: {
  subject: LifeSubject;
  reduced: boolean;
  onInspect?: () => void;
  motion?: RefObject<ActivityMotion>;
}) {
  const root = useRef<THREE.Group>(null),
    cargo = useRef<THREE.Group>(null),
    parts = useRef<(THREE.Group | null)[]>([]),
    canoeArms = useRef<(THREE.Group | null)[]>([]),
    time = useRef(0);
  const armPose = useMemo(
    () => ({
      shoulder: new THREE.Vector3(),
      elbow: new THREE.Vector3(),
      wrist: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
    }),
    [],
  );
  const flying =
    subject.type === 'animal' && (subject.kind === 'crane' || subject.kind === 'bio-ray');
  const { type, kind } = subject;
  const resources = useMemo(() => lifeResources({ type, kind } as LifeSubject), [type, kind]);
  useEffect(
    () => () => {
      resources.body.dispose();
      resources.extra.forEach((g) => g.dispose());
      resources.material.dispose();
    },
    [resources],
  );
  useFrame((_, dt) => {
    if (!isVisible(root.current)) return;
    if (!reduced) time.current += Math.min(dt, 0.05);
    const t = reduced ? 0 : time.current;
    // Standalone studies demonstrate a task and a rest; on the world, joint motion follows actual travel.
    const demo = t % 14,
      stopped = demo > 8;
    const action = motion?.current ?? {
      u: 0,
      yaw: 0,
      speed: stopped ? 0 : 0.04,
      distance: Math.floor(t / 14) * 0.32 + Math.min(demo, 8) * 0.04,
      work: stopped ? Math.sin(((demo - 8) / 6) * Math.PI) : 0,
      payload: stopped ? Math.max(0, 1 - (demo - 8) / 2.5) : 1,
      at: stopped ? 'to' : null,
    };
    if (cargo.current) {
      cargo.current.visible = action.payload > 0.02;
      cargo.current.position.y = -(1 - action.payload) * 0.075;
    }
    const moving = reduced ? 0 : Math.min(1, action.speed * 35),
      distance = action.distance;
    parts.current.forEach((part, i) => {
      if (!part) return;
      if (subject.type === 'vehicle') {
        if (i < 10)
          part.rotation.x =
            -distance /
            (subject.kind === 'haul-truck'
              ? 0.045
              : subject.kind === 'cargo-cycle'
                ? 0.036
                : 0.031);
        else part.rotation.x = action.at === 'to' ? action.work * 0.55 : 0;
      } else if (subject.type === 'aircraft') {
        if (subject.kind === 'regional-plane') part.rotation.z = t * (action.at ? 8 : 42);
        else part.rotation.y = t * 38;
      } else if (subject.type === 'machine') {
        if (subject.kind === 'maintenance-walker') {
          if (i < 6) {
            const step = distance * 46 + (i % 2) * Math.PI;
            part.rotation.y = Math.sin(step) * 0.24 * moving;
            part.rotation.z = (i < 3 ? -1 : 1) * Math.max(0, Math.cos(step)) * 0.23 * moving;
          } else part.rotation.x = 0.6 - action.work * 0.75;
        } else part.rotation.x = action.work * 0.25;
      } else if (subject.type === 'animal') {
        if (flying) {
          part.rotation.z =
            (i === 0 ? -1 : 1) *
            (0.07 + Math.sin(t * (subject.kind === 'crane' ? 3.7 : 2.1)) * 0.32);
          part.rotation.y = Math.sin(t * 2.1 + 0.4) * 0.04;
        } else if (i === 10) part.rotation.x = -action.work * 0.92;
        else {
          const phase = distance * 48 + (i === 0 || i === 3 ? 0 : Math.PI);
          part.rotation.x = Math.sin(phase) * 0.27 * moving;
          const knee = part.children[1];
          if (knee) knee.rotation.x = Math.max(0, Math.sin(phase + 0.7)) * 0.38 * moving;
        }
      } else if (subject.kind === 'canoe') {
        part.rotation.x = Math.sin(t * 2.8) * 0.65 * moving;
        part.rotation.z = -0.2 + Math.cos(t * 2.8) * 0.14 * moving;
      }
    });
    if (subject.type === 'vessel' && subject.kind === 'canoe' && parts.current[0]) {
      const paddle = parts.current[0];
      paddle.updateMatrix();
      for (let arm = 0; arm < 2; arm++) {
        const { shoulder, elbow, wrist, direction, up } = armPose;
        canoeArmPoints(paddle.matrix, arm, shoulder, elbow, wrist);
        for (let segment = 0; segment < 2; segment++) {
          const group = canoeArms.current[arm * 3 + segment];
          if (!group) continue;
          const start = segment === 0 ? shoulder : elbow;
          const end = segment === 0 ? elbow : wrist;
          direction.subVectors(end, start);
          const length = Math.max(0.000001, direction.length());
          const radius = segment === 0 ? 0.0065 : 0.0045;
          group.position.copy(start);
          group.quaternion.setFromUnitVectors(up, direction.multiplyScalar(1 / length));
          group.scale.set(radius, length, radius);
        }
        const hand = canoeArms.current[arm * 3 + 2];
        if (hand) {
          hand.position.copy(wrist);
          hand.quaternion.copy(paddle.quaternion);
        }
      }
    }
    if (subject.type === 'vessel' && root.current) {
      root.current.rotation.z = Math.sin(t * 1.6) * 0.018;
      root.current.rotation.x = Math.sin(t * 1.1 + 0.5) * 0.009;
    }
  });
  const prefix = `Life_${subject.type}_${subject.kind}`;
  const extra = (i: number) => (
    <BlenderPart name={prefix + '_extra' + i}>
      <mesh geometry={resources.extra[i]} material={resources.material} />
    </BlenderPart>
  );
  return (
    <group
      ref={root}
      onClick={
        onInspect
          ? (e) => {
              e.stopPropagation();
              onInspect();
            }
          : undefined
      }
    >
      <BlenderPart name={prefix + '_body'}>
        <mesh geometry={resources.body} material={resources.material} />
      </BlenderPart>
      {subject.type === 'vehicle' && (
        <>
          {wheelSites(subject.kind).map((p, i) => (
            <group
              key={i}
              position={p}
              ref={(n) => {
                parts.current[i] = n;
              }}
            >
              {extra(0)}
            </group>
          ))}
          {subject.kind === 'haul-truck' && (
            <group
              position={[0, 0.096, 0.112]}
              ref={(n) => {
                parts.current[10] = n;
              }}
            >
              {extra(1)}
              <group ref={cargo}>{extra(2)}</group>
            </group>
          )}
        </>
      )}
      {subject.type === 'aircraft' &&
        [-1, 1].map((side, i) => (
          <group
            key={i}
            position={
              subject.kind === 'regional-plane'
                ? [side * 0.155, 0.035, -0.144]
                : [side * 0.105, 0.015, 0]
            }
            ref={(n) => {
              parts.current[i] = n;
            }}
          >
            {extra(0)}
          </group>
        ))}
      {subject.type === 'machine' &&
        (subject.kind === 'maintenance-walker' ? (
          <>
            {[-1, 1].flatMap((side, j) =>
              [-0.067, 0, 0.067].map((z, k) => (
                <group
                  key={j * 3 + k}
                  position={[side * 0.049, 0.104, z]}
                  ref={(n) => {
                    parts.current[j * 3 + k] = n;
                  }}
                >
                  {extra(j)}
                </group>
              )),
            )}
            <group
              position={[0, 0.094, -0.081]}
              ref={(n) => {
                parts.current[10] = n;
              }}
            >
              {extra(2)}
            </group>
          </>
        ) : (
          <group
            position={[0.025, 0.137, 0.038]}
            ref={(n) => {
              parts.current[0] = n;
            }}
          >
            {extra(0)}
            <group ref={cargo}>{extra(1)}</group>
          </group>
        ))}
      {subject.type === 'vessel' && subject.kind === 'canoe' && (
        <>
          <group
            position={[0.062, 0.084, 0]}
            ref={(n) => {
              parts.current[0] = n;
            }}
          >
            {extra(0)}
          </group>
          {[0, 1].flatMap((arm) =>
            [0, 1, 2].map((segment) => (
              <group
                key={arm * 3 + segment}
                ref={(node) => {
                  canoeArms.current[arm * 3 + segment] = node;
                }}
              >
                <BlenderPart name={prefix + '_extra' + (segment + 1)} />
              </group>
            )),
          )}
        </>
      )}
      {flying &&
        resources.extra.map((_, i) => (
          <group
            key={i}
            ref={(n) => {
              parts.current[i] = n;
            }}
          >
            {extra(i)}
          </group>
        ))}
      {subject.type === 'animal' && !flying && (
        <>
          <group
            position={[0, 0.164, -0.062]}
            ref={(n) => {
              parts.current[10] = n;
            }}
          >
            {extra(2)}
          </group>
          {[-1, 1].flatMap((x, j) =>
            [-0.068, 0.066].map((z, k) => (
              <group
                key={j * 2 + k}
                position={[x * 0.031, 0.151, z]}
                ref={(n) => {
                  parts.current[j * 2 + k] = n;
                }}
              >
                {extra(0)}
                <group position={[0, -0.069, 0.006]}>{extra(1)}</group>
              </group>
            )),
          )}
        </>
      )}
    </group>
  );
}
