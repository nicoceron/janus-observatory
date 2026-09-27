import * as THREE from 'three';
import { Ground, type MapPoint } from './planet-surface';
import { Sculpture } from './sculpture';
import { lifeGeometry } from './life-geometry';

/** Original miniature airfield: a maintained clearing, apron and aviation buildings, not a road. */
export function addAirfield(
  s: Sculpture,
  g: Ground,
  center: THREE.Vector3,
  rotation: THREE.Quaternion,
  scale: number,
  grass: boolean,
) {
  const n = center.clone().normalize();
  const forward = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(rotation)
    .projectOnPlane(n)
    .normalize();
  const right = new THREE.Vector3().crossVectors(n, forward).normalize();
  const direction = (z: number, x = 0) =>
    n.clone().addScaledVector(forward, z).addScaledVector(right, x).normalize();
  const map = (z: number, x = 0): MapPoint => {
    const p = direction(z, x);
    return [
      THREE.MathUtils.radToDeg(Math.atan2(p.x, p.z)),
      THREE.MathUtils.radToDeg(Math.asin(p.y)),
    ];
  };
  const at = (z: number, x: number, lift = 0.012) => {
    const up = direction(z, x),
      f = forward.clone().projectOnPlane(up).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(up, f), up, f),
    );
    return new THREE.Matrix4().compose(
      g.project(up, lift),
      q,
      new THREE.Vector3(scale, scale, scale),
    );
  };
  const strip = (z0: number, z1: number, x: number, width: number, color: string, lift = 0.009) =>
    g.trail(
      s,
      Array.from({ length: 13 }, (_, i) => map(z0 + ((z1 - z0) * i) / 12, x)),
      width,
      color,
      lift,
    );

  // One continuous runway with shoulders and piano-key thresholds: no alternating grass patches.
  strip(-0.26, 0.26, 0, 0.057, '#9eae79', 0.006);
  strip(-0.24, 0.24, 0, 0.043, '#485f69', 0.011);
  for (const x of [-0.039, 0.039]) strip(-0.23, 0.23, x, 0.0012, '#e2e9da', 0.015);
  for (const z of [-0.14, -0.07, 0, 0.07, 0.14])
    strip(z - 0.015, z + 0.015, 0, 0.0016, '#f2edda', 0.016);
  for (const end of [-1, 1])
    for (const x of [-0.026, -0.014, 0.014, 0.026])
      strip(end * 0.185, end * 0.218, x, 0.0023, '#f2edda', 0.016);
  // Small edge cones distinguish an airstrip from a painted public carriageway.
  for (const x of [-0.052, 0.052])
    for (const z of [-0.22, 0, 0.22]) {
      s.cone(0.009, 0.018, '#eee6cd', [0, 0.008, 0], at(z, x), 4);
    }
  // A single connected apron branches from the strip and reaches both hangar and terminal.
  g.trail(s, [map(-0.075, 0.025), map(-0.075, 0.09), map(0.11, 0.09)], 0.034, '#c4c4a5', 0.013);
  strip(-0.12, 0.14, 0.125, 0.044, '#c4c4a5', 0.013);
  const hangar = at(0.1, 0.18);
  s.box([0.11, 0.075, 0.09], '#dedbc2', [0, 0.038, 0], hangar);
  for (const side of [-1, 1])
    s.box([0.065, 0.008, 0.105], grass ? '#466e74' : '#84a99d', [side * 0.025, 0.082, 0], hangar, [
      0,
      0,
      side * -0.35,
    ]);
  s.box([0.084, 0.058, 0.004], '#344b50', [0, 0.03, -0.046], hangar);
  for (const x of [-0.043, 0, 0.043])
    s.box([0.003, 0.059, 0.006], '#bdc6b9', [x, 0.03, -0.05], hangar);
  const tower = at(-0.13, 0.17);
  s.box([0.035, 0.075, 0.035], '#d1c7a3', [0, 0.037, 0], tower);
  s.box([0.055, 0.026, 0.048], '#5f929b', [0, 0.086, 0], tower);
  s.box([0.065, 0.007, 0.059], '#e0dbc2', [0, 0.103, 0], tower);
  const sock = at(-0.19, 0.1);
  s.bar([0, 0, 0], [0, 0.11, 0], 0.003, '#d7d4b9', sock);
  for (let i = 0; i < 4; i++)
    s.add(
      new THREE.CylinderGeometry(0.013 - i * 0.002, 0.011 - i * 0.002, 0.014, 6),
      i % 2 ? '#f0e8ca' : '#d78450',
      [0.009 + i * 0.013, 0.102 - i * 0.003, 0],
      [0, 0, Math.PI / 2 - 0.2],
      [1, 1, 1],
      sock,
    );
  // A parked aircraft makes the function legible even while the animated flight is elsewhere.
  s.add(
    lifeGeometry({ type: 'aircraft', kind: 'regional-plane' }),
    null,
    [0, 0.026, 0],
    [0, Math.PI, 0],
    [0.34, 0.34, 0.34],
    at(-0.045, 0.135),
  );
}
