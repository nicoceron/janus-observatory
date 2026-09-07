'use client';

import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Vector3, type Group, type PerspectiveCamera } from 'three';

import shotMetadata from '../../../../../assets/sources/janus-cinematic/shot-metadata-v2.json';
import { allScenarioProfiles } from '../../../lib/canonical-core';
import type { StoryVisualState } from '../story-content';
import { Planet, type EarthTexturePaths } from './Planet';
import { Observer, preloadObserver } from './Observer';
import { SystemContext } from './SystemContext';
import { OffworldContext } from './OffworldContext';
import { getOffworldContext } from '../offworld-context';
import {
  branchOrigin,
  evaluateScene,
  portraitBranchOrigin,
  unit,
  type Point3,
} from './scene-layout';

function StarField() {
  const positions = useMemo(() => {
    const next = (index: number) =>
      ((Math.imul(index ^ 3026, 1597334677) ^ Math.imul(index, 3812015801)) >>> 0) / 4294967296;
    return new Float32Array(
      Array.from({ length: 480 }, (_, index) => [
        (next(index * 3) - 0.5) * 90,
        (next(index * 3 + 1) - 0.5) * 60,
        -18 - next(index * 3 + 2) * 45,
      ]).flat(),
    );
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#c3cbd2" size={0.026} transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

export function CinematicScene({
  state,
  reducedMotion,
  branchProgress = 0,
  observerProgress = 0,
  textureAnisotropy,
  texturePaths,
  active = true,
  onObserverReady,
}: {
  state: StoryVisualState;
  reducedMotion: boolean;
  branchProgress?: number;
  observerProgress?: number;
  textureAnisotropy: number;
  texturePaths: EarthTexturePaths;
  active?: boolean;
  onObserverReady: () => void;
}) {
  const { camera, invalidate, size, gl } = useThree();
  const portrait = size.width <= 760 || size.width / size.height < 0.8;
  const contextProfile =
    state.kind === 'scenario'
      ? allScenarioProfiles.find(({ id }) => id === state.scenarioId)
      : undefined;
  const contextBodies = contextProfile
    ? getOffworldContext(contextProfile).bodies.map(({ body }) => body)
    : [];
  const present = useRef<Group>(null);
  const worlds = useRef<Array<Group | null>>([]);
  const observer = useRef<Group>(null);
  const system = useRef<Group>(null);
  const systemVisible =
    state.kind === 'scenario' &&
    allScenarioProfiles
      .find(({ id }) => id === state.scenarioId)
      ?.system.some(({ id }) => id === 'dyson_sphere');
  const targetPoint = useRef(new Vector3(0, 0.4, 0));
  const lineOpacity = useRef({ value: 0 });
  const observerTime = useRef({ value: 0 });
  const prior = useRef<string | null>(null);
  const lightGroup = useRef<Group>(null);

  useEffect(() => {
    // Start staging the next character shot before reaching it, after story intent.
    if (state.kind === 'scenario' && ['S8', 'S10'].includes(state.scenarioId ?? ''))
      preloadObserver();
  }, [state.kind, state.scenarioId]);

  useLayoutEffect(() => {
    const next = evaluateScene(
      state,
      portrait,
      reducedMotion ? 1 : branchProgress,
      reducedMotion ? 0.46 : observerProgress,
    );
    const identity = `${state.kind}:${state.scenarioId ?? ''}:${portrait}`;
    const sameShot = prior.current === identity;
    const immediate = reducedMotion || prior.current === null || !active;
    const duration = immediate ? 0 : sameShot ? 0.24 : 1.15;
    prior.current = identity;
    if (state.kind === 'observer') {
      const frames = shotMetadata.cameras[portrait ? 'CameraPortrait' : 'CameraDesktop'];
      const progress = reducedMotion ? 0.46 : unit(observerProgress);
      const index = Math.min(frames.length - 1, Math.round(progress * (frames.length - 1)));
      next.camera = {
        position: frames[index].position as Point3,
        target: frames[index].target as Point3,
        fov: portrait ? 48 : frames[index].fov,
      };
      next.worlds[0].position = shotMetadata.target as Point3;
    }
    const timeline = gsap.timeline({
      defaults: { duration, ease: sameShot ? 'power2.out' : 'power3.inOut' },
      onUpdate: () => {
        camera.lookAt(targetPoint.current);
        (camera as PerspectiveCamera).updateProjectionMatrix();
        if (active) invalidate();
      },
    });
    const pose = (object: Group | null, position: Point3, scale: number) => {
      if (!object) return;
      timeline.to(object.position, { x: position[0], y: position[1], z: position[2] }, 0);
      timeline.to(object.scale, { x: scale, y: scale, z: scale }, 0);
    };
    pose(present.current, next.present.position, next.present.scale);
    pose(
      system.current,
      portrait ? [0, 2.2, 0] : [-1.5, 0.9, 0],
      next.systemOpacity ? (portrait ? 0.63 : 1.3) : 0.001,
    );
    next.worlds.forEach((world, index) => pose(worlds.current[index], world.position, world.scale));
    timeline.to(
      camera.position,
      { x: next.camera.position[0], y: next.camera.position[1], z: next.camera.position[2] },
      0,
    );
    timeline.to(
      targetPoint.current,
      { x: next.camera.target[0], y: next.camera.target[1], z: next.camera.target[2] },
      0,
    );
    timeline.to(camera, { fov: next.camera.fov }, 0);
    timeline.to(lineOpacity.current, { value: next.branchOpacity }, 0);
    timeline.to(observerTime.current, { value: next.observerTime }, 0);
    // Architecture never shrinks through the character. Move between spatial setups
    // with the camera; visibility resolves atomically at the named state boundary.
    if (observer.current) observer.current.visible = state.kind === 'observer';
    if (lightGroup.current) lightGroup.current.visible = state.kind === 'observer';
    invalidate();
    return () => {
      timeline.kill();
    };
  }, [
    active,
    branchProgress,
    camera,
    invalidate,
    observerProgress,
    portrait,
    reducedMotion,
    state,
  ]);

  const projected = useMemo(() => new Vector3(), []);
  useFrame(() => {
    const root = gl.domElement.closest('.storyStage');
    if (!root) return;
    const toScreen = (point: Point3) => {
      projected.set(...point).project(camera);
      return [projected.x * 50 + 50, 50 - projected.y * 50];
    };
    const origin = toScreen(portrait ? portraitBranchOrigin : branchOrigin);
    worlds.current.forEach((world, index) => {
      const label = root.querySelector<HTMLElement>(`[data-world-label="S${index + 1}"]`);
      if (!world) return;
      world.updateWorldMatrix(true, false);
      world.getWorldPosition(projected);
      const path = root.querySelector<SVGPathElement>(`[data-world-path="S${index + 1}"]`);
      if (path) {
        const end = toScreen([projected.x, projected.y, projected.z]);
        const controlX = origin[0] + (end[0] - origin[0]) * 0.25;
        path.setAttribute(
          'd',
          `M ${origin[0]} ${origin[1]} C ${controlX} ${origin[1]}, ${controlX} ${end[1]}, ${end[0]} ${end[1]}`,
        );
        path.style.opacity = String(
          state.kind === 'branches' ? lineOpacity.current.value * 0.3 : 0,
        );
      }
      if (!label) return;
      world.getWorldPosition(projected);
      projected.y -= world.scale.y * 1.28;
      projected.project(camera);
      label.style.left = `${(projected.x * 0.5 + 0.5) * 100}%`;
      label.style.top = `${(-projected.y * 0.5 + 0.5) * 100}%`;
      label.style.visibility =
        world.scale.x > 0.2 &&
        projected.z < 1 &&
        (state.kind === 'branches' ||
          (state.kind === 'scenario' && state.scenarioId === `S${index + 1}`))
          ? 'visible'
          : 'hidden';
    });
  });

  return (
    <>
      <StarField />
      <ambientLight intensity={state.kind === 'observer' ? 0.22 : 0.09} />
      <directionalLight
        position={[-4, 1.4, 1.8]}
        intensity={state.kind === 'observer' ? 0.45 : 2.2}
        color="#e2eaf1"
      />
      <directionalLight position={[3, -1, -5]} intensity={0.16} color="#6281a4" />
      <group ref={lightGroup} visible={state.kind === 'observer'}>
        <pointLight position={[-3.5, 6, -1.8]} intensity={45} color="#bfd6ff" decay={2} />
        <pointLight position={[2.5, 3, -0.3]} intensity={14} color="#e3bb9e" decay={2} />
        <pointLight position={[-4, 3.5, 4]} intensity={6} color="#b9cfeb" decay={2} />
      </group>
      <group ref={present}>
        <Planet texturePaths={texturePaths} anisotropy={textureAnisotropy} />
      </group>
      {allScenarioProfiles.map((profile, index) => (
        <group
          key={profile.id}
          scale={0.001}
          ref={(object) => {
            worlds.current[index] = object;
          }}
        >
          <Planet
            profile={profile}
            texturePaths={texturePaths}
            anisotropy={textureAnisotropy}
            evidenceView={state.kind === 'ocular'}
          />
        </group>
      ))}
      <group ref={observer} visible={state.kind === 'observer'}>
        {state.kind === 'observer' && (
          <Suspense fallback={null}>
            <Observer time={observerTime} onReady={onObserverReady} />
          </Suspense>
        )}
      </group>
      <group ref={system} scale={0.001}>
        {systemVisible && (
          <Suspense fallback={null}>
            <SystemContext />
          </Suspense>
        )}
      </group>
      {contextBodies.length > 0 && (
        <Suspense fallback={null}>
          <OffworldContext bodies={contextBodies} portrait={portrait} />
        </Suspense>
      )}
    </>
  );
}
