'use client';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { WorldArt } from './worlds';
import { LifeActor, isVisible } from './LifeActor';
import { lifePlans, type LifePlan } from './life-plan';
import { lifeRoute } from './life-routes';
import { activityMotion } from './activity-motion';
import { BlenderPart } from './BlenderAssets';
const activityUp = new THREE.Vector3(0, 1, 0);
function Activity({
  art,
  globeScale,
  mobile,
  reduced,
  job,
  onInspect,
}: {
  art: WorldArt;
  globeScale: number;
  mobile: boolean;
  reduced: boolean;
  job: LifePlan;
  onInspect?: (id: string) => void;
}) {
  const root = useRef<THREE.Group>(null),
    actor = useRef<THREE.Group>(null),
    time = useRef(job.travel * 0.38);
  const motion = useRef(activityMotion(job, job.travel * 0.38)),
    turn = useMemo(() => new THREE.Quaternion(), []);
  const route = useMemo(
    () => lifeRoute(art, globeScale, mobile, job),
    [art, globeScale, mobile, job],
  );
  useEffect(
    () => () => {
      route.road?.dispose();
      route.stops?.dispose();
    },
    [route],
  );
  useFrame((_, dt) => {
    if (!actor.current || !isVisible(root.current)) return;
    if (!reduced) time.current += Math.min(dt, 0.05);
    const state = activityMotion(job, reduced ? job.travel * 0.38 : time.current);
    const u = state.u * 192,
      a = Math.min(191, Math.floor(u)),
      f = u - a;
    actor.current.position.lerpVectors(route.points[a], route.points[a + 1], f);
    actor.current.quaternion.slerpQuaternions(route.rotations[a], route.rotations[a + 1], f);
    turn.setFromAxisAngle(activityUp, state.yaw);
    actor.current.quaternion.multiply(turn);
    motion.current = {
      ...state,
      distance: (state.distance * route.length) / (globeScale * job.size),
      speed: (state.speed * route.length) / (globeScale * job.size),
    };
  });
  return (
    <group ref={root}>
      {[route.road, route.stops].map(
        (geometry, i) =>
          geometry && (
            <BlenderPart
              key={i}
              name={`Activity_${job.subject.kind}_${i === 0 ? 'road' : 'stops'}`}
            >
              <mesh geometry={geometry}>
                <meshStandardMaterial vertexColors roughness={0.9} />
              </mesh>
            </BlenderPart>
          ),
      )}
      <group ref={actor} scale={globeScale * job.size}>
        <LifeActor
          subject={job.subject}
          reduced={reduced}
          motion={motion}
          onInspect={
            onInspect ? () => onInspect(job.subject.type + ':' + job.subject.kind) : undefined
          }
        />
      </group>
    </group>
  );
}
export function WorldActivity(props: {
  art: WorldArt;
  globeScale: number;
  mobile: boolean;
  reduced: boolean;
  onInspect?: (id: string) => void;
}) {
  return (
    <>
      {lifePlans[props.art.form].map((job) => (
        <Activity key={job.subject.type + ':' + job.subject.kind} {...props} job={job} />
      ))}
    </>
  );
}
