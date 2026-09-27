import { originRiver } from './origin-world';
import { roadClearance } from './activity-corridor';
import * as THREE from 'three';
import { Sculpture } from './sculpture';
import type { Ground } from './planet-surface';
import type { WorldArt } from './worlds';
import { addScenarioBiomes } from './ScenarioBiomes';

const cream = '#f0e9cc',
  dark = '#264657',
  timber = '#88613f';

function fir(s: Sculpture, m: THREE.Matrix4, h: number, i: number) {
  s.cylinder(0.009, 0.016, h * 0.43, timber, [0, h * 0.18, 0], m, 5);
  s.cone(h * 0.35, h * 0.82, ['#238466', '#499b65', '#68ac69'][i % 3], [0, h * 0.64, 0], m, 4);
  s.cone(h * 0.26, h * 0.63, '#7ab975', [0, h * 0.83, 0], m, 4);
}
function broadleaf(s: Sculpture, m: THREE.Matrix4, h: number, i: number) {
  s.cylinder(0.01, 0.016, h * 0.66, timber, [0, h * 0.3, 0], m, 5);
  s.ico(h * 0.44, i % 5 === 0 ? '#dcb486' : '#74b675', [0, h * 0.81, 0], [1, 1.1, 0.83], m);
  s.ico(h * 0.32, i % 5 === 0 ? '#e5ca9c' : '#a4cd84', [h * 0.27, h * 0.9, 0.015], [1, 1, 1], m);
}
function villa(s: Sculpture, m: THREE.Matrix4, roof: string, w = 0.083) {
  s.box([w * 1.6, 0.019, w * 1.8], '#c9ce9b', [0, 0.01, 0], m);
  s.box([w, w * 0.75, w * 1.35], cream, [0, w * 0.38 + 0.014, 0], m);
  const shape = new THREE.Shape();
  shape.moveTo(-w * 0.65, 0);
  shape.lineTo(w * 0.65, 0);
  shape.lineTo(0, w * 0.48);
  shape.closePath();
  s.add(
    new THREE.ExtrudeGeometry(shape, { depth: w * 1.55, bevelEnabled: false }),
    roof,
    [0, w * 0.75 + 0.014, -w * 0.775],
    [0, 0, 0],
    [1, 1, 1],
    m,
  );
  s.box([w * 0.22, w * 0.4, 0.005], dark, [-w * 0.17, w * 0.23 + 0.014, w * 0.685], m);
  s.box([w * 0.2, w * 0.2, 0.006], '#4cabc1', [w * 0.23, w * 0.49, w * 0.685], m);
  s.box([w * 0.17, w * 0.48, w * 0.2], '#b8a38b', [w * 0.26, w, -w * 0.22], m);
}
function field(s: Sculpture, m: THREE.Matrix4, i: number) {
  // Open soil beds and individual leaves read as agriculture, without pallet-like rails.
  const variant = Math.floor(i / 5) % 3;
  s.box([0.132, 0.005, 0.108], '#66503b', [0, 0.003, 0], m);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x = (col - 1.5) * 0.029 + Math.sin(i + row * 4 + col) * 0.002;
      const z = (row - 1) * 0.031;
      if (variant === 0) {
        s.ico(0.015, col % 2 ? '#76af46' : '#94c65b', [x, 0.017, z], [1, 0.7, 1], m);
        s.ico(0.008, '#bedb77', [x, 0.027, z], [0.7, 0.7, 0.7], m);
      } else {
        const h = 0.029 + ((row + col) % 3) * 0.006;
        s.cone(0.006, h, '#4d8d43', [x, h / 2 + 0.005, z], m, 4);
        for (const side of [-1, 1])
          s.add(
            new THREE.ConeGeometry(0.006, 0.028, 3),
            '#81b44d',
            [x + side * 0.007, 0.02, z],
            [0, 0, side * -0.8],
            [1, 1, 1],
            m,
          );
        if (variant === 2) s.ico(0.006, '#e0be5e', [x, h + 0.007, z], [0.7, 1.7, 0.7], m);
      }
    }
  }
}
export function satellite(s: Sculpture, color: string) {
  s.box([0.08, 0.075, 0.12], cream, [0, 0, 0]);
  for (const side of [-1, 1]) {
    s.box([0.135, 0.008, 0.12], '#376487', [side * 0.11, 0, 0]);
    for (let row = 0; row < 3; row++)
      s.box([0.13, 0.01, 0.003], color, [side * 0.11, 0.006, (row - 1) * 0.035]);
  }
  s.bar([0, 0.04, 0], [0, 0.14, 0], 0.005, color);
  s.ico(0.034, color, [0, 0.145, 0], [1, 0.3, 1]);
}

/** Original terrestrial vegetation and houses; living traffic is a separate articulated layer. */
export function addWorldBiomes(
  s: Sculpture,
  g: Ground,
  art: WorldArt,
  scale: number,
  mobile: boolean,
) {
  if (art.form !== 'origin') {
    addScenarioBiomes(s, g, art, scale, mobile);
    return;
  }
  const clear = roadClearance(art, mobile);
  const riverPoints = originRiver.slice(1).flatMap((end, i) => {
    const a = g.direction(...originRiver[i]),
      b = g.direction(...end);
    return Array.from({ length: 16 }, (_, step) =>
      a
        .clone()
        .lerp(b, step / 15)
        .normalize(),
    );
  });
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 20; col++) {
      const i = row * 20 + col,
        lon = -180 + col * 18 + Math.sin(i * 2.3 + art.seed) * 4,
        lat = -57 + row * 19 + Math.cos(i * 1.7 + art.seed) * 3;
      if (mobile && i % 7 === 0) continue;
      const position = g.project(g.direction(lon, lat), 0);
      if (position.length() < scale * 0.99 || !clear(position, scale * 0.12)) continue;
      if (riverPoints.some((p) => p.distanceTo(position.clone().normalize()) < 0.115)) continue;
      const m = g.pose(lon, lat).scale(new THREE.Vector3(scale, scale, scale));
      m.multiply(new THREE.Matrix4().makeRotationY(Math.sin(i * 2.1) * 0.5));
      const h = 0.12 + (i % 4) * 0.025;
      if (i % 5 === 0) field(s, m, i);
      else if (i % 3 === 0) villa(s, m, i % 2 ? '#c05c66' : '#cc8661');
      else if (i % 3 === 1) fir(s, m, h, i);
      else broadleaf(s, m, h * 0.95, i);
    }
  }
}
