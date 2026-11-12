import * as THREE from 'three';
import type { Vec } from './sculpture';

export const OBSERVER_LOOP_SECONDS = 18;

/**
 * Where the face sits in the rig (scripts/blender/kit/assets/observer.py authors to these): the
 * group inside `head`, each eye inside that group, and the pupil's centre on an eye. The right
 * eye (side 1) is the one that goes to the eyepiece; the monocle sits on the left.
 */
export const OBSERVER_FACE = {
  position: [0.105, 0, 0.015] as Vec,
  rotation: [0, 0.04, 0] as Vec,
  eye: (side: number) => ({
    position: [side * 0.223, 0.245, 0.261] as Vec,
    rotation: [0, side * 0.38, side * -0.13] as Vec,
  }),
  pupil: [0.026, -0.002, 0.094] as Vec,
};

/**
 * An authored performance: investigate, focus, discover, gesture, and return to observing.
 *
 * At the eyepiece (keys 4 to 5.5 and 13 to 15) the stranger leans in and turns at the waist, and
 * the right pupil rests on the telescope's optical axis a few hundredths behind the eyepiece.
 * Those keys are solved against `telescopeLayout`; the breath between them moves chest and head
 * against each other so the eye stays put. observer-animation.test.ts holds them to it.
 */
export function observerClip(support: Vec) {
  const times = [0, 1.2, 2.5, 4, 5.5, 6.5, 7.8, 9.2, 10.4, 11.5, 13, 15, 16.5, 18];
  const last = times.length - 1;
  const scalar = (name: string, values: number[]) =>
    new THREE.NumberKeyframeTrack(name, times, values, THREE.InterpolateSmooth);
  /**
   * Keys baked through a cubic that cannot overshoot them. `flow` keeps moving through a run of
   * keys (a monotone cubic, continuous across the loop seam) yet holds still between two keys
   * that share a value: the chest and head use it so the eye does not drift off the eyepiece.
   * Without `flow` every key is a rest, so a reaching hand travels straight from key to key and
   * can never be pushed beyond its fixed-length arm.
   */
  const settled = (name: string, keys: number[] | Vec[], flow = true) => {
    const size = keys.flat().length / times.length,
      values = keys.flat();
    const span = (i: number) => times[((i + last) % last) + 1] - times[(i + last) % last];
    const slope = (i: number, axis: number) => {
      const from = ((i + last) % last) * size + axis;
      return (values[from + size] - values[from]) / span(i);
    };
    const tangent = (i: number, axis: number) => {
      const before = slope(i - 1, axis),
        after = slope(i, axis);
      if (!flow || before * after <= 0) return 0;
      const h0 = span(i - 1),
        h1 = span(i);
      return (3 * (h0 + h1)) / ((2 * h1 + h0) / before + (h1 + 2 * h0) / after);
    };
    const bakedTimes: number[] = [],
      bakedValues: number[] = [];
    for (let i = 0; i < last; i++)
      for (let step = 0; step < 16; step++) {
        const t = step / 16,
          eased = t * t * (3 - 2 * t);
        bakedTimes.push(THREE.MathUtils.lerp(times[i], times[i + 1], t));
        for (let axis = 0; axis < size; axis++)
          bakedValues.push(
            THREE.MathUtils.lerp(values[i * size + axis], values[(i + 1) * size + axis], eased) +
              span(i) * t * (1 - t) * ((1 - t) * tangent(i, axis) - t * tangent(i + 1, axis)),
          );
      }
    bakedTimes.push(times[last]);
    bakedValues.push(...values.slice(-size));
    const Track = size === 3 ? THREE.VectorKeyframeTrack : THREE.NumberKeyframeTrack;
    return new Track(name, bakedTimes, bakedValues, THREE.InterpolateLinear);
  };
  return new THREE.AnimationClip('the-curious-astronomer', OBSERVER_LOOP_SECONDS, [
    settled('chest.position', [
      [0, 0, 0],
      [-0.025, 0.02, -0.02],
      [-0.145, 0, 0.274],
      [-0.063, 0.01, 0.284],
      [-0.063, 0.022, 0.284],
      [-0.035, 0.03, -0.035],
      [-0.02, 0.02, -0.02],
      [0, 0.025, 0],
      [0, 0.025, 0],
      [-0.145, 0, 0.274],
      [-0.066, 0.006, 0.28],
      [-0.063, 0.01, 0.284],
      [-0.035, 0.03, -0.035],
      [0, 0, 0],
    ]),
    settled('chest.rotation[x]', [0, 0, 0.14, 0.2, 0.19, 0, 0, 0, 0, 0.14, 0.2, 0.2, 0, 0]),
    settled(
      'chest.rotation[y]',
      [0, -0.07, 0.32, 0.45, 0.45, -0.12, -0.15, -0.1, -0.07, 0.32, 0.44, 0.45, -0.12, 0],
    ),
    settled(
      'chest.rotation[z]',
      [0, 0.025, 0.05, -0.02, -0.02, 0.035, 0.04, -0.025, 0.025, 0.05, -0.02, -0.02, 0.035, 0],
    ),
    settled(
      'head.rotation[x]',
      [
        -0.07, -0.25, -0.163, -0.199, -0.19, -0.23, -0.32, -0.16, -0.13, -0.163, -0.2, -0.199,
        -0.23, -0.07,
      ],
    ),
    settled(
      'head.rotation[y]',
      [
        -0.45, -0.15, 0.163, 0.106, 0.105, -0.3, -0.55, -0.65, -0.52, 0.163, 0.106, 0.106, -0.3,
        -0.45,
      ],
    ),
    settled(
      'head.rotation[z]',
      [
        0.03, -0.045, -0.01, 0.07, 0.054, 0.045, 0.09, -0.08, 0.075, -0.01, 0.082, 0.07, 0.045,
        0.03,
      ],
    ),
    settled('head.position', [
      [0, 0, 0],
      [0, 0.025, 0],
      [-0.14, 0.045, 0.02],
      [-0.13, 0.055, 0.03],
      [-0.132, 0.05, 0.034],
      [0, 0.04, 0],
      [-0.02, 0.035, 0],
      [0, 0.02, 0],
      [0, 0.02, 0],
      [-0.14, 0.045, 0.02],
      [-0.127, 0.055, 0.03],
      [-0.13, 0.055, 0.03],
      [0, 0.04, 0],
      [0, 0, 0],
    ]),
    // The scanner hand rounds the belly and comes in under the chin, so it never crosses the face.
    settled(
      'freeHand.position',
      [
        [-0.48, -1.25, 0.25],
        [-0.53, -1.08, 0.36],
        [0.1, -0.12, 0.68],
        support,
        support,
        [-0.2, -0.18, 0.6],
        [-0.86, 0.48, 0.05],
        [-1.02, 0.25, 0.18],
        [-0.94, 0.36, 0.12],
        [-0.25, -0.4, 0.72],
        support,
        support,
        [-0.15, -0.55, 0.62],
        [-0.48, -1.25, 0.25],
      ],
      false,
    ),
    scalar(
      'freeHand.rotation[z]',
      [-0.4, -0.2, 0, 0, 0, -0.5, -0.45, 0.3, -0.25, -0.2, 0, 0, -0.3, -0.4],
    ),
    scalar(
      'focusGrip.rotation[x]',
      [0, 0.04, 0, 0.3, -0.28, 0.1, 0, 0, 0, 0, 0.32, -0.32, 0.04, 0],
    ),
    scalar(
      'antennae.rotation[z]',
      [0.03, 0.1, -0.09, -0.04, 0.06, 0.16, -0.16, 0.12, -0.1, 0.05, -0.08, 0.05, 0.07, 0.03],
    ),
    scalar(
      'antennae.rotation[x]',
      [0, 0.15, -0.06, -0.1, -0.08, 0.16, 0.2, 0.12, 0.04, 0, -0.1, -0.08, 0.02, 0],
    ),
    scalar(
      'scarfTail.rotation[z]',
      [-0.16, -0.3, -0.18, 0.06, 0.02, -0.2, -0.34, -0.12, -0.3, -0.13, 0.02, 0.06, -0.15, -0.16],
    ),
    scalar(
      'scarfTail.rotation[x]',
      [0.1, 0.22, 0, -0.12, -0.13, 0.13, 0.32, 0.24, 0.18, 0, -0.11, -0.12, 0.13, 0.1],
    ),
    ...['leftBlink', 'rightBlink'].map(
      (name) =>
        new THREE.NumberKeyframeTrack(
          name + '.scale[y]',
          [
            0, 2.15, 2.27, 2.42, 5.8, 5.94, 6.08, 8.55, 8.66, 8.8, 12.4, 12.52, 12.66, 16.5, 16.62,
            16.77, 18,
          ],
          [1, 1, 0.07, 1, 1, 0.07, 1, 1, 0.07, 1, 1, 0.07, 1, 1, 0.07, 1, 1],
          THREE.InterpolateLinear,
        ),
    ),
  ]);
}

/** Two fixed-length segments; the bend plane is chosen by a stable anatomical pole. */
export function elbowPosition(
  from: THREE.Vector3,
  to: THREE.Vector3,
  pole: THREE.Vector3,
  upper: number,
  lower: number,
  target: THREE.Vector3,
) {
  const direction = to.clone().sub(from),
    distance = direction.length();
  direction.normalize();
  const d = THREE.MathUtils.clamp(
    distance,
    Math.abs(upper - lower) + 0.0001,
    upper + lower - 0.0001,
  );
  const along = (upper * upper - lower * lower + d * d) / (2 * d);
  const bend = pole.clone().sub(from);
  bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  return target
    .copy(from)
    .addScaledVector(direction, along)
    .addScaledVector(bend, Math.sqrt(Math.max(0, upper * upper - along * along)));
}

export type LimbNodes = { upper: THREE.Mesh; lower: THREE.Mesh; joint: THREE.Group };
const vertical = new THREE.Vector3(0, 1, 0);
export function placeLimb(
  nodes: LimbNodes,
  from: THREE.Vector3,
  to: THREE.Vector3,
  pole: THREE.Vector3,
  upper: number,
  lower: number,
) {
  const elbow = elbowPosition(from, to, pole, upper, lower, new THREE.Vector3());
  const segment = (mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) => {
    const direction = b.clone().sub(a);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.scale.y = direction.length();
    mesh.quaternion.setFromUnitVectors(vertical, direction.normalize());
  };
  segment(nodes.upper, from, elbow);
  segment(nodes.lower, elbow, to);
  nodes.joint.position.copy(elbow);
}
