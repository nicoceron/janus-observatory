'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Sculpture, surface, type Vec } from './sculpture';
import { addWorldDetails } from './PlanetDetails';
import { orbitalHabitat } from './SystemGeometry';
import type { WorldArt } from './worlds';

const cream = '#e9dfbd',
  gold = '#c9a574',
  ink = '#384a56',
  green = '#5c8973',
  coral = '#c68773';

function tree(
  s: Sculpture,
  lon: number,
  lat: number,
  height = 0.34,
  radius = 1.035,
  color = green,
) {
  const m = surface(lon, lat, radius);
  s.cylinder(0.018, 0.025, height * 0.4, '#8b7660', [0, height * 0.15, 0], m, 5);
  s.cone(height * 0.37, height * 0.75, color, [0, height * 0.52, 0], m);
  s.cone(height * 0.28, height * 0.61, '#8bad8d', [0, height * 0.78, 0], m);
}
function peak(s: Sculpture, lon: number, lat: number, h: number) {
  const m = surface(lon, lat);
  s.cone(h * 0.52, h, '#9aa79b', [0, h * 0.35, 0], m, 4);
  s.cone(h * 0.23, h * 0.45, cream, [0, h * 0.63, 0], m, 4);
}
function cloud(s: Sculpture, lon: number, lat: number, size: number, radius: number) {
  const m = surface(lon, lat, radius);
  s.ico(size, '#f1ead1', [0, 0.01, 0], [1.1, 0.92, 0.83], m, 0);
  s.ico(size * 0.7, '#e4e3cb', [-size * 0.85, 0, 0], [1, 0.82, 0.8], m, 0);
  s.ico(size * 0.78, '#f8efd6', [size * 0.75, 0.015, 0.015], [1, 0.85, 0.8], m, 0);
}
function arch(
  s: Sculpture,
  radius: number,
  thickness: number,
  color: string,
  parent: THREE.Matrix4,
  broken = false,
) {
  for (let i = 0; i < 11; i++) {
    if (broken && (i === 3 || i === 4)) continue;
    const a = (i / 10) * Math.PI;
    s.box(
      [radius * 0.29, thickness, thickness],
      color,
      [Math.cos(a) * radius, 0.08 + Math.sin(a) * radius, 0],
      parent,
      [0, 0, a + Math.PI / 2],
    );
  }
}
export function buildWorldGeometry(art: WorldArt, globeScale: number, mobile = false) {
  const s = new Sculpture();
  switch (art.form) {
    case 'origin':
      // The opening globe is deliberately quiet; the scenario landmarks arrive later.
      break;
    case 'ecumenopolis': {
      // One intentional skyline, stepped civic blocks, and an observation mast.
      const towers: [number, number, number, number][] = [
        [-30, 50, 0.52, 0.16],
        [-13, 57, 0.75, 0.17],
        [6, 61, 0.59, 0.18],
        [24, 51, 0.4, 0.16],
        [-27, 29, 0.3, 0.21],
        [-9, 35, 0.46, 0.2],
        [12, 35, 0.34, 0.18],
        [31, 34, 0.26, 0.2],
        [-34, 10, 0.2, 0.22],
        [-10, 10, 0.26, 0.22],
        [16, 9, 0.22, 0.23],
        [38, 14, 0.18, 0.18],
      ];
      towers.forEach(([lon, lat, h, w], i) => {
        const m = surface(lon, lat, 1.015);
        s.box([w * 1.25, 0.065, w * 1.25], '#798b8d', [0, 0.025, 0], m);
        if (i % 4 === 1) {
          // Faceted administration spire with a deep observation crown.
          s.cylinder(w * 0.43, w * 0.66, h, '#c5b18f', [0, h * 0.5 + 0.04, 0], m, 6);
          for (let floor = 1; floor <= 6; floor++) {
            const taper = w * (0.66 - (0.23 * floor) / 7);
            s.cylinder(
              taper + 0.008,
              taper + 0.008,
              0.013,
              ink,
              [0, (h * floor) / 7 + 0.04, 0],
              m,
              6,
            );
          }
          s.cylinder(w * 0.65, w * 0.46, h * 0.14, cream, [0, h * 1.06 + 0.04, 0], m, 6);
          s.bar([0, h * 1.14 + 0.04, 0], [0, h * 1.14 + 0.15, 0], 0.008, gold, m);
          return;
        }
        if (i % 4 === 2) {
          // Paired residential slabs linked by unequal skybridges.
          for (const side of [-1, 1]) {
            const height = h * (side < 0 ? 1 : 0.78);
            s.box(
              [w * 0.36, height, w * 0.77],
              side < 0 ? '#a08470' : '#d5bea2',
              [side * w * 0.34, height * 0.5 + 0.04, 0],
              m,
            );
            for (let floor = 1; floor <= 5; floor++)
              s.box(
                [w * 0.3, 0.012, 0.012],
                ink,
                [side * w * 0.34, (height * floor) / 6 + 0.05, w * 0.39],
                m,
              );
          }
          for (const fraction of [0.35, 0.71])
            s.box([w * 0.82, h * 0.07, w * 0.42], cream, [0, h * fraction, 0], m);
          return;
        }
        if (i % 4 === 3) {
          // Broad stepped compounds break the skyline's vertical rhythm.
          for (let tier = 0; tier < 3; tier++) {
            const width = w * (1.15 - tier * 0.23);
            s.box(
              [width, h * 0.34, width],
              tier % 2 ? '#aa9d85' : '#d5c2a2',
              [tier * w * 0.055, (h * (tier + 0.5)) / 3 + 0.04, 0],
              m,
            );
            s.box(
              [width * 0.84, 0.013, 0.012],
              ink,
              [tier * w * 0.055, (h * (tier + 0.6)) / 3 + 0.04, width * 0.505],
              m,
            );
          }
          return;
        }
        s.box(
          [w, h, w],
          i % 3 === 0 ? '#b4ad96' : i % 3 === 1 ? '#d8ba96' : '#a08470',
          [0, h * 0.5 + 0.04, 0],
          m,
        );
        s.box([w * 0.7, h * 0.19, w * 0.72], cream, [0, h * 1.08 + 0.04, 0], m);
        const floors = Math.max(3, Math.round(h * 11));
        for (let floor = 1; floor <= floors; floor++) {
          const y = (h * floor) / (floors + 1) + 0.05;
          s.box([w * 0.85, 0.011, 0.009], ink, [0, y, w * 0.51], m);
          for (const side of [-1, 1])
            s.box([0.007, 0.014, w * 0.67], '#637a7f', [side * w * 0.503, y, 0], m);
        }
        for (const x of [-w * 0.2, w * 0.2])
          s.box([0.01, h * 0.83, 0.011], '#c5b396', [x, h * 0.5 + 0.05, w * 0.515], m);
        s.box([w * 0.32, 0.035, w * 0.35], '#7d8b86', [0, h * 1.175 + 0.055, 0], m);
        if (i < 4)
          s.bar([w * 0.2, h * 1.18 + 0.06, 0], [w * 0.2, h * 1.18 + 0.14, 0], 0.005, gold, m);
      });
      const m = surface(-47, 53);
      s.cylinder(0.024, 0.06, 0.7, ink, [0, 0.33, 0], m, 6);
      s.cylinder(0.16, 0.12, 0.1, gold, [0, 0.7, 0], m, 8);
      s.ico(0.08, cream, [0, 0.79, 0], [1, 0.65, 1], m);
      break;
    }
    case 'extraction': {
      const m = surface(-8, 19, 1.025);
      s.add(
        new THREE.CylinderGeometry(0.49, 0.54, 0.16, 6, 1, true),
        '#ca9675',
        [0, 0.02, 0],
        [0, 0, 0],
        [1, 1, 1],
        m,
      );
      for (let i = 0; i < 5; i++) {
        const outer = 0.49 - i * 0.079,
          inner = outer - 0.064,
          y = 0.1 - i * 0.044;
        s.add(
          new THREE.RingGeometry(inner, outer, 6, 1, Math.PI / 2),
          i % 2 ? '#b97759' : '#e4b493',
          [0, y, 0],
          [-Math.PI / 2, 0, 0],
          [1, 1, 1],
          m,
        );
        s.add(
          new THREE.CylinderGeometry(inner, inner, 0.044, 6, 1, true),
          '#a36852',
          [0, y - 0.022, 0],
          [0, 0, 0],
          [1, 1, 1],
          m,
        );
      }
      s.cylinder(0.095, 0.095, 0.02, '#514454', [0, -0.08, 0], m, 6);
      peak(s, -32, 62, 0.32);
      peak(s, -8, 66, 0.44);
      for (let i = 0; i < 3; i++) {
        const t = surface(36 + i * 10, 27 - i * 7);
        s.cylinder(0.07, 0.085, 0.3, '#ead3ae', [0, 0.15, 0], t, 6);
        s.cylinder(0.082, 0.082, 0.025, ink, [0, 0.24, 0], t, 6);
      }
      s.ico(0.15, '#be967c', [-1.28, 0.45, -0.1], [1.2, 0.9, 1], undefined, 1);
      s.ico(0.09, '#e2c5a4', [-1.43, 0.74, -0.12]);
      break;
    }
    case 'arcadia': {
      const m = surface(-14, 33);
      [
        [-0.2, 0, 0.05],
        [0.08, 0, 0],
        [0.31, 0, 0.07],
        [-0.03, 0, -0.22],
      ].forEach(([x, , z], i) => {
        const r = i === 1 ? 0.23 : 0.15;
        s.cylinder(r, r, 0.06, cream, [x, 0.03, z], m, 10);
        s.add(
          new THREE.SphereGeometry(r, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2),
          '#91b4aa',
          [x, 0.065, z],
          [0, 0, 0],
          [1, 0.8, 1],
          m,
        );
        for (let rib = 0; rib < 8; rib++) {
          const a = (rib / 8) * Math.PI * 2;
          s.bar(
            [x + Math.cos(a) * r, 0.065, z + Math.sin(a) * r],
            [x + Math.cos(a) * r * 0.65, 0.065 + r * 0.63, z + Math.sin(a) * r * 0.65],
            0.009,
            cream,
            m,
          );
          s.bar(
            [x + Math.cos(a) * r * 0.65, 0.065 + r * 0.63, z + Math.sin(a) * r * 0.65],
            [x, 0.065 + r * 0.8, z],
            0.009,
            cream,
            m,
          );
        }
        s.ico(0.025, gold, [x, r * 0.8 + 0.082, z], [1, 1, 1], m);
      });
      s.add(
        new THREE.TorusGeometry(1.29, 0.014, 4, 80, Math.PI * 1.83),
        gold,
        [0, 0, 0],
        [1.02, 0.38, -0.3],
      );
      s.add(new THREE.BoxGeometry(0.26, 0.12, 0.12), cream, [1.2, -0.18, 0.37], [0, 0.2, -0.4]);
      tree(s, -43, 15, 0.26);
      tree(s, 32, 45, 0.25);
      break;
    }
    case 'wilderness': {
      const groves = [
        [-36, 31],
        [-24, 27],
        [-12, 24],
        [-2, 31],
        [9, 24],
        [22, 30],
        [-40, 47],
        [-27, 45],
        [-11, 45],
        [4, 48],
        [22, 48],
        [35, 39],
        [-20, 7],
        [-5, 4],
        [10, 8],
      ];
      groves.forEach(([lon, lat], i) => tree(s, lon, lat, 0.27 + (i % 3) * 0.045));
      peak(s, -31, 68, 0.42);
      peak(s, -8, 71, 0.53);
      peak(s, 16, 66, 0.36);
      break;
    }
    case 'symbiosis': {
      const m = surface(-8, 45);
      const branches: [Vec, Vec][] = [
        [
          [0, 0, 0],
          [-0.26, 0.57, 0],
        ],
        [
          [0, 0.12, 0],
          [0.18, 0.77, -0.08],
        ],
        [
          [0, 0.07, 0],
          [0.4, 0.46, 0.11],
        ],
        [
          [-0.03, 0.08, 0.06],
          [-0.35, 0.31, 0.29],
        ],
        [
          [0, 0.15, 0],
          [0.04, 0.45, 0.34],
        ],
      ];
      branches.forEach(([a, b], i) => {
        const mid: Vec = [b[0] * 0.5, b[1] * 0.7, b[2] * 0.5];
        s.bar(a, mid, 0.041, '#709889', m);
        s.bar(mid, b, 0.031, '#92b2a0', m);
        for (let p = 0; p < 4; p++) {
          const theta = (p * Math.PI) / 2;
          s.add(
            new THREE.OctahedronGeometry(0.13),
            i % 2 ? '#d7a18e' : '#ecd7b5',
            [b[0] + Math.cos(theta) * 0.06, b[1], b[2] + Math.sin(theta) * 0.06],
            [Math.sin(theta) * 0.45, 0, Math.cos(theta) * 0.45],
            [0.7, 1.65, 0.6],
            m,
          );
        }
        s.ico(0.04, cream, [b[0], b[1] + 0.11, b[2]], [1, 1, 1], m);
      });
      [-32, 0, 30].forEach((lon, i) => {
        const t = surface(lon, 8);
        s.cylinder(0.13, 0.16, 0.07, '#739c8b', [0, 0.035, 0], t, 6);
        s.ico(0.13, i % 2 ? coral : cream, [0, 0.1, 0], [1, 0.7, 1], t, 0);
      });
      break;
    }
    case 'engineered': {
      const shell = new THREE.IcosahedronGeometry(1.08, 1),
        p = shell.attributes.position;
      for (let i = 0; i < p.count; i += 3) {
        if ((i / 3) % 7 === 2) continue;
        const v = [0, 1, 2].map((j) => new THREE.Vector3().fromBufferAttribute(p, i + j));
        const c = v[0]
            .clone()
            .add(v[1])
            .add(v[2])
            .multiplyScalar(1 / 3),
          n = c.clone().normalize();
        const positions: number[] = [];
        v.forEach((point) =>
          positions.push(
            ...point.clone().sub(c).multiplyScalar(0.88).add(c).addScaledVector(n, 0.016).toArray(),
          ),
        );
        const face = new THREE.BufferGeometry();
        face.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        s.add(face, (i / 3) % 4 === 0 ? '#c9bbd2' : (i / 3) % 4 === 1 ? '#e9e0cd' : '#b7afc3');
        for (let edge = 0; edge < 3; edge++) {
          const a = v[edge].clone().sub(c).multiplyScalar(0.88).add(c),
            b = v[(edge + 1) % 3].clone().sub(c).multiplyScalar(0.88).add(c);
          s.bar(a.toArray() as Vec, b.toArray() as Vec, 0.009, gold);
        }
      }
      shell.dispose();
      s.add(new THREE.TorusGeometry(1.23, 0.021, 4, 48), gold, [0, 0, 0], [1.15, 0.1, -0.4]);
      s.ico(0.105, cream, [0.88, 0.98, -0.02], [1, 1.5, 1]);
      break;
    }
    case 'reclaimed': {
      const m = surface(-12, 42);
      arch(s, 0.5, 0.11, '#d5c19d', m, true);
      s.box([0.18, 0.34, 0.18], '#b7a386', [-0.5, 0.1, 0], m, [0, 0, -0.12]);
      s.box([0.18, 0.22, 0.18], '#b7a386', [0.5, 0.05, 0], m, [0, 0, 0.14]);
      [
        [-26, 15],
        [15, 20],
        [37, 31],
        [-38, 37],
        [-20, 55],
      ].forEach(([lon, lat], i) => tree(s, lon, lat, 0.27 + i * 0.014, 1.035, '#7e985e'));
      const ruin = surface(24, 5);
      for (let i = 0; i < 3; i++)
        s.cylinder(0.048, 0.057, 0.21 + i * 0.025, '#d3bea0', [(i - 1) * 0.15, 0.11, 0], ruin, 6);
      s.box([0.48, 0.07, 0.11], '#bbaa8b', [0, 0.26, 0], ruin, [0, 0, -0.12]);
      break;
    }
    case 'fractured': {
      [-34, -20, 24, 37].forEach((lon, i) => {
        const m = surface(lon, 35 + (i % 2) * 13);
        s.box([0.17, 0.32 + i * 0.04, 0.16], i % 2 ? '#b29a8f' : '#806f72', [0, 0.12, 0], m, [
          0,
          0,
          i % 2 ? 0.2 : -0.16,
        ]);
        s.box([0.2, 0.055, 0.19], '#d5b5a0', [0.025, 0.31 + i * 0.04, 0], m, [0, 0, -0.18]);
      });
      s.ico(0.16, '#a8847a', [0.08, 1.25, 0], [0.55, 1.2, 0.7]);
      s.ico(0.08, '#d1af9b', [-0.1, 1.42, -0.04], [1, 0.7, 0.6]);
      const m = surface(-30, -18);
      arch(s, 0.23, 0.065, '#9a8078', m, true);
      break;
    }
    case 'machine-swarm':
      // Earth stays quiet; machine construction belongs to the separate solar-system portrait.
      break;
    case 'duality': {
      const habitat = new THREE.Matrix4().compose(
        new THREE.Vector3(-0.48, 1.03, 0.12),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, -0.3, -0.25)),
        new THREE.Vector3(0.95, 0.95, 0.95),
      );
      orbitalHabitat(s, habitat, 1);
      tree(s, -35, 44, 0.21, 0.81);
      tree(s, -16, 56, 0.23, 0.81);
      break;
    }
  }
  const cloudSites = [
    [-37, -8, 0.15],
    [35, 28, 0.16],
    [-35, 68, 0.14],
    [18, -44, 0.17],
    [67, -9, 0.14],
    [-72, 31, 0.13],
    [5, 57, 0.12],
  ];
  cloudSites
    .slice(0, art.cloud)
    .forEach(([lon, lat, size]) => cloud(s, lon, lat, size * globeScale, globeScale * 1.17));
  addWorldDetails(s, art, globeScale, mobile);
  return s.finish();
}

export function WorldStructures({
  art,
  globeScale,
  mobile,
}: {
  art: WorldArt;
  globeScale: number;
  mobile: boolean;
}) {
  const geometry = useMemo(
    () => buildWorldGeometry(art, globeScale, mobile),
    [art, globeScale, mobile],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        flatShading
        roughness={0.9}
        metalness={0.02}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
