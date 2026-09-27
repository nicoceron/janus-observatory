import * as THREE from 'three';
import { Sculpture } from './sculpture';
import { panel, curveTube } from './modeling';
/** An uncrewed truss assembly: autonomous industry has a different silhouette from inhabited cabins. */
export function machineStation(s: Sculpture, m: THREE.Matrix4, surface = false) {
  const axes = surface ? 3 : 4;
  s.add(
    new THREE.OctahedronGeometry(0.085),
    '#b9ceca',
    [0, surface ? 0.15 : 0, 0],
    undefined,
    [1, 1.1, 0.8],
    m,
  );
  for (let i = 0; i < axes; i++) {
    const a = (i * Math.PI * 2) / axes,
      y = surface ? 0.13 : Math.sin(a) * 0.15;
    const x = Math.cos(a) * 0.24,
      z = Math.sin(a) * 0.21;
    s.bar([0, surface ? 0.15 : 0, 0], [x, y, z], 0.008, '#d4c6a3', m);
    s.bar([0, surface ? 0.12 : -0.035, 0], [x, y - 0.04, z], 0.006, '#718b99', m);
    s.bar([x, y, z], [x, y - 0.04, z], 0.004, '#d4c6a3', m);
    const frame = m.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z));
    panel(s, frame, 0.12, 0.21, [0, 0, 0], i * 0.2 - 0.3);
    if (surface) {
      s.bar([x, y - 0.04, z], [x * 0.85, 0, z * 0.85], 0.013, '#7a959c', m);
      s.cylinder(0.035, 0.05, 0.01, '#d1c1a2', [x * 0.85, 0.005, z * 0.85], m, 6);
    }
  }
  for (const side of [-1, 1])
    curveTube(
      s,
      [
        [side * 0.03, surface ? 0.2 : 0.05, 0],
        [side * 0.09, surface ? 0.3 : 0.15, -0.05],
        [side * 0.03, surface ? 0.34 : 0.19, -0.13],
      ],
      0.008,
      '#c2b993',
      m,
    );
  s.add(
    new THREE.TorusGeometry(0.093, 0.008, 5, 16),
    '#819fa7',
    [0, surface ? 0.19 : 0.04, 0],
    [0.7, 0.2, 0],
    undefined,
    m,
  );
}
