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
  s.box([0.155, 0.018, 0.13], '#b5bc78', [0, 0.01, 0], m);
  for (let row = 0; row < 4; row++)
    s.box(
      [0.137, 0.023, 0.017],
      (row + i) % 2 ? '#91b661' : '#d3cb81',
      [0, 0.025, (row - 1.5) * 0.028],
      m,
    );
}
export function sailboat(s: Sculpture) {
  s.ico(0.11, '#a5794e', [0, 0, 0], [0.46, 0.28, 1.2]);
  s.box([0.073, 0.018, 0.19], cream, [0, 0.018, 0]);
  s.bar([0, 0.02, 0.015], [0, 0.23, 0.015], 0.007, timber);
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        0, 0.23, 0.015, 0, 0.055, 0.015, 0, 0.055, -0.12, 0, 0.21, 0.028, 0, 0.065, 0.13, 0, 0.065,
        0.028,
      ],
      3,
    ),
  );
  s.add(g, '#f0eee0');
}
export function aircraft(s: Sculpture, color: string) {
  s.ico(0.13, '#e5e4cf', [0, 0, 0], [0.29, 0.29, 1.5], undefined, 1);
  s.box([0.32, 0.014, 0.073], cream, [0, -0.005, 0]);
  for (const side of [-1, 1]) s.box([0.06, 0.018, 0.075], color, [side * 0.145, -0.003, 0]);
  s.box([0.14, 0.012, 0.045], color, [0, 0.01, 0.145]);
  s.box([0.012, 0.07, 0.068], color, [0, 0.035, 0.138]);
  s.ico(0.04, '#376e87', [0, 0.03, -0.025], [0.7, 0.65, 1.6]);
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

/** Preserve the accepted opening Earth; scenario-specific biomes have their own object families. */
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
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 20; col++) {
      const i = row * 20 + col,
        lon = -180 + col * 18 + Math.sin(i * 2.3 + art.seed) * 4,
        lat = -57 + row * 19 + Math.cos(i * 1.7 + art.seed) * 3;
      if (mobile && i % 5 === 0) continue;
      if (g.project(g.direction(lon, lat), 0).length() < scale * 0.99) continue;
      const m = g.pose(lon, lat).scale(new THREE.Vector3(scale, scale, scale));
      m.multiply(new THREE.Matrix4().makeRotationY(Math.sin(i * 2.1) * 0.5));
      const h = 0.12 + (i % 4) * 0.025;
      if (i % 5 === 0) field(s, m, i);
      else if (i % 3 === 0) villa(s, m, i % 2 ? '#c05c66' : '#cc8661');
      else if (i % 3 === 1) fir(s, m, h, i);
      else broadleaf(s, m, h * 0.95, i);
    }
  }
  let harbors = 0;
  for (let lon = -65; lon < 75 && harbors < 3; lon += 13) {
    const lat = -12 + harbors * 16;
    if (g.project(g.direction(lon, lat), 0).length() > scale * 0.97) continue;
    const m = g.pose(lon, lat).scale(new THREE.Vector3(scale, scale, scale));
    for (const side of [-1, 1])
      s.bar(
        [-0.035 + side * 0.024, 0.009, 0.055],
        [-0.035 + side * 0.054, 0.009, 0.145],
        0.003,
        '#b1d8d7',
        m,
      );
    const boat = new Sculpture();
    sailboat(boat);
    s.add(boat.finish(), null, [-0.035, 0.005, 0], [0, 0.4, 0], [0.7, 0.7, 0.7], m);
    harbors++;
  }
}
