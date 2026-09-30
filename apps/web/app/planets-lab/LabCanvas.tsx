'use client';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { WorldSignals } from '../../lib/world-signals';
import { buildCompanion, buildFeature, type Companion, type Feature } from '../planets/bodies';
import { buildWorld, worldIds } from '../planets/catalog';
import { ModelView } from '../planets/ModelView';
import { qualities, type WorldModel } from '../planets/model';

function Model({
  build,
  x,
  y,
  size,
}: {
  build: () => WorldModel;
  x: number;
  y: number;
  size: number;
}) {
  const model = useMemo(() => build(), [build]);
  return (
    <group position={[x, y, 0]} scale={size / model.extent}>
      <ModelView model={model} reduced={false} />
    </group>
  );
}

function Animate() {
  const { invalidate } = useThree();
  useEffect(() => {
    let frame = 0;
    const loop = () => {
      invalidate();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [invalidate]);
  return null;
}

type Item = { key: string; build: () => WorldModel };

export default function LabCanvas({ signals }: { signals: WorldSignals[] }) {
  // Rendered client-only, so the query is available on the first render.
  const [query] = useState(() => new URLSearchParams(location.search));
  const items = useMemo<Item[]>(() => {
    if (!query) return [];
    const bySignal = (id: string) => signals.find((s) => s.id === id)!;
    const world = query.get('world');
    const body = query.get('body');
    const system = query.get('system');
    if (world)
      return [{ key: world, build: () => buildWorld(world, bySignal(world), qualities.inspect) }];
    if (body) {
      const [scenario, name] = body.split(':');
      const companion = ['Moon', 'Mars', 'Venus'].includes(name);
      return [
        {
          key: body,
          build: () =>
            companion
              ? buildCompanion(name as Companion, scenario, bySignal(scenario), qualities.inspect)
              : buildFeature(name as Feature, scenario, qualities.inspect),
        },
      ];
    }
    if (system) {
      const s = bySignal(system);
      const list: Item[] = [{ key: system, build: () => buildWorld(system, s, qualities.story) }];
      for (const b of ['Moon', 'Mars', 'Venus'] as const)
        if (Object.values(s.bodies[b]).some((v) => v !== null && v > 0))
          list.push({ key: b, build: () => buildCompanion(b, system, s, qualities.compact) });
      const features: [string, Feature][] = [
        ['asteroid_mining', 'asteroids'],
        ['outer_planet_settlements', 'outer'],
        ['kuiper_belt_mining', 'kuiper'],
        ['dyson_sphere', 'solar'],
      ];
      for (const [signature, feature] of features)
        if (s.system.includes(signature))
          list.push({
            key: feature,
            build: () => buildFeature(feature, system, qualities.compact),
          });
      return list;
    }
    return signals
      .filter((s) => worldIds.includes(s.id))
      .map((s) => ({ key: s.id, build: () => buildWorld(s.id, s, qualities.story) }));
  }, [query, signals]);
  const single = items.length === 1;
  const columns = query?.get('system') ? 4 : 4;
  return (
    <Canvas
      camera={{ position: [0, 0, 11], fov: 43, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.setClearColor('#050709', 1);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <Animate />
      <ambientLight intensity={0.28} />
      <hemisphereLight args={['#d0f0ff', '#314669', 1.35]} />
      <directionalLight position={[-6, 7, 4]} intensity={2.3} color="#fff1d8" />
      <directionalLight position={[4, 2, -2]} intensity={2.0} color="#87dfef" />
      {single && <OrbitControls enablePan={false} />}
      {items.map((item, i) =>
        single ? (
          <Model key={item.key} build={item.build} x={0} y={0} size={4.2} />
        ) : (
          <Model
            key={item.key}
            build={item.build}
            x={((i % columns) - (columns - 1) / 2) * 3.3}
            y={(1 - Math.floor(i / columns)) * 3}
            size={i === 0 || !query?.get('system') ? 1.55 : 1.2}
          />
        ),
      )}
    </Canvas>
  );
}
