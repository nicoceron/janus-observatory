'use client';

import * as THREE from 'three';
import { KitModel } from '../planets/KitModel';

/** Shared stage coordinates keep the observer, hands, eyepiece and camera aligned at every size. */
export function telescopeLayout(mobile: boolean, framing: number) {
  const station = new THREE.Vector3(mobile ? 0 : 2.8 * framing, mobile ? 2.2 : 0, 0.1);
  const stationScale = mobile ? 0.78 : 1.28 * framing;
  const position = new THREE.Vector3(0.75, 0.38, 0).multiplyScalar(stationScale).add(station);
  const rotation = new THREE.Euler(-0.1, -1.02, 0),
    quaternion = new THREE.Quaternion().setFromEuler(rotation);
  const scale = stationScale * 0.78;
  const observerPosition = new THREE.Vector3(-0.6, 0.08, 0.3)
    .multiplyScalar(stationScale)
    .add(station);
  const observerRotation = 0.62;
  const handTarget = (local: [number, number, number]) =>
    new THREE.Vector3(...local)
      .multiplyScalar(scale)
      .applyQuaternion(quaternion)
      .add(position)
      .sub(observerPosition)
      .divideScalar(stationScale)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -observerRotation)
      .toArray() as [number, number, number];
  const eye = new THREE.Vector3(0, 0, 1.17)
    .multiplyScalar(scale)
    .applyQuaternion(quaternion)
    .add(position);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
  const camera = eye.clone().addScaledVector(forward, -0.34 * scale);
  const target = eye.clone().addScaledVector(forward, 34);
  const orientation = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(camera, target, new THREE.Vector3(0, 1, 0)),
  );
  return {
    position,
    rotation,
    scale,
    eye,
    forward,
    camera,
    target,
    orientation,
    observerPosition,
    observerScale: stationScale,
    observerRotation,
    focusHand: handTarget([0.31, 0, 0.81]),
    supportHand: handTarget([-0.32, -0.24, 0.7]),
  };
}

/**
 * The refractor is one static Blender kit model, `obs-telescope`
 * (scripts/blender/kit/assets/observer.py), authored in this group's frame: optical axis along
 * z, eye lens at (0, 0, 1.17), focus knob at (0.31, 0, 0.81). `telescopeLayout` relies on those.
 */
export function Telescope() {
  return <KitModel kind="obs-telescope" />;
}
