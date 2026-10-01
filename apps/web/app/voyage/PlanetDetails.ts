import { originRiver } from './origin-world';
import * as THREE from 'three';
import { Sculpture, surface, wrapOnGlobe, type Vec } from './sculpture';
import { quarryBase, quarrySite } from './terrain';
import { Ground } from './planet-surface';
import { addWorldBiomes } from './WorldBiomes';
import type { WorldArt } from './worlds';
import { roadClearance } from './activity-corridor';

type MapPoint = [number, number];
const ivory = '#e8dec2',
  gold = '#c5a077',
  ink = '#334e5a',
  sage = '#779c7b';

function house(s: Sculpture, m: THREE.Matrix4, size = 0.1, color = ivory, roof = '#8b9987') {
  s.box([size * 1.35, 0.025, size * 1.2], '#9baf9a', [0, 0.01, 0], m);
  s.box([size, size * 0.8, size], color, [0, size * 0.4 + 0.02, 0], m);
  const gable = new THREE.Shape();
  gable.moveTo(-size * 0.62, 0);
  gable.lineTo(size * 0.62, 0);
  gable.lineTo(0, size * 0.45);
  gable.closePath();
  s.add(
    new THREE.ExtrudeGeometry(gable, { depth: size * 1.2, bevelEnabled: false }),
    roof,
    [0, size * 0.8 + 0.02, -size * 0.6],
    [0, 0, 0],
    [1, 1, 1],
    m,
  );
  s.box([size * 0.19, size * 0.36, 0.008], ink, [0, size * 0.2 + 0.025, size * 0.505], m);
  for (const x of [-1, 1])
    s.box(
      [size * 0.17, size * 0.2, 0.008],
      '#679095',
      [x * size * 0.29, size * 0.55, size * 0.505],
      m,
    );
}
function leafyTree(s: Sculpture, m: THREE.Matrix4, size = 0.14, color = sage) {
  s.cylinder(0.012, 0.018, size * 0.65, '#8a7a60', [0, size * 0.3, 0], m, 5);
  s.ico(size * 0.51, color, [0, size * 0.8, 0], [1, 0.95, 0.85], m, 1);
  s.ico(size * 0.32, '#a9bd92', [size * 0.27, size * 1.08, 0.005], [1, 0.95, 1], m);
}
function rock(s: Sculpture, m: THREE.Matrix4, size = 0.08, color = '#9da68f') {
  s.ico(size, color, [0, size * 0.3, 0], [1.1, 0.65, 0.8], m, 0);
  s.ico(size * 0.5, '#c3c3a1', [-size * 0.4, size * 0.57, 0], [0.7, 0.65, 0.9], m, 0);
}
function hatch(s: Sculpture, m: THREE.Matrix4, radius = 0.08) {
  s.cylinder(radius * 1.2, radius * 1.2, 0.018, gold, [0, 0.01, 0], m, 8);
  s.cylinder(radius, radius, 0.021, ink, [0, 0.021, 0], m, 8);
  s.box([radius * 0.12, 0.012, radius * 1.1], ivory, [0, 0.036, 0], m);
}
function river(s: Sculpture, g: Ground, sites: MapPoint[], width = 0.023) {
  g.trail(s, sites, width * 1.35, '#bdd2b1', 0.007, g.scale * 0.99);
  g.trail(s, sites, width, '#69a9b1', 0.012, g.scale * 0.99);
  g.trail(s, sites, width * 0.28, '#a0cace', 0.016, g.scale * 0.99);
}
function triangle(s: Sculpture, points: THREE.Vector3[], color: string) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      points.flatMap((v) => v.toArray()),
      3,
    ),
  );
  s.add(geometry, color);
}
/** A second, authored scale of detail. Every object is fictional; no scientific quantities here. */
export function addWorldDetails(s: Sculpture, art: WorldArt, globeScale: number, mobile: boolean) {
  const g = new Ground(art, globeScale, mobile);
  const clear = roadClearance(art, mobile);
  // Hand-placed coastal details obey the same corridor as scattered vegetation.
  // Relocate an obstructing detail onto nearby land, retaining its authored identity.
  const place = (
    lon: number,
    lat: number,
    radius: number,
    build: (matrix: THREE.Matrix4) => void,
  ) => {
    for (const [dx, dy] of [
      [0, 0],
      [-8, 4],
      [8, 4],
      [-16, 8],
      [16, 8],
      [0, 16],
      [-24, 12],
      [24, 12],
    ]) {
      const position = g.project(g.direction(lon + dx, lat + dy), 0);
      if (position.length() < globeScale * 0.99 || !clear(position, radius)) continue;
      build(g.pose(lon + dx, lat + dy));
      return;
    }
  };

  try {
    addWorldBiomes(s, g, art, globeScale, mobile);
    switch (art.form) {
      case 'origin': {
        river(s, g, originRiver, 0.011);
        [
          [21, 62],
          [31, 65],
          [42, 62],
          [51, 54],
        ].forEach(([lon, lat], i) => {
          const m = g.pose(lon, lat),
            h = 0.08 + (i % 2) * 0.055;
          s.cone(h * 0.6, h, '#9bab97', [0, h * 0.38, 0], m, 5);
          s.cone(h * 0.24, h * 0.4, ivory, [0, h * 0.65, 0], m, 5);
        });
        [
          [-37, -34],
          [-29, -42],
          [-22, -44],
        ].forEach(([lon, lat], i) =>
          place(lon, lat, 0.09, (m) => rock(s, m, 0.07 - i * 0.01, '#9eb69b')),
        );
        break;
      }
      case 'ecumenopolis':
        // Streets are assembled only from connected activity routes.
        break;
      case 'extraction': {
        const frame = surface(...quarrySite, 1.025);
        const origin = new THREE.Vector3().setFromMatrixPosition(frame),
          ex = new THREE.Vector3().setFromMatrixColumn(frame, 0).normalize(),
          ez = new THREE.Vector3().setFromMatrixColumn(frame, 2).normalize();
        // Perimeter posts stand on the actual ground beyond the benches; the rails follow the
        // globe between them and leave an open gate where the haul ramp reaches the rim.
        const posts = Array.from({ length: 12 }, (_, k) => {
          const a = ((k + 0.5) / 12) * Math.PI * 2;
          const n = origin
            .clone()
            .addScaledVector(ex, Math.cos(a) * 0.62)
            .addScaledVector(ez, Math.sin(a) * 0.52)
            .normalize();
          const ground = g.project(n, 0);
          const at = (lift: number) => ground.clone().addScaledVector(n, lift).toArray() as Vec;
          return { foot: at(-0.015), mid: at(0.04), top: at(0.075) };
        });
        posts.forEach((post, k) => {
          s.bar(post.foot, post.top, 0.008, gold);
          if (k === posts.length - 1) return;
          s.bar(post.top, posts[k + 1].top, 0.007, '#756a58');
          s.bar(post.mid, posts[k + 1].mid, 0.006, '#756a58');
        });
        // Excavator working the pit floor beside the foot of the ramp.
        wrapOnGlobe(s, frame, quarryBase(art), (q) => {
          const floor = -0.159;
          q.box([0.12, 0.022, 0.085], ink, [-0.02, floor + 0.011, -0.05]);
          q.box([0.067, 0.05, 0.065], gold, [-0.02, floor + 0.047, -0.05]);
          q.box([0.032, 0.024, 0.004], '#577f87', [-0.02, floor + 0.057, -0.016]);
          q.bar([0.005, floor + 0.068, -0.05], [0.075, floor + 0.13, -0.03], 0.012, gold);
          q.bar([0.075, floor + 0.13, -0.03], [0.11, floor + 0.035, -0.01], 0.01, '#d7bd8f');
          q.box([0.045, 0.024, 0.03], ink, [0.112, floor + 0.022, -0.008]);
        });
        const crane = g.pose(33, 15);
        s.bar([0, 0, 0], [0, 0.3, 0], 0.014, ink, crane);
        s.bar([-0.13, 0.31, 0], [0.14, 0.31, 0], 0.018, gold, crane);
        s.bar([0.13, 0.31, 0], [0.13, 0.16, 0], 0.003, ivory, crane);
        s.box([0.057, 0.04, 0.047], '#ab8e6c', [0.13, 0.14, 0], crane);
        [
          [-37, -31],
          [-26, -41],
          [35, -30],
        ].forEach(([lon, lat], i) => {
          const p = g.pose(lon, lat);
          for (let j = 0; j < 3; j++)
            s.cylinder(
              0.065 - j * 0.012,
              0.085 - j * 0.014,
              0.031,
              ['#a77b61', '#d7a37c', '#e2bd94'][j],
              [0, j * 0.029 + 0.01, 0],
              p,
              5,
            );
          s.add(
            new THREE.OctahedronGeometry(0.045),
            '#b4876a',
            [0.04, 0.11, 0.01],
            [0, 0, 0.4],
            [0.7, 1.5, 0.7],
            p,
          );
          if (i === 0) s.ico(0.025, ivory, [-0.05, 0.1, 0], [1, 1, 1], p);
        });
        break;
      }
      case 'arcadia': {
        const gardens: MapPoint[] = [
          [-31, -12],
          [-8, -24],
          [19, -21],
          [35, -5],
        ];
        gardens.forEach(([lon, lat], i) =>
          place(lon, lat, 0.14, (m) => {
            s.box([0.18, 0.025, 0.14], ivory, [0, 0.011, 0], m);
            for (let row = 0; row < 3; row++) {
              s.box(
                [0.146, 0.026, 0.025],
                i % 2 ? '#8fab7c' : '#aaac7d',
                [0, 0.035, (row - 1) * 0.04],
                m,
              );
              if (!mobile)
                for (let col = 0; col < 4; col++)
                  s.ico(
                    0.012,
                    '#c6ba8a',
                    [(col - 1.5) * 0.032, 0.06, (row - 1) * 0.04],
                    [1, 0.7, 1],
                    m,
                  );
            }
          }),
        );
        [
          [-41, -3],
          [-21, -19],
          [9, -30],
          [32, 7],
        ].forEach(([lon, lat], i) =>
          place(lon, lat, 0.11, (m) => house(s, m, 0.085, i % 2 ? '#d9cfb2' : ivory, '#849f93')),
        );
        [
          [-47, 7],
          [-24, -31],
          [27, -33],
          [47, 9],
        ].forEach(([lon, lat], i) =>
          place(lon, lat, 0.1, (m) => leafyTree(s, m, 0.12, i % 2 ? '#baaa8b' : sage)),
        );
        place(4, -4, 0.17, (pool) => {
          s.cylinder(0.13, 0.14, 0.019, ivory, [0, 0.018, 0], pool, 10);
          s.cylinder(0.105, 0.105, 0.023, '#70a8ab', [0, 0.024, 0], pool, 10);
          s.box([0.28, 0.025, 0.043], '#c6b998', [0, 0.058, 0], pool, [0, 0.3, 0]);
        });
        break;
      }
      case 'wilderness': {
        river(
          s,
          g,
          [
            [-15, 52],
            [-8, 37],
            [-18, 21],
            [-7, 5],
            [-13, -9],
            [3, -24],
            [12, -35],
          ],
          0.023,
        );
        river(
          s,
          g,
          [
            [32, 44],
            [19, 29],
            [22, 15],
            [8, 4],
            [-7, 5],
          ],
          0.012,
        );
        [
          [-36, -4],
          [-25, -19],
          [22, -6],
          [35, 9],
          [30, -24],
          [-48, 26],
        ].forEach(([lon, lat], i) => {
          place(lon, lat, 0.13, (m) => rock(s, m, 0.065 + (i % 3) * 0.016));
          if (i % 2 === 0) place(lon + 6, lat + 4, 0.11, (m) => leafyTree(s, m, 0.13, '#779b75'));
        });
        [
          [-31, 7],
          [-24, 3],
        ].forEach(([lon, lat]) =>
          place(lon, lat, 0.1, (m) => house(s, m, 0.075, '#b1a787', '#7a8e74')),
        );
        const bridge = g.pose(-10, -1);
        for (let i = 0; i < 8; i++)
          s.box([0.022, 0.018, 0.074], '#ad9b78', [(i - 3.5) * 0.027, 0.048, 0], bridge, [
            0,
            0,
            0.02 * Math.sin(i),
          ]);
        const fallen = g.pose(25, -23);
        s.bar([-0.07, 0.02, 0], [0.09, 0.035, 0.06], 0.025, '#8b795d', fallen);
        if (!mobile)
          [
            [-42, 9],
            [-34, -12],
            [31, 24],
            [41, -10],
            [-8, -27],
          ].forEach(([lon, lat]) =>
            place(lon, lat, 0.08, (m) => leafyTree(s, m, 0.085, '#abc19a')),
          );
        break;
      }
      case 'symbiosis': {
        [-32, 0, 30].forEach((lon, i) => {
          const m = surface(lon, 8);
          for (let side = 0; side < 6; side++) {
            const a = (side / 6) * Math.PI * 2;
            s.bar(
              [Math.cos(a) * 0.124, 0.092, Math.sin(a) * 0.124],
              [0, 0.198, 0],
              0.009,
              ivory,
              m,
            );
          }
          s.ico(0.037, i % 2 ? '#c59480' : '#a7cdb2', [0, 0.209, 0], [1, 0.75, 1], m, 1);
        });
        [
          [-29, -22],
          [7, -30],
          [33, -18],
        ].forEach(([lon, lat], i) => {
          const m = g.pose(lon, lat);
          s.cylinder(0.072, 0.1, 0.027, '#7b9f8a', [0, 0.014, 0], m, 6);
          for (let p = 0; p < 5; p++) {
            const a = (p / 5) * Math.PI * 2;
            s.add(
              new THREE.OctahedronGeometry(0.062),
              i % 2 ? '#cda18b' : '#dcd9b9',
              [Math.cos(a) * 0.055, 0.062, Math.sin(a) * 0.055],
              [Math.cos(a) * 0.8, 0, -Math.sin(a) * 0.8],
              [0.52, 1, 0.8],
              m,
            );
          }
          s.ico(0.031, '#b4c7a6', [0, 0.085, 0], [1, 1.4, 1], m);
        });
        [
          [-48, 24],
          [41, 30],
          [-43, -10],
          [41, -30],
        ].forEach(([lon, lat], i) => {
          const m = g.pose(lon, lat);
          for (let bud = 0; bud < (mobile ? 3 : 5); bud++) {
            const a = bud * 2.4,
              x = Math.cos(a) * 0.045,
              z = Math.sin(a) * 0.045,
              h = 0.055 + bud * 0.012;
            s.bar([x, 0, z], [x, h, z], 0.009, '#769b8a', m);
            s.ico(0.024, i % 2 ? '#c89487' : '#d6dac2', [x, h, z], [1.4, 0.7, 1.2], m, 1);
          }
        });
        break;
      }
      case 'engineered': {
        const shell = new THREE.IcosahedronGeometry(1.08, 1),
          p = shell.attributes.position;
        for (let i = 0; i < p.count; i += 3) {
          if ((i / 3) % 7 === 2) continue;
          const v = [0, 1, 2].map((j) => new THREE.Vector3().fromBufferAttribute(p, i + j));
          const center = v[0]
              .clone()
              .add(v[1])
              .add(v[2])
              .multiplyScalar(1 / 3),
            n = center.clone().normalize();
          const inset = v.map((a) =>
            a.clone().sub(center).multiplyScalar(0.68).add(center).addScaledVector(n, 0.021),
          );
          triangle(
            s,
            inset,
            (i / 3) % 3 === 0 ? '#9e94ae' : (i / 3) % 3 === 1 ? '#ded6c5' : '#b8afc7',
          );
          if ((i / 3) % 3 === 0) {
            const a = inset[0],
              b = inset[1],
              c = inset[2];
            for (let slat = 0; slat < 3; slat++) {
              const t = 0.3 + slat * 0.16;
              const from = a.clone().lerp(b, t).lerp(c, 0.24).addScaledVector(n, 0.009),
                to = a.clone().lerp(b, t).lerp(c, 0.57).addScaledVector(n, 0.009);
              s.bar(from.toArray() as Vec, to.toArray() as Vec, 0.007, '#736a80');
            }
          }
          if (!mobile || (i / 3) % 2 === 0)
            inset.forEach((a) => s.ico(0.012, gold, a.clone().lerp(center, 0.06).toArray() as Vec));
        }
        shell.dispose();
        break;
      }
      case 'reclaimed': {
        const m = surface(-12, 42);
        // Small climbing vines follow the existing arch rather than covering its silhouette.
        for (const side of [-1, 1]) {
          s.bar([side * 0.49, -0.07, 0.062], [side * 0.45, 0.28, 0.062], 0.012, '#748b62', m);
          s.bar([side * 0.45, 0.28, 0.062], [side * 0.34, 0.41, 0.062], 0.009, '#8ca577', m);
          for (let leaf = 0; leaf < 5; leaf++)
            s.ico(
              0.035,
              leaf % 2 ? '#90a579' : '#a7b484',
              [side * (0.49 - leaf * 0.025), 0.02 + leaf * 0.073, 0.067],
              [1, 0.65, 0.5],
              m,
            );
        }
        const plaza = g.pose(-8, -15);
        for (let x = 0; x < 4; x++)
          for (let z = 0; z < 3; z++) {
            if (x === 3 && z === 2) continue;
            s.box(
              [0.047, 0.012, 0.047],
              (x + z) % 2 ? '#c8be9a' : '#a9ae83',
              [(x - 1.5) * 0.054, 0.017, (z - 1) * 0.054],
              plaza,
            );
          }
        [
          [-29, -8],
          [15, -29],
          [32, -13],
        ].forEach(([lon, lat], i) => {
          const site = g.project(g.direction(lon, lat), 0);
          if (clear(site, 0.12) && site.length() > globeScale * 0.99)
            house(s, g.pose(lon, lat), 0.083, '#c8b995', i % 2 ? '#8e9c71' : '#b6a382');
        });
        [
          [-31, -28],
          [3, -36],
          [41, 2],
        ].forEach(([lon, lat]) => place(lon, lat, 0.12, (m) => leafyTree(s, m, 0.15, '#8ea573')));
        const fallen = g.pose(22, -5);
        for (let block = 0; block < 5; block++)
          s.box(
            [0.044, 0.041, 0.048],
            block % 2 ? '#ad9e80' : '#d1bd9b',
            [(block - 2) * 0.046, 0.03 + (block % 2) * 0.02, (block % 2) * 0.04],
            fallen,
            [0, block * 0.7, block * 0.12],
          );
        break;
      }
      case 'fractured': {
        [-26, 25].forEach((lon, i) => {
          const m = g.pose(lon, -12);
          s.cylinder(0.13, 0.15, 0.037, '#8b7d7c', [0, 0.019, 0], m, 8);
          hatch(s, m, 0.079);
          for (const x of [-0.052, 0.052]) s.box([0.012, 0.03, 0.17], '#c1a78e', [x, 0.055, 0], m);
          if (i === 1) s.box([0.025, 0.045, 0.02], '#d4bf9b', [0.1, 0.058, 0], m);
        });
        const bridge = g.pose(-1, -5);
        for (const side of [-1, 1]) {
          s.box([0.16, 0.025, 0.075], '#c0a48d', [side * 0.17, 0.065, 0], bridge, [
            0,
            0,
            side * 0.09,
          ]);
          s.box([0.031, 0.1, 0.047], '#8c7d75', [side * 0.21, 0.005, 0], bridge);
          s.bar([side * 0.07, 0.068, -0.03], [side * 0.02, 0.045, -0.025], 0.004, ink, bridge);
        }
        [-34, -20, 24, 37].forEach((lon, i) => {
          const m = surface(lon, 35 + (i % 2) * 13);
          for (let beam = 0; beam < 3; beam++)
            s.bar(
              [(beam - 1) * 0.039, 0.27 + i * 0.04, 0.04],
              [(beam - 1) * 0.039 + 0.025, 0.44 + i * 0.04, 0.04],
              0.005,
              ink,
              m,
            );
          s.box([0.07, 0.07, 0.006], '#66535d', [0, 0.16, 0.086], m);
        });
        [
          [-17, -38],
          [14, -41],
          [-12, 10],
          [9, 24],
        ].forEach(([lon, lat], i) => rock(s, g.pose(lon, lat), 0.045 + i * 0.008, '#a3887e'));
        break;
      }
      case 'machine-swarm':
        break;
      case 'duality': {
        [
          [-34, -10],
          [-12, -24],
          [19, -12],
        ].forEach(([lon, lat], i) => {
          const p = g.pose(lon, lat);
          for (let j = 0; j < 3; j++) {
            s.box(
              [0.09, 0.015, 0.021],
              j % 2 ? '#92a97b' : '#c1c39c',
              [0, 0.012, (j - 1) * 0.03],
              p,
            );
          }
          if (i !== 1) leafyTree(s, g.pose(lon - 7, lat + 5), 0.09, '#99b38a');
        });
        break;
      }
    }
  } finally {
    g.dispose();
  }
}
