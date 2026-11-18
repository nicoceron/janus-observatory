import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { observerClip, elbowPosition, OBSERVER_LOOP_SECONDS } from './observer-animation';
import { telescopeLayout } from './Telescope';

function sampleRig() {
  const root = new THREE.Group();
  const clip = observerClip(telescopeLayout(false, 1).supportHand);
  for (const track of clip.tracks) {
    const name = track.name.split('.')[0];
    if (root.getObjectByName(name)) continue;
    const node = new THREE.Group();
    node.name = name;
    root.add(node);
  }
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(clip).play();
  return { root, clip, mixer };
}

describe('the curious astronomer performance', () => {
  it('keeps grips and planted ankles within fixed limb reach throughout the complete clip', () => {
    const { root, clip, mixer } = sampleRig();
    expect(clip.validate()).toBe(true);
    const chest = root.getObjectByName('chest')!;
    const free = root.getObjectByName('freeHand')!;
    const focus = new THREE.Vector3(...telescopeLayout(false, 1).focusHand);
    const elbow = new THREE.Vector3();
    let lowest = Infinity,
      highest = -Infinity;
    for (let frame = 0; frame < 360; frame++) {
      mixer.setTime((frame / 360) * OBSERVER_LOOP_SECONDS);
      chest.updateMatrix();
      const limbs = [
        {
          from: new THREE.Vector3(0.32, -0.32, 0.01),
          to: focus,
          pole: new THREE.Vector3(0.75, -0.34, 0.65),
          upper: 0.53,
          lower: 0.64,
        },
        {
          from: new THREE.Vector3(-0.32, -0.32, 0),
          to: free.position,
          pole: new THREE.Vector3(-0.84, -0.67, 0.5),
          upper: 0.57,
          lower: 0.72,
        },
        ...[-1, 1].map((side) => ({
          from: new THREE.Vector3(side * 0.2, -0.9, 0),
          to: new THREE.Vector3(side * 0.25, -1.65, 0.07),
          pole: new THREE.Vector3(side * 0.28, -1.28, 0.6),
          upper: 0.4,
          lower: 0.43,
        })),
      ];
      for (const limb of limbs) {
        limb.from.applyMatrix4(chest.matrix);
        expect(limb.from.distanceTo(limb.to)).toBeLessThan(limb.upper + limb.lower);
        elbowPosition(limb.from, limb.to, limb.pole, limb.upper, limb.lower, elbow);
        expect(elbow.toArray().every(Number.isFinite)).toBe(true);
        expect(elbow.distanceTo(limb.from)).toBeCloseTo(limb.upper, 5);
        expect(elbow.distanceTo(limb.to)).toBeCloseTo(limb.lower, 5);
      }
      lowest = Math.min(lowest, free.position.y);
      highest = Math.max(highest, free.position.y);
      if (frame === 0) {
        const relaxedArm = limbs[1];
        elbowPosition(
          relaxedArm.from,
          relaxedArm.to,
          relaxedArm.pole,
          relaxedArm.upper,
          relaxedArm.lower,
          elbow,
        );
        expect(elbow.y).toBeLessThan(relaxedArm.from.y);
        expect(elbow.y).toBeGreaterThan(relaxedArm.to.y);
      }
    }
    expect(highest - lowest).toBeGreaterThan(1.0);
    mixer.stopAllAction();
    mixer.uncacheRoot(root);
  });
  it('returns to the same full pose at the loop seam and has a reproducible reduced-motion pose', () => {
    const { root, mixer } = sampleRig();
    const snapshot = () =>
      root.children.flatMap((node) => [
        ...node.position.toArray(),
        ...node.quaternion.toArray(),
        ...node.scale.toArray(),
      ]);
    mixer.setTime(0);
    const initial = snapshot();
    mixer.setTime(OBSERVER_LOOP_SECONDS);
    expect(snapshot()).toEqual(initial);
    mixer.setTime(4.4);
    const reduced = snapshot();
    mixer.setTime(10);
    mixer.setTime(4.4);
    expect(snapshot()).toEqual(reduced);
    mixer.stopAllAction();
    mixer.uncacheRoot(root);
  });
});
