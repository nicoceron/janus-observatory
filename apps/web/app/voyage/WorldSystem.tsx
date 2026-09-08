'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { buildCompanionGeometry, buildSystemFeatureGeometry } from './SystemGeometry';
import { smooth } from './scroll';
import type { SystemPortrait } from '../../lib/system-portrait';
import type { WorldArt } from './worlds';
import type { Vec } from './sculpture';

export type SystemLabels = RefObject<Record<string, HTMLDivElement | null>>;
export const systemNames = {
  Moon: 'Luna',
  Mars: 'Mars',
  Venus: 'Venus',
  asteroids: 'Asteroids',
  outer: 'Outer settlements',
  kuiper: 'Kuiper belt',
  solar: 'Solar collectors',
};
const labelHeight: Record<string, number> = {
  solar: 1.25,
  asteroids: -0.5,
  kuiper: -0.57,
  outer: -0.78,
};

export function WorldSystem({
  art,
  context,
  chapter,
  progress,
  labels,
  reduced,
  mobile,
}: {
  art: WorldArt;
  context: SystemPortrait;
  chapter: number;
  progress: RefObject<number>;
  labels: SystemLabels;
  reduced: boolean;
  mobile: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const time = useRef(0);
  const projected = useMemo(() => new THREE.Vector3(), []);
  const items = useMemo(() => {
    const machine = art.form === 'machine-swarm';
    const hasKuiper = context.features.includes('kuiper');
    const positions: Record<string, Vec> = {
      Moon: [
        art.form === 'fractured' ? -1.3 : hasKuiper ? -1.05 : -1.13,
        hasKuiper ? -0.98 : -0.76,
        0.42,
      ],
      Mars: [1.4, machine ? 0.05 : 0.57, 0.16],
      Venus: [machine ? 0.76 : 1.24, machine ? -1.04 : -0.72, 0.08],
      asteroids: [-1.25, 0.6, -0.24],
      outer: [-0.32, -1.22, -0.32],
      kuiper: [-1.46, -0.15, -0.3],
      solar: [0.76, 1.06, -0.25],
    };
    return [
      ...context.bodies.map((body) => ({
        key: body.body,
        geometry: buildCompanionGeometry(art, body, mobile),
        position: positions[body.body],
        scale:
          body.body === 'Mars'
            ? ['symbiosis', 'engineered'].includes(art.form)
              ? 0.4
              : 0.31
            : body.body === 'Moon'
              ? art.form === 'fractured'
                ? 0.34
                : 0.235
              : 0.28,
      })),
      ...context.features.map((feature) => ({
        key: feature,
        geometry: buildSystemFeatureGeometry(art, feature),
        position: positions[feature],
        scale: feature === 'solar' ? 0.43 : feature === 'outer' ? 0.25 : 0.24,
      })),
    ];
  }, [art, context, mobile]);
  useEffect(
    () => () => {
      items.forEach((item) => {
        item.geometry.dispose();
        const label = labels.current[art.id + ':' + item.key];
        if (label) label.style.opacity = '0';
      });
    },
    [items, art.id, labels],
  );
  useFrame(({ camera, size }, delta) => {
    if (!root.current) return;
    const amount = reduced
      ? Math.round(progress.current) === chapter
        ? 1
        : 0
      : smooth(1 - Math.abs(progress.current - chapter) / 0.84);
    root.current.visible = amount > 0.015;
    root.current.scale.setScalar(Math.max(0.001, amount));
    if (amount > 0.015 && !reduced) time.current += Math.min(delta, 0.05);
    items.forEach((item, index) => {
      const mesh = meshes.current[index];
      const label = labels.current[art.id + ':' + item.key];
      if (!mesh) return;
      mesh.rotation.y = reduced ? 0 : Math.sin(time.current * 0.18 + index) * 0.1;
      if (!label) return;
      const opacity = amount > 0.97 ? '1' : '0';
      if (label.style.opacity !== opacity) label.style.opacity = opacity;
      if (amount <= 0.97) return;
      mesh.updateWorldMatrix(true, false);
      projected
        .set(0, labelHeight[item.key] ?? -1.15, 0)
        .applyMatrix4(mesh.matrixWorld)
        .project(camera);
      const x = (projected.x * 0.5 + 0.5) * size.width;
      const y = (-projected.y * 0.5 + 0.5) * size.height;
      label.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) translate(-50%, ${item.key === 'solar' ? '-14px' : '7px'})`;
    });
  });
  return (
    <group ref={root} visible={false}>
      {items.map((item, index) => (
        <mesh
          key={item.key}
          geometry={item.geometry}
          position={item.position}
          scale={item.scale}
          ref={(node) => {
            meshes.current[index] = node;
          }}
        >
          <meshStandardMaterial vertexColors flatShading roughness={0.88} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
