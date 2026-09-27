import * as THREE from 'three';
import { Sculpture } from './sculpture';
export type MechanismKind = 'watermill' | 'windmill';
export function mechanismPosition(kind: MechanismKind): [number, number, number] {
  return kind === 'watermill' ? [0.14, 0.093, 0] : [0, 0.23, 0.074];
}
export function mechanismGeometry(kind: MechanismKind) {
  const s = new Sculpture();
  if (kind === 'watermill') {
    for (const x of [-0.022, 0.022])
      s.add(
        new THREE.TorusGeometry(0.089, 0.007, 5, 20),
        '#7b573e',
        [x, 0, 0],
        [0, Math.PI / 2, 0],
      );
    s.add(new THREE.CylinderGeometry(0.018, 0.018, 0.064, 10), '#b9a37c', undefined, [
      0,
      0,
      Math.PI / 2,
    ]);
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5;
      s.bar([0, 0, 0], [0, Math.sin(a) * 0.085, Math.cos(a) * 0.085], 0.0035, '#b9a37c');
      s.box(
        [0.055, 0.029, 0.009],
        '#997045',
        [0, Math.sin(a) * 0.091, Math.cos(a) * 0.091],
        undefined,
        [a, 0, 0],
      );
    }
  } else {
    s.add(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 10), '#7a5d41', undefined, [
      Math.PI / 2,
      0,
      0,
    ]);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.22;
      const m = new THREE.Matrix4().makeRotationZ(a);
      s.bar([0, 0, 0], [0.181, 0, 0], 0.004, '#927149', m);
      for (const y of [-0.017, 0.017]) s.bar([0.064, y, 0], [0.18, y, 0], 0.0028, '#886647', m);
      for (let j = 0; j < 6; j++)
        s.box(
          [0.009, 0.031, 0.003],
          j % 2 ? '#cbbb94' : '#ded1aa',
          [0.069 + j * 0.02, 0, 0.003],
          m,
        );
    }
  }
  return s.finish();
}
