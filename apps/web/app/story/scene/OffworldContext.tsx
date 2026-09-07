'use client';

import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { SRGBColorSpace, TextureLoader, Vector3, type Group } from 'three';
import type { ContextBody } from '../offworld-context';

const maps: Record<ContextBody, string> = {
  Moon: '/assets/planets/moon-context-1024.webp',
  Mars: '/assets/planets/mars-context-1024.webp',
  Venus: '/assets/planets/venus-context-1024.webp',
};

function Body({
  body,
  index,
  count,
  portrait,
}: {
  body: ContextBody;
  index: number;
  count: number;
  portrait: boolean;
}) {
  const group = useRef<Group>(null);
  const source = useLoader(TextureLoader, maps[body]);
  const map = useMemo(() => {
    const texture = source.clone();
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, [source]);
  useEffect(() => () => map.dispose(), [map]);
  const { camera, gl } = useThree();
  const pointRef = useRef(new Vector3());
  useFrame(() => {
    const point = pointRef.current;
    const label = gl.domElement
      .closest('.earthStage')
      ?.querySelector<HTMLElement>(`[data-context-body="${body}"]`);
    if (!label || !group.current) return;
    group.current.getWorldPosition(point);
    point.y -= portrait ? 0.18 : 0.46;
    point.project(camera);
    label.style.left = `${point.x * 50 + 50}%`;
    label.style.top = `${50 - point.y * 50}%`;
  });
  return (
    <group
      ref={group}
      position={[
        (portrait ? 0 : -1.65) + (index - (count - 1) / 2) * (portrait ? 0.72 : 1.15),
        portrait ? 1.2 : -1.25,
        0,
      ]}
    >
      <mesh rotation={[0.1, body === 'Moon' ? 2.1 : -0.7, 0.06]}>
        <sphereGeometry args={[portrait ? 0.16 : 0.35, 40, 28]} />
        <meshStandardMaterial map={map} roughness={0.94} />
      </mesh>
    </group>
  );
}

export function OffworldContext({
  bodies,
  portrait,
}: {
  bodies: ContextBody[];
  portrait: boolean;
}) {
  return (
    <group>
      {bodies.map((body, index) => (
        <Body key={body} body={body} index={index} count={bodies.length} portrait={portrait} />
      ))}
    </group>
  );
}
