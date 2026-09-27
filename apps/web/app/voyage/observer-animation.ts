import * as THREE from 'three';
import type { Vec } from './sculpture';

export const OBSERVER_LOOP_SECONDS = 18;

/** An authored performance: investigate, focus, discover, gesture, and return to observing. */
export function observerClip(support: Vec) {
  const times = [0, 1.2, 2.5, 4, 5.5, 6.5, 7.8, 9.2, 10.4, 11.5, 13, 15, 16.5, 18];
  const scalar = (name: string, values: number[]) =>
    new THREE.NumberKeyframeTrack(name, times, values, THREE.InterpolateSmooth);
  const vector = (name: string, values: Vec[]) => {
    if (name !== 'freeHand.position')
      return new THREE.VectorKeyframeTrack(name, times, values.flat(), THREE.InterpolateSmooth);
    // Bake eased reach keys so cubic overshoot cannot push a hand beyond its fixed-length arm.
    const bakedTimes: number[] = [],
      bakedValues: number[] = [];
    for (let i = 0; i < times.length - 1; i++)
      for (let step = 0; step < 16; step++) {
        const t = step / 16,
          eased = t * t * (3 - 2 * t);
        bakedTimes.push(THREE.MathUtils.lerp(times[i], times[i + 1], t));
        bakedValues.push(
          ...values[i].map((value, axis) =>
            THREE.MathUtils.lerp(value, values[i + 1][axis], eased),
          ),
        );
      }
    bakedTimes.push(times.at(-1)!);
    bakedValues.push(...values.at(-1)!);
    return new THREE.VectorKeyframeTrack(name, bakedTimes, bakedValues, THREE.InterpolateLinear);
  };
  return new THREE.AnimationClip('the-curious-astronomer', OBSERVER_LOOP_SECONDS, [
    vector('chest.position', [
      [0, 0, 0],
      [-0.025, 0.02, -0.02],
      [0.025, -0.02, 0.02],
      [0.085, -0.035, 0.065],
      [0.085, -0.035, 0.065],
      [-0.035, 0.03, -0.035],
      [-0.02, 0.02, -0.02],
      [0, 0.025, 0],
      [0, 0.025, 0],
      [0, 0, 0],
      [0.075, -0.04, 0.065],
      [0.085, -0.035, 0.065],
      [0.01, 0, 0],
      [0, 0, 0],
    ]),
    scalar(
      'chest.rotation[z]',
      [0, 0.025, -0.025, -0.105, -0.105, 0.035, 0.04, -0.025, 0.025, 0, -0.09, -0.1, 0, 0],
    ),
    scalar(
      'chest.rotation[y]',
      [0, -0.07, 0, 0.055, 0.055, -0.12, -0.15, -0.1, -0.07, 0, 0.03, 0.05, 0, 0],
    ),
    scalar(
      'head.rotation[y]',
      [-0.45, -0.15, 0.08, 0.25, 0.25, -0.3, -0.55, -0.65, -0.52, -0.15, 0.2, 0.24, -0.35, -0.45],
    ),
    scalar(
      'head.rotation[x]',
      [
        -0.07, -0.25, -0.08, 0.04, 0.04, -0.23, -0.32, -0.16, -0.13, -0.1, 0.045, 0.055, -0.04,
        -0.07,
      ],
    ),
    scalar(
      'head.rotation[z]',
      [
        0.03, -0.045, 0.02, -0.055, -0.055, 0.045, 0.09, -0.08, 0.075, 0.015, -0.045, -0.055, 0.02,
        0.03,
      ],
    ),
    vector('head.position', [
      [0, 0, 0],
      [0, 0.025, 0],
      [0.015, 0, 0.03],
      [0.06, -0.015, 0.075],
      [0.06, -0.015, 0.075],
      [0, 0.04, 0],
      [-0.02, 0.035, 0],
      [0, 0.02, 0],
      [0, 0.02, 0],
      [0, 0, 0],
      [0.05, -0.02, 0.065],
      [0.06, -0.015, 0.075],
      [0, 0, 0],
      [0, 0, 0],
    ]),
    vector('freeHand.position', [
      [-0.48, -1.25, 0.25],
      [-0.53, -1.08, 0.36],
      support,
      support,
      support,
      [-0.23, -0.15, 0.5],
      [-0.86, 0.48, 0.05],
      [-1.02, 0.25, 0.18],
      [-0.94, 0.36, 0.12],
      [-0.38, -0.34, 0.6],
      support,
      support,
      [-0.5, -1.12, 0.3],
      [-0.48, -1.25, 0.25],
    ]),
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
      [0.1, 0.22, 0.14, -0.06, -0.08, 0.13, 0.32, 0.24, 0.18, 0.12, -0.05, -0.07, 0.09, 0.1],
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
