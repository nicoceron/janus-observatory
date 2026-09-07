'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, type RefObject } from 'react';
import { AnimationMixer, LoopOnce, type Mesh } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export const observerAsset = '/assets/models/janus-observatory-v2.glb';

export function preloadObserver() {
  useGLTF.preload(observerAsset);
}

export function Observer({
  time,
  onReady,
}: {
  time: RefObject<{ value: number }>;
  onReady: () => void;
}) {
  const asset = useGLTF(observerAsset);
  const { invalidate } = useThree();
  const { scene, mixer, clips } = useMemo(() => {
    const scene = clone(asset.scene);
    // Skeleton-safe cloning prevents pose updates leaking between the Story and home
    // Observatory's independent canvases. Cached source geometry/materials remain shared.
    scene.traverse((object) => {
      if ((object as Mesh).isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    const mixer = new AnimationMixer(scene);
    const clips = asset.animations.map((clip) => {
      const action = mixer.clipAction(clip).setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      return action;
    });
    return { scene, mixer, clips };
  }, [asset]);
  useEffect(() => {
    onReady();
    invalidate();
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
    };
  }, [invalidate, mixer, onReady, scene]);
  // AnimationMixer actions are imperative Three.js resources, not React state.
  /* eslint-disable react-hooks/immutability */
  useFrame(() => {
    for (const action of clips) {
      action.enabled = true;
      action.paused = true;
      action.time = Math.max(0, Math.min(1, time.current.value)) * action.getClip().duration;
    }
    mixer.update(0);
  });
  /* eslint-enable react-hooks/immutability */
  return <primitive object={scene} dispose={null} />;
}
