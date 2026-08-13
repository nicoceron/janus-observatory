'use client';

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import gsap from 'gsap';
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  LinearFilter,
  Quaternion,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Mesh,
  type Points,
} from 'three';
import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { allScenarioProfiles, getScenarioProfile, type ScenarioProfile } from '../../lib/canonical';
import type { StoryVisualState } from './story-content';
import { worldArtProfiles, type WorldArtProfile } from './world-art';

type EarthStageProps = {
  state: StoryVisualState;
  reducedMotion: boolean;
  className?: string;
};

type Point3 = [number, number, number];

const futurePositions: Point3[] = [
  [-4.25, 0.78, -0.2],
  [-3.45, -0.05, 0],
  [-2.55, -0.8, 0.15],
  [-1.55, -1.42, 0.28],
  [-0.5, -1.78, 0.4],
  [0.55, -1.78, 0.35],
  [1.6, -1.42, 0.22],
  [2.58, -0.8, 0.05],
  [3.48, -0.05, -0.12],
  [4.25, 0.78, -0.28],
];
const branchOrigin: Point3 = [0, 2.35, 0];

function branchTarget(index: number, branchState: StoryVisualState['branchState']): Point3 {
  const base = futurePositions[index];
  if (branchState !== 'budding') return base;
  return [
    branchOrigin[0] + (base[0] - branchOrigin[0]) * 0.58,
    branchOrigin[1] + (base[1] - branchOrigin[1]) * 0.58,
    base[2] * 0.58,
  ];
}

class CanvasGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function seededPositions(count: number, spread: number, seed: number) {
  let value = seed;
  const random = () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (random() - 0.5) * spread;
    positions[index * 3 + 1] = (random() - 0.5) * spread;
    positions[index * 3 + 2] = (random() - 0.5) * spread;
  }
  return positions;
}

function Stars({ reducedMotion }: { reducedMotion: boolean }) {
  const positions = useMemo(() => seededPositions(820, 34, 3026), []);
  const ref = useRef<Points>(null);
  useFrame((_, delta) => {
    if (!reducedMotion && ref.current) ref.current.rotation.y += delta * 0.003;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#d9f0e4" opacity={0.64} size={0.025} transparent />
    </points>
  );
}

function createLightTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,239,170,1)');
    gradient.addColorStop(0.2, 'rgba(255,184,82,.9)');
    gradient.addColorStop(1, 'rgba(255,120,32,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
  }
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  return texture;
}

function CityLights({ intensity, color }: { intensity: number; color: string }) {
  const positions = useMemo(() => {
    const count = Math.max(0, Math.min(72, Math.round(intensity)));
    const points = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const theta = index * 2.399963;
      const y = 1 - (index / Math.max(count - 1, 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      points[index * 3] = Math.cos(theta) * radius * 1.014;
      points[index * 3 + 1] = y * 1.014;
      points[index * 3 + 2] = Math.sin(theta) * radius * 1.014;
    }
    return points;
  }, [intensity]);
  const texture = useMemo(() => createLightTexture(), []);
  if (positions.length === 0) return null;
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        alphaMap={texture}
        blending={AdditiveBlending}
        color={color}
        depthWrite={false}
        opacity={0.88}
        size={0.072}
        transparent
      />
    </points>
  );
}

const surfaceSeeds = [
  [-0.72, -2.4, 0.12],
  [-0.48, 0.65, 0.16],
  [-0.18, -0.9, 0.11],
  [0.12, 2.45, 0.14],
  [0.36, -2.9, 0.18],
  [0.58, 1.34, 0.12],
  [0.74, -0.18, 0.1],
] as const;

function sphericalPoint(latitude: number, longitude: number, radius = 1.02): Point3 {
  const latitudeRadius = Math.cos(latitude) * radius;
  return [
    Math.cos(longitude) * latitudeRadius,
    Math.sin(latitude) * radius,
    Math.sin(longitude) * latitudeRadius,
  ];
}

function SurfaceMarker({
  latitude,
  longitude,
  size,
  color,
  shape = 'panel',
}: {
  latitude: number;
  longitude: number;
  size: number;
  color: string;
  shape?: 'panel' | 'canopy' | 'node' | 'scar';
}) {
  const { position, quaternion } = useMemo(() => {
    const point = new Vector3(...sphericalPoint(latitude, longitude));
    return {
      position: point,
      quaternion: new Quaternion().setFromUnitVectors(
        new Vector3(0, 0, 1),
        point.clone().normalize(),
      ),
    };
  }, [latitude, longitude]);
  return (
    <mesh
      position={position}
      quaternion={quaternion}
      scale={shape === 'canopy' ? [1.45, 0.92, 0.34] : [1, 1, 1]}
    >
      {shape === 'canopy' ? (
        <icosahedronGeometry args={[size, 1]} />
      ) : shape === 'node' ? (
        <sphereGeometry args={[size, 12, 12]} />
      ) : shape === 'scar' ? (
        <boxGeometry args={[size * 1.8, size * 0.22, size * 0.13]} />
      ) : (
        <boxGeometry args={[size * 1.5, size, size * 0.13]} />
      )}
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={shape === 'node' ? 0.9 : shape === 'canopy' ? 0.035 : 0.28}
        metalness={shape === 'panel' ? 0.45 : 0.02}
        roughness={shape === 'canopy' ? 1 : 0.38}
      />
    </mesh>
  );
}

function SurfaceInterventions({ art, accent }: { art: WorldArtProfile; accent: string }) {
  if (art.surface === 'command-grid') {
    return (
      <group>
        {[-0.56, 0, 0.56].map((latitude) => (
          <mesh
            key={latitude}
            position={[0, Math.sin(latitude) * 1.018, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={Math.cos(latitude)}
          >
            <torusGeometry args={[1.018, 0.012, 5, 80]} />
            <meshBasicMaterial color={art.secondary} opacity={0.78} transparent />
          </mesh>
        ))}
        {[0, Math.PI / 3, (Math.PI * 2) / 3].map((rotation) => (
          <mesh key={rotation} rotation={[0, rotation, 0]}>
            <torusGeometry args={[1.018, 0.01, 5, 80]} />
            <meshBasicMaterial color={accent} opacity={0.7} transparent />
          </mesh>
        ))}
      </group>
    );
  }

  if (art.surface === 'civic-rings') {
    return (
      <group>
        {surfaceSeeds.slice(0, 5).map(([latitude, longitude, size], index) => (
          <group key={longitude}>
            <SurfaceMarker
              color={index % 2 === 0 ? art.secondary : accent}
              latitude={latitude}
              longitude={longitude}
              shape="node"
              size={size * 0.38}
            />
            <mesh
              position={sphericalPoint(latitude, longitude, 1.035)}
              rotation={[latitude, longitude, 0]}
              scale={size * 0.7}
            >
              <torusGeometry args={[0.42, 0.025, 6, 34]} />
              <meshBasicMaterial color={art.secondary} opacity={0.76} transparent />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (art.surface === 'neural') {
    const nodes = surfaceSeeds.map(([latitude, longitude]) =>
      sphericalPoint(latitude, longitude, 1.035),
    );
    return (
      <group>
        {surfaceSeeds.map(([latitude, longitude, size], index) => (
          <SurfaceMarker
            color={index % 2 === 0 ? art.secondary : accent}
            key={longitude}
            latitude={latitude}
            longitude={longitude}
            shape="node"
            size={size * 0.34}
          />
        ))}
        {nodes.slice(1).map((node, index) => (
          <Limb
            color={index % 2 === 0 ? art.secondary : accent}
            emissive={accent}
            end={node}
            key={index}
            opacity={0.72}
            radius={0.008}
            start={nodes[index]}
          />
        ))}
      </group>
    );
  }

  if (art.surface === 'cycle-scars') {
    return (
      <group>
        {[0.15, 1.15, 2.25, 3.35].map((rotation, index) => (
          <mesh key={rotation} rotation={[0.5 + index * 0.27, rotation, index * 0.4]}>
            <torusGeometry args={[1.025, 0.025 + index * 0.004, 5, 38, 1.32 + index * 0.18]} />
            <meshBasicMaterial color={index % 2 === 0 ? art.secondary : accent} />
          </mesh>
        ))}
      </group>
    );
  }

  if (art.surface === 'machine-shell') {
    return (
      <group>
        <mesh scale={1.045} rotation={[0.2, 0.4, 0]}>
          <icosahedronGeometry args={[1, 2]} />
          <meshBasicMaterial color={art.secondary} opacity={0.48} transparent wireframe />
        </mesh>
        {surfaceSeeds.map(([latitude, longitude, size], index) => (
          <SurfaceMarker
            color={index % 2 === 0 ? '#ffffff' : accent}
            key={longitude}
            latitude={latitude}
            longitude={longitude}
            shape="panel"
            size={size * 0.72}
          />
        ))}
      </group>
    );
  }

  const language = art.surface;
  return (
    <group>
      {surfaceSeeds
        .slice(0, language === 'exodus' ? 4 : 7)
        .map(([latitude, longitude, size], index) => {
          const shape =
            language === 'rewilded' || language === 'restoration'
              ? 'canopy'
              : language === 'fractured'
                ? 'scar'
                : 'panel';
          const multiplier =
            language === 'rewilded'
              ? 0.78
              : language === 'restoration'
                ? 0.68
                : language === 'fractured'
                  ? 1.18
                  : 0.86;
          const color =
            language === 'rewilded'
              ? index % 2 === 0
                ? '#4e8548'
                : '#2d6040'
              : language === 'restoration'
                ? index % 2 === 0
                  ? '#73bda0'
                  : '#4c8f91'
                : index % 2 === 0
                  ? art.secondary
                  : accent;
          return (
            <SurfaceMarker
              color={color}
              key={longitude}
              latitude={latitude + (language === 'patchwork' ? index * 0.035 : 0)}
              longitude={longitude}
              shape={shape}
              size={size * multiplier}
            />
          );
        })}
    </group>
  );
}

function OrbitalArchitecture({
  art,
  accent,
  activity,
}: {
  art: WorldArtProfile;
  accent: string;
  activity: number;
}) {
  const objects = Math.min(16, Math.max(4, activity + 4));
  const orbitNodes = Array.from({ length: objects }, (_, index) => {
    const angle = (Math.PI * 2 * index) / objects;
    const irregularity = art.orbit === 'debris' || art.orbit === 'fragments' ? 0.18 : 0;
    const radius = 1.3 + (index % 3) * 0.12 + Math.sin(index * 3.7) * irregularity;
    return [
      Math.cos(angle) * radius,
      Math.sin(angle * 1.7) * (0.24 + irregularity),
      Math.sin(angle) * radius,
    ] as Point3;
  });

  if (art.orbit === 'quiet') {
    return (
      <mesh rotation={[1.22, 0.25, -0.2]}>
        <torusGeometry args={[1.28, 0.009, 5, 48, 2.25]} />
        <meshBasicMaterial color={accent} opacity={0.36} transparent />
      </mesh>
    );
  }

  if (art.orbit === 'neural-shell' || art.orbit === 'machine-swarm') {
    return (
      <group>
        <mesh scale={art.orbit === 'machine-swarm' ? 1.56 : 1.38} rotation={[0.2, 0.35, 0.1]}>
          <icosahedronGeometry args={[1, art.orbit === 'machine-swarm' ? 2 : 1]} />
          <meshBasicMaterial
            color={art.orbit === 'machine-swarm' ? art.secondary : accent}
            opacity={art.orbit === 'machine-swarm' ? 0.28 : 0.2}
            transparent
            wireframe
          />
        </mesh>
        {orbitNodes.map((position, index) => (
          <mesh key={index} position={position} scale={index % 3 === 0 ? 0.065 : 0.035}>
            {art.orbit === 'machine-swarm' && index % 2 === 0 ? (
              <boxGeometry />
            ) : (
              <octahedronGeometry />
            )}
            <meshBasicMaterial color={index % 3 === 0 ? art.secondary : accent} />
          </mesh>
        ))}
      </group>
    );
  }

  if (art.orbit === 'outbound') {
    return (
      <group>
        {[0, 0.62, 1.18].map((rotation, index) => (
          <mesh key={rotation} rotation={[1.1, rotation, -0.22 + index * 0.28]}>
            <torusGeometry args={[1.32 + index * 0.22, 0.012, 5, 60, 2.5 + index * 0.35]} />
            <meshBasicMaterial
              color={index === 0 ? art.secondary : accent}
              opacity={0.68}
              transparent
            />
          </mesh>
        ))}
        {orbitNodes.slice(0, 7).map((position, index) => (
          <mesh
            key={index}
            position={[position[0] + index * 0.17, position[1] + index * 0.08, position[2]]}
            rotation={[0, 0, -Math.PI / 2]}
            scale={0.065 + index * 0.008}
          >
            <coneGeometry args={[0.55, 1.4, 6]} />
            <meshBasicMaterial color={index % 2 ? accent : art.secondary} />
          </mesh>
        ))}
      </group>
    );
  }

  const broken = art.orbit === 'fragments' || art.orbit === 'broken-cycle';
  const clean = art.orbit === 'civic' || art.orbit === 'seed-arc';
  const rings = clean ? 1 : art.orbit === 'surveillance' ? 3 : 2;
  return (
    <group>
      {Array.from({ length: rings }).map((_, index) => (
        <mesh key={index} rotation={[1.08 + index * 0.34, index * 0.5, index * 0.23]}>
          <torusGeometry
            args={[1.28 + index * 0.17, 0.01 + index * 0.003, 5, 72, broken ? 3.85 : Math.PI * 2]}
          />
          <meshBasicMaterial
            color={index === 0 ? art.secondary : accent}
            opacity={clean ? 0.48 : 0.64}
            transparent
          />
        </mesh>
      ))}
      {orbitNodes.slice(0, art.orbit === 'seed-arc' ? 4 : objects).map((position, index) => (
        <mesh
          key={index}
          position={position}
          rotation={[index * 0.4, index, 0]}
          scale={
            art.orbit === 'debris' || art.orbit === 'fragments'
              ? 0.025 + (index % 4) * 0.017
              : 0.034 + (index % 2) * 0.012
          }
        >
          {art.orbit === 'surveillance' ? (
            <boxGeometry args={[1.7, 0.6, 0.6]} />
          ) : art.orbit === 'seed-arc' ? (
            <dodecahedronGeometry />
          ) : (
            <tetrahedronGeometry />
          )}
          <meshBasicMaterial color={index % 3 === 0 ? art.secondary : accent} />
        </mesh>
      ))}
    </group>
  );
}

function WorldPlanet({
  profile,
  reducedMotion,
  present = false,
  showLights = true,
}: {
  profile?: ScenarioProfile;
  reducedMotion: boolean;
  present?: boolean;
  showLights?: boolean;
}) {
  const sourceTexture = useLoader(TextureLoader, '/assets/planets/earth-day-1440.webp');
  const texture = useMemo(() => {
    const configuredTexture = sourceTexture.clone();
    configuredTexture.colorSpace = SRGBColorSpace;
    configuredTexture.needsUpdate = true;
    return configuredTexture;
  }, [sourceTexture]);
  const planet = useRef<Mesh>(null);
  const orbit = useRef<Group>(null);
  const art = profile ? worldArtProfiles[profile.id] : undefined;
  const illumination = profile?.planetary.find(
    ({ body, signatureId }) => body === 'Earth' && signatureId === 'artificial_illumination',
  )?.value;
  const pollution = profile?.planetary.find(
    ({ body, signatureId }) => body === 'Earth' && signatureId === 'industrial_pollution',
  )?.value;
  const lights =
    illumination === null || illumination === undefined
      ? present
        ? 26
        : 0
      : Math.max(0, Math.min(72, 8 + Math.log10(Math.max(illumination, 0.0001)) * 18));
  const atmosphereColor =
    pollution && pollution > 1 ? '#df8b66' : (art?.atmosphere ?? profile?.accent ?? '#76c9ff');

  useFrame((_, delta) => {
    if (reducedMotion) return;
    if (planet.current) planet.current.rotation.y += delta * (present ? 0.028 : 0.045);
    if (orbit.current) orbit.current.rotation.y -= delta * 0.05;
  });

  return (
    <group>
      <mesh ref={planet} rotation={art?.rotation ?? [0.08, -0.6, -0.16]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial
          color={art?.surfaceTint ?? '#ffffff'}
          map={texture}
          metalness={art?.metalness ?? 0.03}
          roughness={art?.roughness ?? 0.82}
        />
        {showLights && <CityLights color={profile?.accent ?? '#ffd98a'} intensity={lights} />}
        {art && <SurfaceInterventions accent={profile?.accent ?? art.secondary} art={art} />}
      </mesh>
      <mesh scale={1.035}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#d4f3ff" opacity={0.05} transparent wireframe />
      </mesh>
      <mesh scale={1.08}>
        <sphereGeometry args={[1, 40, 40]} />
        <meshBasicMaterial
          blending={AdditiveBlending}
          color={atmosphereColor}
          opacity={pollution && pollution > 1 ? 0.15 : (art?.atmosphereOpacity ?? 0.08)}
          side={BackSide}
          transparent
        />
      </mesh>
      <group ref={orbit}>
        {art && (
          <OrbitalArchitecture
            accent={profile?.accent ?? '#b8f15c'}
            activity={profile?.system.length ?? 0}
            art={art}
          />
        )}
      </group>
    </group>
  );
}

function Limb({
  start,
  end,
  radius,
  color,
  emissive,
  opacity = 1,
}: {
  start: Point3;
  end: Point3;
  radius: number;
  color: string;
  emissive?: string;
  opacity?: number;
}) {
  const { midpoint, length, quaternion } = useMemo(() => {
    const from = new Vector3(...start);
    const to = new Vector3(...end);
    const direction = to.clone().sub(from);
    return {
      midpoint: from.clone().add(to).multiplyScalar(0.5),
      length: direction.length(),
      quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()),
    };
  }, [end, start]);
  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[radius * 0.72, radius, length, 10]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissive ? 0.55 : 0}
        opacity={opacity}
        roughness={0.55}
        transparent={opacity < 1}
      />
    </mesh>
  );
}

function InstrumentAdapter({ state }: { state: StoryVisualState }) {
  const accent = state.scenarioId ? getScenarioProfile(state.scenarioId).accent : '#b8f15c';
  switch (state.instrument) {
    case 'radio':
      return (
        <group position={[1.76, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[0.36, 28, 14, 0, Math.PI * 2, 0, Math.PI / 3]} />
            <meshStandardMaterial
              color="#cbd7d0"
              metalness={0.55}
              roughness={0.28}
              side={BackSide}
            />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshBasicMaterial color={accent} />
          </mesh>
        </group>
      );
    case 'large_interferometer_for_exoplanets':
      return (
        <group position={[1.72, 0, 0]}>
          {[
            [0, 0.34, 0],
            [0, -0.34, 0],
            [0, 0, 0.34],
            [0, 0, -0.34],
          ].map((position, index) => (
            <mesh key={index} position={position as Point3} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.13, 0.13, 0.16, 18]} />
              <meshStandardMaterial
                color={index === 0 ? accent : '#8c9993'}
                metalness={0.7}
                roughness={0.25}
              />
            </mesh>
          ))}
        </group>
      );
    case 'solar_gravitational_lens':
      return (
        <group position={[1.84, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          {[0, 1, 2].map((index) => (
            <mesh key={index} scale={1 + index * 0.22}>
              <torusGeometry args={[0.35, 0.016, 8, 72]} />
              <meshBasicMaterial
                color={index === 0 ? '#fff3b0' : accent}
                opacity={0.8}
                transparent
              />
            </mesh>
          ))}
        </group>
      );
    case 'deep_space_probes':
      return (
        <group position={[1.75, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.28, 0.3, 0.3]} />
            <meshStandardMaterial color="#7d8d85" metalness={0.72} roughness={0.3} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[0, side * 0.38, 0]}>
              <boxGeometry args={[0.05, 0.48, 0.28]} />
              <meshStandardMaterial color="#315e77" metalness={0.35} roughness={0.55} />
            </mesh>
          ))}
        </group>
      );
    case 'habitable_worlds_observatory':
    default:
      return (
        <group position={[1.76, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          {[
            [0, 0],
            [-0.2, 0],
            [0.2, 0],
            [-0.1, 0.17],
            [0.1, 0.17],
            [-0.1, -0.17],
            [0.1, -0.17],
          ].map(([x, z], index) => (
            <mesh key={index} position={[x, 0, z]}>
              <cylinderGeometry args={[0.11, 0.11, 0.028, 6]} />
              <meshStandardMaterial color="#d8b66c" metalness={0.82} roughness={0.2} />
            </mesh>
          ))}
        </group>
      );
  }
}

function AlienObserverAsset({ state }: { state: StoryVisualState }) {
  const { scene } = useGLTF('/assets/models/janus-alien-observer-v1.glb');
  const observerScene = useMemo(() => scene.clone(true), [scene]);
  return (
    <group position={[0.5, -0.8, 0.18]}>
      <primitive object={observerScene} />
      <group position={[0.28, 1.22, 0.02]} scale={0.52}>
        <InstrumentAdapter state={state} />
      </group>
    </group>
  );
}

function AlienAstronomer({ state }: { state: StoryVisualState }) {
  const accent = state.scenarioId ? getScenarioProfile(state.scenarioId).accent : '#b8f15c';
  return (
    <group>
      <mesh position={[0, -2.02, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 7]} />
        <meshStandardMaterial color="#111a17" metalness={0.1} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.7, -3]}>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#08100e" roughness={1} />
      </mesh>
      {[-3.8, 0, 3.8].map((x) => (
        <mesh key={x} position={[x, 0.2, -2.8]}>
          <torusGeometry args={[1.45, 0.055, 10, 64, Math.PI]} />
          <meshStandardMaterial color="#6a4a2f" emissive="#5d3218" emissiveIntensity={0.35} />
        </mesh>
      ))}

      <AlienObserverAsset state={state} />

      <group position={[3.45, 0.62, -1.12]} scale={0.39}>
        <WorldPlanet
          profile={state.scenarioId ? getScenarioProfile(state.scenarioId) : undefined}
          reducedMotion
          showLights={false}
        />
      </group>
      <Limb
        color={accent}
        emissive={accent}
        end={[3.32, 0.62, -1.05]}
        opacity={0.23}
        radius={0.014}
        start={[2.53, 0.42, 0.2]}
      />
    </group>
  );
}

useGLTF.preload('/assets/models/janus-alien-observer-v1.glb');

function SystemScene({ state, reducedMotion }: Pick<EarthStageProps, 'state' | 'reducedMotion'>) {
  const profile = state.scenarioId ? getScenarioProfile(state.scenarioId) : undefined;
  return (
    <group>
      <group scale={0.78}>
        <WorldPlanet profile={profile} reducedMotion={reducedMotion} />
      </group>
      <group position={[-3.4, 0.72, -1.3]}>
        <mesh>
          <sphereGeometry args={[0.28, 32, 32]} />
          <meshStandardMaterial color="#d8a66f" roughness={0.95} />
        </mesh>
      </group>
      <group position={[3.45, -0.75, -1.25]}>
        <mesh>
          <sphereGeometry args={[0.33, 32, 32]} />
          <meshStandardMaterial color="#9b503e" roughness={0.95} />
        </mesh>
      </group>
      {[1.8, 2.35, 2.95].map((radius, index) => (
        <mesh key={radius} rotation={[1.25 + index * 0.08, index * 0.3, 0]}>
          <torusGeometry args={[radius, 0.008, 6, 128]} />
          <meshBasicMaterial color={profile?.accent ?? '#b8f15c'} opacity={0.35} transparent />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig({ state, reducedMotion }: Pick<EarthStageProps, 'state' | 'reducedMotion'>) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const duration = reducedMotion ? 0 : 1.35;
    const portrait = size.width / size.height < 0.72;
    const position: Point3 = portrait
      ? state.kind === 'branches'
        ? [0, 0.2, 15.8]
        : state.kind === 'scenario'
          ? [0, 0.12, 12.8]
          : state.kind === 'observer'
            ? [0, 0.35, 14.2]
            : state.kind === 'ocular'
              ? [0, 0, 9.4]
              : state.kind === 'system'
                ? [0, 0, 12]
                : [0, 0, 10.4]
      : state.kind === 'branches'
        ? [0, 0.12, 10.2]
        : state.kind === 'scenario'
          ? [0, 0.08, 8.5]
          : state.kind === 'observer'
            ? [0, 0.12, 8.2]
            : state.kind === 'ocular'
              ? [0, 0, 6.6]
              : state.kind === 'system'
                ? [0, 0, 8.8]
                : [0, 0, 7.2];
    const tween = gsap.to(camera.position, {
      duration,
      ease: 'power3.inOut',
      x: position[0],
      y: position[1],
      z: position[2],
      onUpdate: () => camera.lookAt(0, 0, 0),
    });
    return () => {
      tween.kill();
    };
  }, [camera, reducedMotion, size.height, size.width, state.kind, state.scenarioId]);
  return null;
}

function Scene({ state, reducedMotion }: Pick<EarthStageProps, 'state' | 'reducedMotion'>) {
  const { size } = useThree();
  const portrait = size.width / size.height < 0.72;
  const present = useRef<Group>(null);
  const constellation = useRef<Group>(null);
  const branchConnectors = useRef<Group>(null);
  const origin = useRef<Group>(null);
  const observer = useRef<Group>(null);
  const ocular = useRef<Group>(null);
  const system = useRef<Group>(null);
  const worlds = useRef<Array<Group | null>>([]);

  useLayoutEffect(() => {
    const duration = reducedMotion ? 0 : 1.15;
    const ease = 'power3.inOut';
    const context = gsap.context(() => {
      if (origin.current) {
        const originScale =
          state.kind === 'branches' ? 0.64 : state.kind === 'scenario' ? 0.18 : 0.64;
        gsap.to(origin.current.scale, {
          duration,
          ease,
          x: originScale,
          y: originScale,
          z: originScale,
        });
        gsap.to(origin.current.position, {
          duration,
          ease,
          x: state.kind === 'scenario' ? 1.85 : branchOrigin[0],
          y: state.kind === 'scenario' ? 1.75 : branchOrigin[1],
          z: state.kind === 'scenario' ? -1.1 : branchOrigin[2],
        });
      }

      worlds.current.forEach((world, index) => {
        if (!world) return;
        const base = futurePositions[index];
        const active = allScenarioProfiles[index].id === state.scenarioId;
        const budding = state.kind === 'branches' && state.branchState === 'budding';
        const focused = state.kind === 'scenario';
        const target: Point3 = focused
          ? active
            ? [0.2, -0.05, 0.65]
            : [2.25 + base[0] * 0.26, 0.05 + base[1] * 0.5, -1.05]
          : branchTarget(index, state.branchState);
        const scale = focused
          ? active
            ? portrait
              ? 0.9
              : 1.28
            : portrait
              ? 0.18
              : 0.27
          : budding
            ? portrait
              ? 0.18
              : 0.34
            : portrait
              ? 0.26
              : 0.48;
        gsap.to(world.position, {
          duration,
          ease,
          x: target[0],
          y: target[1],
          z: target[2],
        });
        gsap.to(world.scale, { duration, ease, x: scale, y: scale, z: scale });
      });
    });
    return () => context.revert();
  }, [portrait, reducedMotion, state.branchState, state.kind, state.scenarioId]);

  return (
    <>
      <Stars reducedMotion={reducedMotion} />
      <CameraRig reducedMotion={reducedMotion} state={state} />

      <group
        position={portrait ? [0, 0.7, 0] : [0, 0, 0]}
        ref={present}
        scale={portrait ? 0.7 : 1}
        visible={state.kind === 'present'}
      >
        <group scale={1.52}>
          <WorldPlanet present reducedMotion={reducedMotion} />
        </group>
      </group>

      <group
        position={portrait ? [0, 1.05, 0] : state.kind === 'branches' ? [-1.3, 0.3, 0] : [0, 0, 0]}
        ref={constellation}
        scale={portrait ? 0.44 : state.kind === 'branches' ? 0.72 : 1}
        visible={state.kind === 'branches' || state.kind === 'scenario'}
      >
        <group ref={origin} position={branchOrigin} scale={0.64}>
          <WorldPlanet present reducedMotion={reducedMotion} showLights={false} />
        </group>
        <group ref={branchConnectors} visible={state.kind === 'branches'}>
          {allScenarioProfiles.map((profile, index) => (
            <Limb
              color={profile.accent}
              emissive={profile.accent}
              end={branchTarget(index, state.branchState)}
              key={profile.id}
              opacity={0.48}
              radius={0.018}
              start={branchOrigin}
            />
          ))}
        </group>
        {allScenarioProfiles.map((profile, index) => (
          <group
            key={profile.id}
            position={futurePositions[index]}
            ref={(element) => {
              worlds.current[index] = element;
            }}
            scale={0.48}
          >
            <WorldPlanet
              profile={profile}
              reducedMotion={reducedMotion}
              showLights={state.kind === 'scenario' && profile.id === state.scenarioId}
            />
          </group>
        ))}
      </group>

      <group
        position={portrait ? [0, 1.25, 0] : [0, 0, 0]}
        ref={observer}
        scale={portrait ? 0.68 : 1}
        visible={state.kind === 'observer'}
      >
        <AlienAstronomer state={state} />
      </group>

      <group
        position={portrait ? [0, 0.6, 0] : [0, 0, 0]}
        ref={ocular}
        scale={portrait ? 0.72 : 1}
        visible={state.kind === 'ocular'}
      >
        <group scale={1.62}>
          <WorldPlanet
            profile={state.scenarioId ? getScenarioProfile(state.scenarioId) : undefined}
            reducedMotion={reducedMotion}
          />
        </group>
        {state.instrument === 'solar_gravitational_lens' && (
          <group rotation={[0, 0.15, 0]}>
            {[2.05, 2.35, 2.72].map((radius, index) => (
              <mesh key={radius}>
                <torusGeometry args={[radius, 0.012, 8, 128]} />
                <meshBasicMaterial
                  color={index === 0 ? '#fff2b0' : '#a997ff'}
                  opacity={0.46}
                  transparent
                />
              </mesh>
            ))}
          </group>
        )}
      </group>

      <group
        position={portrait ? [0, 0.8, 0] : [0, 0, 0]}
        ref={system}
        scale={portrait ? 0.72 : 1}
        visible={state.kind === 'system'}
      >
        <SystemScene reducedMotion={reducedMotion} state={state} />
      </group>
    </>
  );
}

function CanvasReady({ onReady }: { onReady: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    if (gl.domElement) onReady();
  }, [gl, onReady]);
  return null;
}

export function EarthStage({ state, reducedMotion, className = '' }: EarthStageProps) {
  const profile = state.scenarioId ? getScenarioProfile(state.scenarioId) : undefined;
  const [webglReady, setWebglReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapper.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? true),
      { rootMargin: '160px' },
    );
    observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`earthStage ${webglReady ? 'earthStageWebglReady' : ''} ${className}`}
      data-scene-kind={state.kind}
      data-branch-state={state.branchState}
      ref={wrapper}
      style={{ '--scene-accent': profile?.accent ?? '#b8f15c' } as React.CSSProperties}
    >
      <div className="stageFallback" aria-hidden="true">
        <span className="fallbackEarth" />
        <span className="fallbackBranchOrigin" />
        <span className="fallbackBranches">
          {allScenarioProfiles.map((scenario, index) => (
            <i
              className="fallbackFutureWorld"
              data-world-art={worldArtProfiles[scenario.id].surface}
              key={scenario.id}
              style={
                {
                  '--fallback-index': index,
                  '--fallback-accent': scenario.accent,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
        <span className="fallbackAlien" />
        <span className="fallbackTelescope" />
        <span className="fallbackTargetEarth" />
        <span className="fallbackOcular" />
      </div>
      <CanvasGuard>
        <Canvas
          aria-hidden="true"
          camera={{ position: [0, 0, 7.2], fov: 42 }}
          className="earthCanvas"
          dpr={[1, 1.5]}
          frameloop={reducedMotion || !visible ? 'demand' : 'always'}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        >
          <ambientLight intensity={0.56} />
          <directionalLight intensity={3.2} position={[4, 2.5, 5]} />
          <directionalLight color="#8db8a4" intensity={1.2} position={[-4, 1, 2]} />
          <pointLight color={profile?.accent ?? '#b8f15c'} intensity={16} position={[-4, -2, 3]} />
          <pointLight color="#ffb15c" intensity={10} position={[2.5, 2, 1]} />
          <Suspense fallback={null}>
            <CanvasReady onReady={() => setWebglReady(true)} />
            <Scene reducedMotion={reducedMotion} state={state} />
          </Suspense>
        </Canvas>
      </CanvasGuard>
    </div>
  );
}
