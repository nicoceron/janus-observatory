'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { KitModel } from '../planets/KitModel';
import { observerClip, placeLimb, type LimbNodes } from './observer-animation';

type Vec = [number, number, number];

/**
 * The stranger is a rig of rigid Blender kit pieces (scripts/blender/kit/assets/observer.py).
 * Each `obs-*` kind is authored in the frame of the node that carries it here, so every
 * position, rotation and name below is a contract with that module and with the clip in
 * observer-animation.ts.
 */
function Eye({ side }: { side: number }) {
  return (
    <group position={[side * 0.223, 0.245, 0.261]} rotation={[0, side * 0.38, side * -0.13]}>
      {/* The lid, brow and monocle belong to the head; only the eye itself blinks. */}
      <group name={side < 0 ? 'leftBlink' : 'rightBlink'}>
        <KitModel kind="obs-eye" />
      </group>
    </group>
  );
}

/**
 * Unit-length limb segments are placed by a two-segment rig after the clip updates: it sets the
 * position, quaternion and y scale of the named nodes. The arm kinds are drawn at radius 0.12
 * and the joint ball at radius 1, so `radius` only sets their girth.
 */
function Limb({ name, radius, leg = false }: { name: string; radius: number; leg?: boolean }) {
  const girth = leg ? 1 : radius / 0.12;
  return (
    <group>
      <group name={name + 'Upper'}>
        <KitModel kind={leg ? 'obs-leg-upper' : 'obs-arm-upper'} scale={[girth, 1, girth]} />
      </group>
      <group name={name + 'Joint'}>
        <KitModel kind="obs-joint" scale={radius} />
      </group>
      <group name={name + 'Lower'}>
        <KitModel kind={leg ? 'obs-leg-lower' : 'obs-arm-lower'} scale={[girth, 1, girth]} />
      </group>
    </group>
  );
}

/** A continuous performance with deliberate gestures, planted feet and stable telescope contact. */
export function ObserverLife({
  reduced,
  focusHand,
  supportHand,
}: {
  reduced: boolean;
  focusHand: Vec;
  supportHand: Vec;
}) {
  const root = useRef<THREE.Group>(null),
    torso = useRef<THREE.Group>(null);
  const rig = useRef<{ mixer: THREE.AnimationMixer; free: THREE.Group; limbs: LimbNodes[] } | null>(
    null,
  );
  const clip = useMemo(() => observerClip(supportHand), [supportHand]);
  useEffect(() => {
    const model = root.current!;
    const mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
    const limbs = ['rightArm', 'leftArm', 'rightLeg', 'leftLeg'].map((name) => ({
      upper: model.getObjectByName(name + 'Upper') as THREE.Mesh,
      lower: model.getObjectByName(name + 'Lower') as THREE.Mesh,
      joint: model.getObjectByName(name + 'Joint') as THREE.Group,
    }));
    rig.current = { mixer, limbs, free: model.getObjectByName('freeHand') as THREE.Group };
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      rig.current = null;
    };
  }, [clip]);
  const points = useMemo(() => Array.from({ length: 10 }, () => new THREE.Vector3()), []);
  useFrame(({ gl }, delta) => {
    if (!root.current?.parent?.visible || !rig.current || !torso.current) return;
    const { mixer, limbs, free } = rig.current;
    if (reduced) mixer.setTime(4.4);
    else mixer.update(Math.min(delta, 0.05));
    torso.current.updateMatrix();
    const matrix = torso.current.matrix;
    const from = (i: number, x: number, y: number, z: number) =>
      points[i].set(x, y, z).applyMatrix4(matrix);
    placeLimb(
      limbs[0],
      from(0, 0.32, -0.32, 0.01),
      points[1].set(...focusHand),
      points[2].set(0.75, -0.34, 0.65),
      0.53,
      0.64,
    );
    placeLimb(
      limbs[1],
      from(0, -0.32, -0.32, 0),
      free.position,
      points[2].set(-0.84, -0.67, 0.5),
      0.57,
      0.72,
    );
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1;
      placeLimb(
        limbs[i + 2],
        from(0, side * 0.2, -0.9, 0),
        points[1].set(side * 0.25, -1.65, 0.07),
        points[2].set(side * 0.28, -1.28, 0.6),
        0.4,
        0.43,
      );
    }
    gl.domElement.setAttribute('data-observer-time', (mixer.time % 18).toFixed(3));
  });
  return (
    <group ref={root}>
      {/* The rock and both planted boots. */}
      <KitModel kind="obs-base" />
      <Limb name="rightLeg" radius={0.135} leg />
      <Limb name="leftLeg" radius={0.135} leg />
      <group name="chest" ref={torso}>
        <KitModel kind="obs-torso" />
        <group name="scarfTail" position={[-0.15, -0.15, 0.3]} rotation={[0.1, 0, -0.16]}>
          <KitModel kind="obs-scarf-tail" />
        </group>
        <group name="head">
          <group position={[0.105, 0, 0.015]} rotation={[0, 0.04, 0]}>
            <KitModel kind="obs-head" />
            <Eye side={-1} />
            <Eye side={1} />
            <group name="antennae">
              <KitModel kind="obs-antennae" />
            </group>
          </group>
        </group>
      </group>
      <Limb name="rightArm" radius={0.12} />
      <Limb name="leftArm" radius={0.115} />
      <group name="focusGrip" position={focusHand}>
        <KitModel kind="obs-hand-focus" />
      </group>
      <group name="freeHand" position={supportHand}>
        <KitModel kind="obs-hand-free" />
      </group>
    </group>
  );
}
