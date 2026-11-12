import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  OBSERVER_FACE,
  OBSERVER_LOOP_SECONDS,
  elbowPosition,
  observerClip,
} from './observer-animation';
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

/** The rig's own hierarchy down to the pupils, and the telescope as the observer sees it. */
function observingRig(mobile: boolean, framing: number) {
  const layout = telescopeLayout(mobile, framing);
  const up = new THREE.Vector3(0, 1, 0);
  const root = new THREE.Group();
  const node = (name: string, parent: THREE.Object3D, position?: number[], rotation?: number[]) => {
    const group = new THREE.Group();
    group.name = name;
    if (position) group.position.fromArray(position);
    if (rotation) group.rotation.fromArray(rotation as [number, number, number]);
    parent.add(group);
    return group;
  };
  const chest = node('chest', root),
    head = node('head', chest),
    face = node('face', head, OBSERVER_FACE.position, OBSERVER_FACE.rotation);
  const eyes = [-1, 1].map((side) => {
    const { position, rotation } = OBSERVER_FACE.eye(side);
    return node(side < 0 ? 'leftEye' : 'rightEye', face, position, rotation);
  });
  for (const name of ['antennae', 'scarfTail', 'leftBlink', 'rightBlink', 'focusGrip', 'freeHand'])
    node(name, root);
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(observerClip(layout.supportHand)).play();
  const eyepiece = layout.eye
    .clone()
    .sub(layout.observerPosition)
    .divideScalar(layout.observerScale)
    .applyAxisAngle(up, -layout.observerRotation);
  const sight = layout.forward.clone().applyAxisAngle(up, -layout.observerRotation);
  /** The pose at a clip time: each pupil's distance behind the eyepiece and off its axis. */
  const at = (time: number) => {
    mixer.setTime(time);
    root.updateMatrixWorld(true);
    const [left, right] = eyes.map((eye) => {
      const pupil = new THREE.Vector3(...OBSERVER_FACE.pupil).applyMatrix4(eye.matrixWorld);
      const offset = pupil.clone().sub(eyepiece),
        behind = -offset.dot(sight);
      const gaze = new THREE.Vector3(0, 0, 1).transformDirection(eye.matrixWorld);
      return {
        pupil,
        behind,
        offAxis: offset.addScaledVector(sight, behind).length(),
        squint: THREE.MathUtils.radToDeg(gaze.angleTo(sight)),
      };
    });
    const shoulder = new THREE.Vector3(-0.32, -0.32, 0).applyMatrix4(chest.matrixWorld);
    const hand = root.getObjectByName('freeHand')!.position;
    const elbow = elbowPosition(
      shoulder,
      hand,
      new THREE.Vector3(-0.84, -0.67, 0.5).applyMatrix4(chest.matrixWorld),
      0.57,
      0.72,
      new THREE.Vector3(),
    );
    const mouth = new THREE.Vector3(0, 0.02, 0.31).applyMatrix4(face.matrixWorld);
    const nearest = (point: THREE.Vector3) =>
      Math.min(
        ...[new THREE.Line3(shoulder, elbow), new THREE.Line3(elbow, hand)].map((arm) =>
          arm.closestPointToPoint(point, true, new THREE.Vector3()).distanceTo(point),
        ),
      );
    return {
      left,
      right,
      armToFace: Math.min(nearest(mouth), nearest(left.pupil), nearest(right.pupil)),
    };
  };
  return { at, done: () => (mixer.stopAllAction(), mixer.uncacheRoot(root)) };
}
/** The two visits to the eyepiece; 4.4 inside the first is the reduced-motion still. */
const OBSERVING = [
  [4, 5.5],
  [13, 15],
];
const EYECUP_RADIUS = 0.118 * 0.78; // obs-telescope's eyecup, in observer units

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
          pole: new THREE.Vector3(-0.84, -0.67, 0.5).applyMatrix4(chest.matrix),
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
describe('the stranger at the eyepiece', () => {
  const stages = [
    ['desktop', false, 1],
    ['narrow desktop', false, 0.8],
    ['phone', true, 1],
  ] as const;
  it.each(stages)('rests the right eye on the optical axis on %s', (_, mobile, framing) => {
    const rig = observingRig(mobile, framing);
    for (const [from, to] of OBSERVING)
      for (let time = from; time <= to + 1e-9; time += 0.05) {
        const { right, left } = rig.at(time);
        // On the axis, a few hundredths behind the eyepiece, and turned toward it.
        expect(right.offAxis).toBeLessThan(0.008);
        expect(right.behind).toBeGreaterThan(0.03);
        expect(right.behind).toBeLessThan(0.06);
        expect(right.squint).toBeLessThan(35);
        // The monocled eye stays clear of the eyecup.
        expect(left.offAxis).toBeGreaterThan(2 * EYECUP_RADIUS);
      }
    const still = rig.at(4.4);
    expect(still.right.offAxis).toBeLessThan(0.008);
    expect(still.right.behind).toBeGreaterThan(0.03);
    rig.done();
  });
  it('comes to the eyepiece from behind and never pushes the eye into the eyecup', () => {
    const rig = observingRig(false, 1);
    for (let frame = 0; frame < 720; frame++) {
      const { right } = rig.at((frame / 720) * OBSERVER_LOOP_SECONDS);
      if (right.offAxis < 1.5 * EYECUP_RADIUS) expect(right.behind).toBeGreaterThan(0.03);
    }
    rig.done();
  });
  it('steadies the tube with the free arm under the chin, never across the face', () => {
    const rig = observingRig(false, 1);
    for (const [from, to] of OBSERVING)
      for (let time = from; time <= to + 1e-9; time += 0.05)
        expect(rig.at(time).armToFace).toBeGreaterThan(0.25);
    rig.done();
  });
});
