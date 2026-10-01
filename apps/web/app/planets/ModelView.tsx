import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useReducedMotionPreference } from '../components/MotionPreference';
import { atmosphereMaterial, createMaterials, surfaces } from './materials';
import type { Layer, WorldModel } from './model';
import { InstanceView, MoverView, type PropMaterials } from './Instances';

type Animated = { group: THREE.Group; layer: Layer; glow?: THREE.MeshBasicMaterial };

function visible(object: THREE.Object3D | null) {
  for (let node = object; node; node = node.parent) if (!node.visible) return false;
  return true;
}

/**
 * Renders a built world or body. Geometry belongs to the shared model cache; motion is advanced
 * only while a frame is being drawn, so an idle canvas stays idle.
 */
export function ModelView({
  model,
  reduced,
  sway = true,
  live = false,
  onSelect,
}: {
  model: WorldModel;
  reduced: boolean;
  /** Rock the globe gently so the story's key site stays in view. */
  sway?: boolean;
  /** Keep drawing frames so citizens, traffic and weather move while this world is in focus. */
  live?: boolean;
  onSelect?: (landmark: string) => void;
}) {
  const materials = useMemo(() => createMaterials(), []);
  const propMaterials = useMemo<PropMaterials>(
    () => ({
      base: materials.solid,
      tint: materials.solid,
      glass: materials.glass,
      metal: materials.sheen,
      glow: materials.glow,
    }),
    [materials],
  );
  const invalidate = useThree((state) => state.invalidate);
  const wake = useRef<number | null>(null);
  const pace = useRef(33);
  useEffect(
    () => () => {
      if (wake.current !== null) window.clearTimeout(wake.current);
    },
    [],
  );
  const atmosphere = useMemo(
    () => (model.atmosphere ? atmosphereMaterial(model.atmosphere) : null),
    [model.atmosphere],
  );
  const shell = useMemo(
    () => (model.atmosphere ? new THREE.IcosahedronGeometry(model.atmosphere.height, 3) : null),
    [model.atmosphere],
  );
  const pulses = useMemo(
    () =>
      new Map(
        model.layers
          .filter((layer) => layer.motion?.kind === 'pulse' && layer.glow)
          .map((layer) => [layer, (materials.glow as THREE.MeshBasicMaterial).clone()]),
      ),
    [model, materials],
  );
  useEffect(
    () => () => {
      for (const material of Object.values(materials)) material.dispose();
      for (const material of pulses.values()) material.dispose();
    },
    [materials, pulses],
  );
  useEffect(
    () => () => {
      atmosphere?.dispose();
      shell?.dispose();
    },
    [atmosphere, shell],
  );

  // The reader's motion setting holds every world at its rest pose, as does a paused caller.
  const still = useReducedMotionPreference() || reduced;
  const planet = useRef<THREE.Group>(null);
  const animated = useRef<Animated[]>([]);
  const clock = useRef(0);
  useFrame((_, delta) => {
    if (!visible(planet.current)) return;
    if (live && !still && !document.hidden && wake.current === null) {
      // Idle life runs at up to ~30 fps and backs off when frames run long, so a slow device
      // (or software WebGL) keeps the page responsive to scrolling and input.
      if (delta * 1000 > pace.current + 60) pace.current = Math.min(600, pace.current * 2);
      else pace.current = Math.max(33, pace.current * 0.85);
      wake.current = window.setTimeout(() => {
        wake.current = null;
        invalidate();
      }, pace.current);
    }
    if (!still) clock.current += Math.min(delta, 0.05);
    const t = still ? 0 : clock.current;
    if (planet.current && sway)
      planet.current.rotation.y =
        -THREE.MathUtils.degToRad(model.facing) + Math.sin(t * 0.16) * 0.22;
    for (const { group, layer, glow } of animated.current) {
      const motion = layer.motion!;
      if (motion.kind === 'spin') group.rotation.y = t * motion.speed;
      else if (motion.kind === 'sway')
        group.rotation.y = Math.sin((t / motion.period) * Math.PI * 2) * motion.amplitude;
      else if (glow) {
        const wave = 0.5 + 0.5 * Math.sin((t / motion.period + (motion.phase ?? 0)) * Math.PI * 2);
        glow.color.setScalar(motion.floor + (1 - motion.floor) * wave);
      }
    }
  });

  const register =
    (layer: Layer, glow?: THREE.MeshBasicMaterial) => (group: THREE.Group | null) => {
      animated.current = animated.current.filter((entry) => entry.layer !== layer);
      if (group && layer.motion) animated.current.push({ group, layer, glow });
    };
  const view = (layer: Layer) => (
    <group key={layer.name} matrixAutoUpdate={!layer.matrix} matrix={layer.matrix ?? undefined}>
      <group ref={register(layer, pulses.get(layer))}>
        {surfaces.map((surface) => {
          const geometry = layer[surface];
          if (!geometry) return null;
          const material =
            surface === 'glow' ? (pulses.get(layer) ?? materials.glow) : materials[surface];
          return (
            <mesh
              key={surface}
              geometry={geometry}
              material={material}
              renderOrder={surface === 'beam' ? 2 : surface === 'cloud' ? 1 : 0}
              onClick={
                onSelect && layer.landmark
                  ? (event: ThreeEvent<MouseEvent>) => {
                      event.stopPropagation();
                      onSelect(layer.landmark!);
                    }
                  : undefined
              }
            />
          );
        })}
      </group>
    </group>
  );

  return (
    <group rotation={[model.pitch, 0, model.tilt]}>
      <group ref={planet} rotation={[0, -THREE.MathUtils.degToRad(model.facing), 0]}>
        {model.layers.filter((layer) => layer.frame === 'surface').map(view)}
        {model.instances.map((group) => (
          <InstanceView key={group.kind} group={group} materials={propMaterials} />
        ))}
        {model.movers.map((group) => (
          <MoverView key={group.kind} group={group} materials={propMaterials} clock={clock} />
        ))}
      </group>
      {model.layers.filter((layer) => layer.frame === 'orbit').map(view)}
      {shell && atmosphere && <mesh geometry={shell} material={atmosphere} renderOrder={3} />}
    </group>
  );
}
