'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Sculpture } from './sculpture';
import { aircraft, satellite } from './WorldBiomes';
import type { WorldArt } from './worlds';

function activityGeometry(form: WorldArt['form']) {
  const s = new Sculpture();
  if (['wilderness', 'reclaimed'].includes(form)) {
    s.ico(0.04, '#edeacb', [0, 0, 0], [0.7, 0.7, 1.5]);
    for (const side of [-1, 1])
      s.add(
        new THREE.ConeGeometry(0.07, 0.19, 3),
        '#e9dfbd',
        [side * 0.075, 0.012, 0],
        [0, 0, side * 1.23],
        [0.5, 1, 0.27],
      );
  } else if (form === 'symbiosis') {
    s.ico(0.045, '#d6d9a1', [0, 0, 0], [1, 1.7, 1]);
    for (const side of [-1, 1]) s.ico(0.065, '#99d4c5', [side * 0.07, 0, 0], [1, 0.2, 1.4]);
  } else if (form === 'ecumenopolis') {
    s.ico(0.085, '#d4c1a0', [0, 0, 0], [1, 0.48, 1.3], undefined, 1);
    s.ico(0.048, '#476a79', [0, -0.02, -0.075], [1, 0.8, 0.3]);
    s.ico(0.015, '#e7ac78', [0, -0.019, -0.09], [1, 1, 0.3]);
    for (const side of [-1, 1]) {
      s.bar([0, 0, 0], [side * 0.14, 0, 0], 0.011, '#a1b2b4');
      s.add(
        new THREE.TorusGeometry(0.064, 0.009, 4, 10),
        '#72919b',
        [side * 0.14, 0, 0],
        [Math.PI / 2, 0, 0],
      );
    }
  } else if (form === 'extraction') {
    s.box([0.1, 0.09, 0.23], '#bc8655', [0, 0, 0]);
    s.box([0.082, 0.044, 0.09], '#557d8b', [0, 0.034, -0.075]);
    for (const side of [-1, 1]) {
      s.bar([0, 0, 0], [side * 0.13, 0.02, 0], 0.017, '#dcc38b');
      s.add(new THREE.CylinderGeometry(0.065, 0.045, 0.075, 8, 1, true), '#d6bf90', [
        side * 0.13,
        0.025,
        0,
      ]);
      s.box([0.058, 0.07, 0.13], '#8b6f55', [side * 0.07, -0.063, 0.035]);
    }
  } else if (form === 'arcadia') {
    s.ico(0.12, '#dfdcc0', [0, 0, 0], [0.54, 0.35, 1.5], undefined, 1);
    for (const side of [-1, 1])
      s.add(
        new THREE.OctahedronGeometry(0.13),
        '#8cb9ae',
        [side * 0.1, 0, 0.015],
        [0, side * 0.55, 0],
        [1.1, 0.07, 0.75],
      );
    s.ico(0.055, '#537f91', [0, 0.028, -0.035], [0.8, 0.35, 1.4]);
  } else if (form === 'machine-swarm') {
    s.add(new THREE.OctahedronGeometry(0.07), '#bfd0c9', [0, 0, 0], [0, 0.3, 0], [0.55, 0.6, 1.6]);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      s.add(
        new THREE.OctahedronGeometry(0.085),
        i % 2 ? '#658da5' : '#ddc999',
        [Math.cos(a) * 0.085, Math.sin(a) * 0.085, 0.04],
        [0, 0, a],
        [0.2, 0.5, 1.6],
      );
    }
  } else if (['engineered', 'duality'].includes(form)) satellite(s, '#dfc993');
  else aircraft(s, '#c86273');
  return s.finish();
}

/** Small story-appropriate moving subjects give scale without changing the scenario data. */
export function WorldActivity({
  art,
  reduced,
  mobile,
  globeScale,
}: {
  art: WorldArt;
  reduced: boolean;
  mobile: boolean;
  globeScale: number;
}) {
  const root = useRef<THREE.Group>(null),
    vehicles = useRef<(THREE.Group | null)[]>([]),
    time = useRef(0);
  const geometry = useMemo(() => activityGeometry(art.form), [art.form]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const count =
    art.form === 'fractured'
      ? 0
      : art.form === 'origin'
        ? 1
        : ['machine-swarm', 'wilderness', 'symbiosis'].includes(art.form)
          ? mobile
            ? 2
            : 3
          : 1;
  useFrame((_, delta) => {
    let parent: THREE.Object3D | null | undefined = root.current;
    while (parent) {
      if (!parent.visible) return;
      parent = parent.parent;
    }
    if (!reduced) time.current += Math.min(delta, 0.05);
    const t = reduced ? 0 : time.current;
    vehicles.current.forEach((group, i) => {
      if (!group) return;
      const a = 1.15 + i * 2.15 + t * (art.form === 'machine-swarm' ? 0.105 : 0.085);
      const r = ['machine-swarm', 'engineered'].includes(art.form) ? 1.31 : globeScale * 1.29;
      group.position.set(Math.cos(a) * r, Math.sin(t * 1.2 + i) * 0.012, Math.sin(a) * r);
      group.rotation.set(0, Math.PI - a, Math.sin(t * 0.8 + i) * 0.12);
    });
  });
  return (
    <group ref={root} rotation={[0.38, 0.2, -0.6]}>
      {Array.from({ length: count }, (_, i) => (
        <group
          key={i}
          ref={(node) => {
            vehicles.current[i] = node;
          }}
          scale={
            art.form === 'origin' ? 0.92 : globeScale * (art.form === 'ecumenopolis' ? 0.8 : 0.72)
          }
        >
          <mesh geometry={geometry}>
            <meshStandardMaterial
              vertexColors
              flatShading
              roughness={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
