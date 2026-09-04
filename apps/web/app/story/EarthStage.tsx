'use client';

import { Canvas, useFrame, useLoader, useThree, type GLProps } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import gsap from 'gsap';
import Image from 'next/image';
import {
  AdditiveBlending,
  BackSide,
  CatmullRomCurve3,
  CubicBezierCurve3,
  LoopRepeat,
  MathUtils,
  Quaternion,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Mesh,
  type PerspectiveCamera,
  type Points,
  type Texture,
} from 'three';
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial, WebGPURenderer } from 'three/webgpu';
import {
  bumpMap,
  cameraPosition,
  color,
  max,
  mix,
  normalWorldGeometry,
  normalize,
  output,
  positionWorld,
  step,
  texture,
  uniform,
  uv,
  vec3,
  vec4,
} from 'three/tsl';
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  allScenarioProfiles,
  collapseDataset,
  getScenarioProfile,
  type ScenarioProfile,
} from '../../lib/canonical-core';
import { trackPublicInteraction } from '../../lib/telemetry';
import type { StoryVisualState } from './story-content';
import { worldArtProfiles, type WorldArtProfile } from './world-art';

type EarthStageProps = {
  state: StoryVisualState;
  reducedMotion: boolean;
  branchProgress?: number;
  observerProgress?: number;
  className?: string;
  onReady?: (mode: 'fallback' | 'poster' | 'spatial') => void;
  onRecoveryChange?: (active: boolean) => void;
};

type Point3 = [number, number, number];

type EarthDeviceTier = 'low' | 'medium' | 'high';
type EarthTextureTier = '1k' | '2k' | '4k';
type EarthTexturePaths = [day: string, night: string, bumpRoughnessClouds: string];

type EarthRenderTier = {
  deviceTier: EarthDeviceTier;
  textureTier: EarthTextureTier;
  texturePaths: EarthTexturePaths;
  dprCap: number;
  anisotropyCap: number;
};

type EarthRenderCapabilities = {
  viewportWidth: number;
  devicePixelRatio: number;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  coarsePointer: boolean;
};

const earthTexturePathsByTier: Record<EarthTextureTier, EarthTexturePaths> = {
  '1k': [
    '/assets/planets/earth-day-1024.webp',
    '/assets/planets/earth-night-1024.webp',
    '/assets/planets/earth-bump-roughness-clouds-1024.webp',
  ],
  '2k': [
    '/assets/planets/earth-day-2048.webp',
    '/assets/planets/earth-night-2048.webp',
    '/assets/planets/earth-bump-roughness-clouds-2048.webp',
  ],
  '4k': [
    '/assets/planets/earth-day-4096.jpg',
    '/assets/planets/earth-night-4096.jpg',
    '/assets/planets/earth-bump-roughness-clouds-4096.jpg',
  ],
};

function selectEarthRenderTier({
  viewportWidth,
  devicePixelRatio,
  deviceMemory,
  hardwareConcurrency,
  coarsePointer,
}: EarthRenderCapabilities): EarthRenderTier {
  const memoryIsLow = deviceMemory !== undefined && deviceMemory <= 4;
  const concurrencyIsLow = hardwareConcurrency !== undefined && hardwareConcurrency <= 4;
  const lowTier = viewportWidth <= 820 || coarsePointer || memoryIsLow || concurrencyIsLow;

  if (lowTier) {
    return {
      deviceTier: 'low',
      textureTier: '1k',
      texturePaths: earthTexturePathsByTier['1k'],
      dprCap: 1,
      anisotropyCap: 2,
    };
  }

  const hasHighCapacity =
    deviceMemory !== undefined &&
    deviceMemory >= 8 &&
    hardwareConcurrency !== undefined &&
    hardwareConcurrency >= 8;
  const displayNeedsHighResolution =
    viewportWidth >= 1600 || viewportWidth * Math.min(Math.max(devicePixelRatio, 1), 2) >= 2400;

  if (hasHighCapacity && displayNeedsHighResolution) {
    return {
      deviceTier: 'high',
      textureTier: '4k',
      texturePaths: earthTexturePathsByTier['4k'],
      dprCap: 1.5,
      anisotropyCap: 8,
    };
  }

  return {
    deviceTier: 'medium',
    textureTier: '2k',
    texturePaths: earthTexturePathsByTier['2k'],
    dprCap: 1.25,
    anisotropyCap: 4,
  };
}

function readEarthRenderTier() {
  if (typeof window === 'undefined') {
    return selectEarthRenderTier({
      viewportWidth: 1280,
      devicePixelRatio: 1,
      coarsePointer: false,
    });
  }

  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  return selectEarthRenderTier({
    viewportWidth: window.innerWidth,
    devicePixelRatio: window.devicePixelRatio,
    deviceMemory: navigatorWithMemory.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency || undefined,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
  });
}

type RendererFactory = Extract<GLProps, (...args: never[]) => unknown>;

type WebGlAvailability = 'checking' | 'supported' | 'unsupported';

function detectWebGl2Support() {
  if (typeof document === 'undefined') return false;
  try {
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

async function createWebGpuRenderer({ canvas }: Parameters<RendererFactory>[0]) {
  const renderer = new WebGPURenderer({
    alpha: true,
    antialias: true,
    canvas: canvas as HTMLCanvasElement,
    powerPreference: 'high-performance',
  });
  await renderer.init();
  return renderer;
}

class EarthTextureLoader extends TextureLoader {
  override load(
    url: string,
    onLoad?: (data: Texture<HTMLImageElement>) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ) {
    return super.load(
      url,
      (loadedTexture) => {
        if (url.includes('earth-day') || url.includes('earth-night')) {
          loadedTexture.colorSpace = SRGBColorSpace;
        }
        onLoad?.(loadedTexture);
      },
      onProgress,
      onError,
    );
  }
}

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
const branchSpineY = 1.28;
const branchDepth = -0.16;

type BranchLineKind = 'trunk' | 'rail' | 'stem';

function createBranchCurve(start: Point3, end: Point3, kind: BranchLineKind) {
  const delta = new Vector3(...end).sub(new Vector3(...start));
  const controlOne = delta.clone().multiplyScalar(kind === 'rail' ? 0.22 : 0.28);
  const controlTwo = delta.clone().multiplyScalar(kind === 'rail' ? 0.78 : 0.72);

  if (kind === 'rail') {
    // A single shallow rise reads as plotted astronomical linework. Mirrored
    // control points keep both halves exact without the organic S-bend that
    // previously made the rails look like suspended cable.
    controlOne.y += 0.055;
    controlTwo.y += 0.055;
    controlOne.z -= 0.012;
    controlTwo.z -= 0.012;
  } else if (kind === 'stem') {
    // Scenario limbs leave each indexed junction cleanly and flare outward
    // only at the terminal approach. The bend is small, one-directional, and
    // mirrored around the centreline.
    const flare = Math.sign(start[0]) * Math.min(0.052, Math.abs(delta.y) * 0.026);
    controlOne.x = 0;
    controlTwo.x += flare;
  }

  return new CubicBezierCurve3(new Vector3(), controlOne, controlTwo, delta);
}

function progressBetween(progress: number, start: number, end: number) {
  const linear = Math.min(1, Math.max(0, (progress - start) / (end - start)));
  return linear * linear * (3 - 2 * linear);
}

function cinematicOut(progress: number) {
  const clamped = Math.min(1, Math.max(0, progress));
  return 1 - (1 - clamped) ** 4;
}

function setBranchHead(
  head: Mesh | null,
  start: Point3,
  end: Point3,
  progress: number,
  size: number,
  kind: BranchLineKind,
) {
  if (!head) return;
  const point = createBranchCurve(start, end, kind).getPoint(progress);
  head.position.set(start[0] + point.x, start[1] + point.y, start[2] + point.z);
  const pulse =
    progress > 0.001 && progress < 0.999
      ? size * (0.76 + Math.sin(progress * Math.PI) * 0.24)
      : 0.001;
  head.scale.setScalar(pulse);
}

class CanvasGuard extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
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
    if (!reducedMotion && ref.current) ref.current.rotation.y += Math.min(delta, 1 / 30) * 0.003;
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
  if (positions.length === 0) return null;
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        blending={AdditiveBlending}
        color={color}
        depthWrite={false}
        opacity={0.76}
        size={0.045}
        sizeAttenuation
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
            <torusGeometry args={[1.018, 0.006, 5, 96]} />
            <meshBasicMaterial color={art.secondary} opacity={0.5} transparent />
          </mesh>
        ))}
        {[0, Math.PI / 3, (Math.PI * 2) / 3].map((rotation) => (
          <mesh key={rotation} rotation={[0, rotation, 0]}>
            <torusGeometry args={[1.018, 0.005, 5, 96]} />
            <meshBasicMaterial color={accent} opacity={0.44} transparent />
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
  reducedMotion,
}: {
  art: WorldArtProfile;
  accent: string;
  activity: number;
  reducedMotion: boolean;
}) {
  const architecture = useRef<Group>(null);
  const rings = useRef<Group>(null);
  const nodes = useRef<Group>(null);
  const objects = Math.min(16, Math.max(4, activity + 4));
  const orbitNodes = Array.from({ length: objects }, (_, index) => {
    const angle = (Math.PI * 2 * index) / objects;
    if (art.orbit === 'surveillance') {
      const radius = 1.52 + (index % 2) * 0.13;
      return [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.84,
        Math.sin(angle * 2) * 0.07,
      ] as Point3;
    }
    const irregularity = art.orbit === 'debris' || art.orbit === 'fragments' ? 0.18 : 0;
    const radius = 1.3 + (index % 3) * 0.12 + Math.sin(index * 3.7) * irregularity;
    return [
      Math.cos(angle) * radius,
      Math.sin(angle * 1.7) * (0.24 + irregularity),
      Math.sin(angle) * radius,
    ] as Point3;
  });

  const motionPhase = useMemo(
    () =>
      Array.from(art.orbit).reduce((phase, character) => phase + character.charCodeAt(0), 0) % 17,
    [art.orbit],
  );
  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const boundedDelta = Math.min(delta, 1 / 30);
    const elapsed = clock.elapsedTime + motionPhase * 0.17;
    if (architecture.current) {
      if (art.orbit === 'surveillance') {
        architecture.current.rotation.y = Math.sin(elapsed * 0.09) * 0.024;
        architecture.current.rotation.z = Math.sin(elapsed * 0.13) * 0.01;
      } else {
        architecture.current.rotation.y += boundedDelta * (art.orbit === 'quiet' ? 0.012 : 0.025);
        architecture.current.rotation.z = Math.sin(elapsed * 0.16) * 0.018;
      }
    }
    if (rings.current) {
      if (art.orbit === 'surveillance') {
        rings.current.rotation.y = Math.sin(elapsed * 0.1) * 0.014;
        rings.current.rotation.x = Math.sin(elapsed * 0.08) * 0.012;
      } else {
        rings.current.rotation.y -= boundedDelta * 0.038;
        rings.current.rotation.x = Math.sin(elapsed * 0.11) * 0.025;
      }
    }
    if (nodes.current) {
      if (art.orbit === 'surveillance') {
        nodes.current.rotation.z = Math.sin(elapsed * 0.11) * 0.012;
        nodes.current.position.y = 0;
      } else {
        nodes.current.rotation.y += boundedDelta * 0.052;
        nodes.current.position.y = Math.sin(elapsed * 0.24) * 0.018;
      }
    }
  });

  if (art.orbit === 'quiet') {
    return (
      <group ref={architecture}>
        <group ref={rings}>
          <mesh rotation={[1.22, 0.25, -0.2]}>
            <torusGeometry args={[1.28, 0.009, 5, 64, 2.25]} />
            <meshBasicMaterial
              blending={AdditiveBlending}
              color={accent}
              depthWrite={false}
              opacity={0.32}
              transparent
            />
          </mesh>
        </group>
      </group>
    );
  }

  if (art.orbit === 'neural-shell' || art.orbit === 'machine-swarm') {
    return (
      <group ref={architecture}>
        <group ref={rings}>
          <mesh scale={art.orbit === 'machine-swarm' ? 1.56 : 1.38} rotation={[0.2, 0.35, 0.1]}>
            <icosahedronGeometry args={[1, art.orbit === 'machine-swarm' ? 2 : 1]} />
            <meshBasicMaterial
              blending={AdditiveBlending}
              color={art.orbit === 'machine-swarm' ? art.secondary : accent}
              depthWrite={false}
              opacity={art.orbit === 'machine-swarm' ? 0.24 : 0.17}
              transparent
              wireframe
            />
          </mesh>
        </group>
        <group ref={nodes}>
          {orbitNodes.map((position, index) => (
            <mesh key={index} position={position} scale={index % 3 === 0 ? 0.058 : 0.031}>
              {art.orbit === 'machine-swarm' && index % 2 === 0 ? (
                <boxGeometry />
              ) : (
                <octahedronGeometry />
              )}
              <meshBasicMaterial color={index % 3 === 0 ? art.secondary : accent} />
            </mesh>
          ))}
        </group>
      </group>
    );
  }

  if (art.orbit === 'outbound') {
    return (
      <group ref={architecture}>
        <group ref={rings}>
          {[0, 0.62, 1.18].map((rotation, index) => (
            <mesh key={rotation} rotation={[1.1, rotation, -0.22 + index * 0.28]}>
              <torusGeometry args={[1.32 + index * 0.22, 0.01, 5, 72, 2.5 + index * 0.35]} />
              <meshBasicMaterial
                blending={AdditiveBlending}
                color={index === 0 ? art.secondary : accent}
                depthWrite={false}
                opacity={0.52}
                transparent
              />
            </mesh>
          ))}
        </group>
        <group ref={nodes}>
          {orbitNodes.slice(0, 7).map((position, index) => (
            <mesh
              key={index}
              position={[position[0] + index * 0.17, position[1] + index * 0.08, position[2]]}
              rotation={[0, 0, -Math.PI / 2]}
              scale={0.055 + index * 0.007}
            >
              <coneGeometry args={[0.55, 1.4, 6]} />
              <meshBasicMaterial color={index % 2 ? accent : art.secondary} />
            </mesh>
          ))}
        </group>
      </group>
    );
  }

  if (art.orbit === 'surveillance') {
    const surveillanceArcs = [
      { arc: 2.18, color: art.secondary, radius: 1.4, rotation: [0.14, -0.08, -0.16] },
      { arc: 1.62, color: accent, radius: 1.58, rotation: [-0.12, 0.1, Math.PI + 0.42] },
    ] as const;
    return (
      <group ref={architecture}>
        <group ref={rings}>
          {surveillanceArcs.map((orbit, index) => (
            <mesh key={index} rotation={orbit.rotation}>
              <torusGeometry
                args={[orbit.radius, index === 0 ? 0.0055 : 0.0045, 5, 96, orbit.arc]}
              />
              <meshBasicMaterial
                blending={AdditiveBlending}
                color={orbit.color}
                depthWrite={false}
                opacity={index === 0 ? 0.34 : 0.25}
                transparent
              />
            </mesh>
          ))}
        </group>
        <group ref={nodes}>
          {orbitNodes.slice(0, Math.min(8, objects)).map((position, index) => (
            <mesh key={index} position={position} rotation={[0, 0, index * 0.22]} scale={0.026}>
              <boxGeometry args={[1.55, 0.42, 0.42]} />
              <meshBasicMaterial color={index % 3 === 0 ? art.secondary : accent} />
            </mesh>
          ))}
        </group>
      </group>
    );
  }

  const broken = art.orbit === 'fragments' || art.orbit === 'broken-cycle';
  const clean = art.orbit === 'civic' || art.orbit === 'seed-arc';
  const ringCount = clean ? 1 : 2;
  return (
    <group ref={architecture}>
      <group ref={rings}>
        {Array.from({ length: ringCount }).map((_, index) => (
          <mesh key={index} rotation={[1.08 + index * 0.34, index * 0.5, index * 0.23]}>
            <torusGeometry
              args={[
                1.28 + index * 0.17,
                0.006 + index * 0.001,
                5,
                84,
                broken ? 3.85 : Math.PI * 2,
              ]}
            />
            <meshBasicMaterial
              blending={AdditiveBlending}
              color={index === 0 ? art.secondary : accent}
              depthWrite={false}
              opacity={clean ? 0.32 : 0.38}
              transparent
            />
          </mesh>
        ))}
      </group>
      <group ref={nodes}>
        {orbitNodes.slice(0, art.orbit === 'seed-arc' ? 4 : objects).map((position, index) => (
          <mesh
            key={index}
            position={position}
            rotation={[index * 0.4, index, 0]}
            scale={
              art.orbit === 'debris' || art.orbit === 'fragments'
                ? 0.022 + (index % 4) * 0.014
                : 0.03 + (index % 2) * 0.01
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
    </group>
  );
}

function WorldPlanet({
  profile,
  reducedMotion,
  textureAnisotropy,
  texturePaths,
  present = false,
  showLights = true,
  detailLevel = 'full',
}: {
  profile?: ScenarioProfile;
  reducedMotion: boolean;
  textureAnisotropy: number;
  texturePaths: EarthTexturePaths;
  present?: boolean;
  showLights?: boolean;
  detailLevel?: 'full' | 'subtle' | 'none';
}) {
  const [dayTexture, nightTexture, bumpRoughnessCloudsTexture] = useLoader(
    EarthTextureLoader,
    texturePaths,
  );
  const { invalidate } = useThree();
  useEffect(() => {
    for (const loadedTexture of [dayTexture, nightTexture, bumpRoughnessCloudsTexture]) {
      loadedTexture.anisotropy = textureAnisotropy;
      loadedTexture.needsUpdate = true;
    }
  }, [bumpRoughnessCloudsTexture, dayTexture, nightTexture, textureAnisotropy]);
  const planet = useRef<Mesh>(null);
  const orbit = useRef<Group>(null);
  const surface = useRef<Group>(null);
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
  const twilightColor = pollution && pollution > 1 ? '#ef7b38' : '#bc490b';
  const { atmosphereMaterial, globeMaterial } = useMemo(() => {
    const viewDirection = positionWorld.sub(cameraPosition).normalize();
    const fresnel = viewDirection.dot(normalWorldGeometry).abs().oneMinus().toVar();
    const sunOrientation = normalWorldGeometry.dot(normalize(vec3(4, 2.5, 5))).toVar();
    const dayAtmosphere = uniform(color(atmosphereColor));
    const twilightAtmosphere = uniform(color(twilightColor));
    const atmosphere = mix(
      twilightAtmosphere,
      dayAtmosphere,
      sunOrientation.smoothstep(-0.25, 0.75),
    );
    const cloudStrength = texture(bumpRoughnessCloudsTexture, uv()).b.smoothstep(0.2, 1);
    const surfaceTint = color(art?.surfaceTint ?? '#ffffff');
    const baseDay = mix(texture(dayTexture), surfaceTint, art ? 0.12 : 0);
    const material = new MeshStandardNodeMaterial();
    material.colorNode = mix(baseDay, vec3(1), cloudStrength.mul(2));
    const roughness = max(texture(bumpRoughnessCloudsTexture).g, step(0.01, cloudStrength));
    material.roughnessNode = roughness.remap(
      0,
      1,
      uniform(art?.roughness ? Math.max(0.18, art.roughness - 0.55) : 0.25),
      uniform(art?.roughness ? Math.min(0.78, art.roughness) : 0.35),
    );
    const night = texture(nightTexture);
    const dayStrength = sunOrientation.smoothstep(-0.25, 0.5);
    const atmosphereDayStrength = sunOrientation.smoothstep(-0.5, 1);
    const atmosphereMix = atmosphereDayStrength.mul(fresnel.pow(2)).clamp(0, 1);
    let finalOutput = mix(night.rgb, output.rgb, dayStrength);
    finalOutput = mix(finalOutput, atmosphere, atmosphereMix);
    material.outputNode = vec4(finalOutput, output.a);
    material.normalNode = bumpMap(max(texture(bumpRoughnessCloudsTexture).r, cloudStrength));

    const halo = new MeshBasicNodeMaterial({ side: BackSide, transparent: true });
    let alpha = fresnel.remap(0.73, 1, 1, 0).pow(3);
    alpha = alpha.mul(sunOrientation.smoothstep(-0.5, 1));
    halo.outputNode = vec4(atmosphere, alpha.mul(pollution && pollution > 1 ? 1.35 : 1));
    return { atmosphereMaterial: halo, globeMaterial: material };
  }, [
    art,
    atmosphereColor,
    bumpRoughnessCloudsTexture,
    dayTexture,
    nightTexture,
    pollution,
    twilightColor,
  ]);

  useEffect(() => {
    return () => {
      atmosphereMaterial.dispose();
      globeMaterial.dispose();
    };
  }, [atmosphereMaterial, globeMaterial]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    const boundedDelta = Math.min(delta, 1 / 30);
    if (planet.current) planet.current.rotation.y += boundedDelta * (present ? 0.028 : 0.045);
  });

  useLayoutEffect(() => {
    const scale = detailLevel === 'none' ? 0.001 : detailLevel === 'subtle' ? 0.48 : 1;
    const expanding = scale > (orbit.current?.scale.x ?? scale);
    const timeline = gsap.timeline({
      defaults: {
        duration: reducedMotion ? 0 : 0.92,
        ease: 'power4.inOut',
        overwrite: 'auto',
      },
      onUpdate: invalidate,
    });
    if (surface.current) {
      timeline.to(
        surface.current.scale,
        { x: scale, y: scale, z: scale },
        reducedMotion ? 0 : expanding ? 0 : 0.08,
      );
    }
    if (orbit.current) {
      timeline.to(
        orbit.current.scale,
        { x: scale, y: scale, z: scale },
        reducedMotion ? 0 : expanding ? 0.12 : 0,
      );
    }
    return () => {
      timeline.kill();
    };
  }, [detailLevel, invalidate, reducedMotion]);

  return (
    <group>
      <mesh ref={planet} rotation={art?.rotation ?? [0.08, -0.6, -0.16]}>
        <sphereGeometry args={[1, 64, 64]} />
        <primitive attach="material" object={globeMaterial} />
        <group visible={showLights}>
          <CityLights color={profile?.accent ?? '#ffd98a'} intensity={lights} />
        </group>
        <group
          ref={surface}
          scale={detailLevel === 'full' ? 1 : 0.48}
          visible={detailLevel !== 'none'}
        >
          {art && <SurfaceInterventions accent={profile?.accent ?? art.secondary} art={art} />}
        </group>
      </mesh>
      <mesh scale={1.04}>
        <sphereGeometry args={[1, 64, 64]} />
        <primitive attach="material" object={atmosphereMaterial} />
      </mesh>
      <group ref={orbit} scale={detailLevel === 'full' ? 1 : 0.48} visible={detailLevel !== 'none'}>
        {art && (
          <OrbitalArchitecture
            accent={profile?.accent ?? '#b8f15c'}
            activity={profile?.system.length ?? 0}
            art={art}
            reducedMotion={reducedMotion}
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

function BranchSegment({
  start,
  end,
  color,
  kind,
  segmentRef,
  radius = 0.018,
}: {
  start: Point3;
  end: Point3;
  color: string;
  kind: BranchLineKind;
  segmentRef: (element: Group | null) => void;
  radius?: number;
}) {
  const filamentSegments = useMemo(() => {
    const points = createBranchCurve(start, end, kind).getPoints(kind === 'rail' ? 20 : 12);
    const filamentSegments = points.slice(1).map((point, index) => {
      const prior = points[index];
      const segmentDirection = point.clone().sub(prior);
      return {
        length: segmentDirection.length(),
        midpoint: prior.clone().add(point).multiplyScalar(0.5),
        quaternion: new Quaternion().setFromUnitVectors(
          new Vector3(0, 1, 0),
          segmentDirection.normalize(),
        ),
      };
    });
    return filamentSegments;
  }, [end, kind, start]);

  return (
    <group position={start} ref={segmentRef} scale={0.001}>
      {filamentSegments.map((segment, index) => (
        <group key={index} position={segment.midpoint} quaternion={segment.quaternion}>
          <mesh>
            <cylinderGeometry args={[radius, radius, segment.length * 1.012, 6]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.42}
              opacity={0.68}
              roughness={0.38}
              transparent
            />
          </mesh>
        </group>
      ))}
    </group>
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

const fabObserverModelPath = '/assets/models/janus-alien-observer-v4.glb';

function observerClipWindow(name: string): [start: number, end: number] {
  if (/Reach|Focus/.test(name)) return [0.11, 0.64];
  if (/Brace|Body/.test(name)) return [0.035, 0.58];
  if (/Blink/.test(name)) return [0.24, 0.76];
  if (/Antenna/.test(name)) return [0.08, 0.7];
  return [0.04, 0.62];
}

function AlienObserverAsset({
  state,
  reducedMotion,
  observerProgress,
}: {
  state: StoryVisualState;
  reducedMotion: boolean;
  observerProgress: number;
}) {
  // Asset contributions: “Cute Alien Character” © Ndevisuals (CC BY 4.0),
  // and “Telescope” © Usman Ahmed Gill (Fab Standard License). The project
  // adds the object rig, observing performance, staging, and web optimization.
  const assetRoot = useRef<Group>(null);
  const instrumentRig = useRef<Group>(null);
  const { scene, animations } = useGLTF(fabObserverModelPath);
  const observerScene = useMemo(() => scene.clone(true), [scene]);
  const { actions, mixer, names } = useAnimations(animations, assetRoot);
  const { invalidate } = useThree();

  useEffect(() => {
    const shouldAnimate = state.kind === 'observer' && !reducedMotion;
    const clips = names.flatMap((name) => {
      const action = actions[name];
      if (!action) return [];
      if (shouldAnimate) {
        action.reset().setEffectiveWeight(1).setLoop(LoopRepeat, Number.POSITIVE_INFINITY).play();
        action.paused = true;
      } else {
        action.stop();
      }
      return [action];
    });
    return () => {
      clips.forEach((action) => action.stop());
    };
  }, [actions, names, reducedMotion, state.kind]);

  useLayoutEffect(() => {
    if (state.kind !== 'observer' || reducedMotion) {
      assetRoot.current?.position.set(0.5, -0.8, 0.18);
      assetRoot.current?.rotation.set(0, 0, 0);
      instrumentRig.current?.position.set(0.28, 1.22, 0.02);
      instrumentRig.current?.rotation.set(0, 0, 0);
      mixer.update(0);
      invalidate();
      return;
    }
    // The source contains coordinated body, brace, reach, focus, blink, and antenna
    // layers. Scrub each semantic layer through a restrained window, then hold the
    // authored contact pose before the editorial cut to the ocular view.
    names.forEach((name) => {
      const action = actions[name];
      if (!action) return;
      const [start, end] = observerClipWindow(name);
      const performanceProgress = progressBetween(observerProgress, start, end);
      action.time = Math.min(
        performanceProgress * action.getClip().duration,
        action.getClip().duration * 0.77,
      );
    });

    const brace = progressBetween(observerProgress, 0.02, 0.22);
    const reach = progressBetween(observerProgress, 0.14, 0.62);
    const settle = progressBetween(observerProgress, 0.58, 0.82);
    const heldLean = reach * (1 - settle * 0.34);
    if (assetRoot.current) {
      assetRoot.current.position.set(
        0.5 - heldLean * 0.045,
        -0.8 + brace * 0.026 - settle * 0.014,
        0.18 + heldLean * 0.018,
      );
      assetRoot.current.rotation.set(
        -heldLean * 0.012,
        -heldLean * 0.038,
        brace * 0.018 - settle * 0.012,
      );
    }
    if (instrumentRig.current) {
      instrumentRig.current.position.set(0.28, 1.22 - settle * 0.008, 0.02);
      instrumentRig.current.rotation.set(0, heldLean * 0.024, -brace * 0.012);
    }
    mixer.update(0);
    invalidate();
  }, [actions, invalidate, mixer, names, observerProgress, reducedMotion, state.kind]);

  return (
    <group position={[0.5, -0.8, 0.18]} ref={assetRoot}>
      <primitive object={observerScene} />
      <group position={[0.28, 1.22, 0.02]} ref={instrumentRig} scale={0.52}>
        <InstrumentAdapter state={state} />
      </group>
    </group>
  );
}

function AlienAstronomer({
  state,
  reducedMotion,
  observerProgress,
}: {
  state: StoryVisualState;
  reducedMotion: boolean;
  observerProgress: number;
}) {
  return (
    <AlienObserverAsset
      observerProgress={observerProgress}
      reducedMotion={reducedMotion}
      state={state}
    />
  );
}

function SystemScene({ state, reducedMotion }: Pick<EarthStageProps, 'state' | 'reducedMotion'>) {
  const profile = state.scenarioId ? getScenarioProfile(state.scenarioId) : undefined;
  const orbits = useRef<Group>(null);
  const moon = useRef<Group>(null);
  const mars = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const boundedDelta = Math.min(delta, 1 / 30);
    if (orbits.current) orbits.current.rotation.y += boundedDelta * 0.014;
    if (moon.current) moon.current.position.y = 0.72 + Math.sin(clock.elapsedTime * 0.17) * 0.025;
    if (mars.current) mars.current.position.y = -0.75 + Math.sin(clock.elapsedTime * 0.13) * 0.02;
  });
  return (
    <group>
      <group position={[-3.4, 0.72, -1.3]} ref={moon}>
        <mesh>
          <sphereGeometry args={[0.28, 32, 32]} />
          <meshStandardMaterial color="#d8a66f" roughness={0.95} />
        </mesh>
      </group>
      <group position={[3.45, -0.75, -1.25]} ref={mars}>
        <mesh>
          <sphereGeometry args={[0.33, 32, 32]} />
          <meshStandardMaterial color="#9b503e" roughness={0.95} />
        </mesh>
      </group>
      <group ref={orbits}>
        {[1.8, 2.35, 2.95].map((radius, index) => (
          <mesh key={radius} rotation={[1.25 + index * 0.08, index * 0.3, 0]}>
            <torusGeometry args={[radius, 0.006, 6, 144]} />
            <meshBasicMaterial
              blending={AdditiveBlending}
              color={profile?.accent ?? '#b8f15c'}
              depthWrite={false}
              opacity={0.28}
              transparent
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function CameraRig({
  state,
  reducedMotion,
  branchProgress = 0,
  observerProgress = 0,
}: Pick<EarthStageProps, 'state' | 'reducedMotion' | 'branchProgress' | 'observerProgress'>) {
  const { camera, invalidate, size } = useThree();
  const target = useRef(new Vector3(0, 0, 0));
  const portrait = size.width / size.height < 0.72;
  const observerCameraPath = useMemo(() => {
    const y = portrait ? 1.25 : 0;
    return new CatmullRomCurve3(
      [
        new Vector3(0, portrait ? 0.12 : 0.08, portrait ? 12.8 : 8.5),
        new Vector3(-0.06, y * 0.35 + 0.08, portrait ? 11.7 : 7.72),
        new Vector3(-0.18, y * 0.62 + 0.15, portrait ? 10.55 : 6.92),
        new Vector3(-0.36, y * 0.82 + 0.24, portrait ? 9.35 : 6.12),
        new Vector3(-0.5, y + 0.3, portrait ? 8.35 : 5.34),
      ],
      false,
      'centripetal',
    );
  }, [portrait]);
  const observerTargetPath = useMemo(() => {
    const y = portrait ? 1.25 : 0;
    return new CatmullRomCurve3(
      [
        new Vector3(0, 0, 0),
        new Vector3(-0.04, y * 0.38 + 0.1, 0.04),
        new Vector3(-0.13, y * 0.68 + 0.18, 0.07),
        new Vector3(-0.28, y * 0.9 + 0.26, 0.1),
        new Vector3(-0.4, y + 0.34, 0.12),
      ],
      false,
      'centripetal',
    );
  }, [portrait]);

  useLayoutEffect(() => {
    if (state.kind === 'branches' && !reducedMotion) {
      const progress = progressBetween(branchProgress, 0, 0.3);
      const start: Point3 = [0, 0, portrait ? 10.4 : 7.2];
      const end: Point3 = portrait ? [0, 0.2, 15.8] : [0, 0.12, 10.2];
      const lateralArc = Math.sin(progress * Math.PI) * (portrait ? 0.04 : -0.16);
      camera.position.set(
        start[0] + (end[0] - start[0]) * progress + lateralArc,
        start[1] + (end[1] - start[1]) * progress + Math.sin(progress * Math.PI) * 0.05,
        start[2] + (end[2] - start[2]) * progress,
      );
      target.current.set(0, progress * (portrait ? 0.14 : 0.06), 0);
      camera.lookAt(target.current);
      const perspective = camera as PerspectiveCamera;
      if (perspective.isPerspectiveCamera) {
        gsap.set(perspective, { fov: MathUtils.lerp(42, portrait ? 40 : 38, progress) });
        perspective.updateProjectionMatrix();
      }
      invalidate();
      return;
    }
    if (state.kind === 'observer' && !reducedMotion) {
      // Keep the camera outside the physical model. The final occlusion is a
      // deliberate editorial cut into the DOM/SVG instrument scene, not a trip
      // through impossible telescope geometry.
      const progress = progressBetween(observerProgress, 0.44, 0.9);
      const cameraPoint = observerCameraPath.getPoint(progress);
      camera.position.set(
        cameraPoint.x,
        cameraPoint.y + Math.sin(progress * Math.PI) * 0.055,
        cameraPoint.z,
      );
      observerTargetPath.getPoint(progress, target.current);
      camera.lookAt(target.current);
      const perspective = camera as PerspectiveCamera;
      if (perspective.isPerspectiveCamera) {
        gsap.set(perspective, {
          fov: MathUtils.lerp(portrait ? 40 : 38, portrait ? 35 : 32, progress),
        });
        perspective.updateProjectionMatrix();
      }
      invalidate();
      return;
    }
    const duration = reducedMotion
      ? 0
      : state.kind === 'branches'
        ? 0.84
        : state.kind === 'ocular' || state.kind === 'observer'
          ? 1.62
          : 1.42;
    const position: Point3 = portrait
      ? state.kind === 'branches'
        ? [0, 0.2, 15.8]
        : state.kind === 'scenario'
          ? [0, 0.12, 12.8]
          : state.kind === 'observer'
            ? [0, 0.35, 14.2]
            : state.kind === 'ocular'
              ? [0, 0, 9.4]
              : state.kind === 'matrix' || state.kind === 'handoff'
                ? [0, 0, 12]
                : state.kind === 'collapse'
                  ? [0, 0, 10.8]
                  : [0, 0, 10.4]
      : state.kind === 'branches'
        ? [0, 0.12, 10.2]
        : state.kind === 'scenario'
          ? [0.14, 0.08, 8.5]
          : state.kind === 'observer'
            ? [-0.08, 0.12, 8.2]
            : state.kind === 'ocular'
              ? [-0.14, 0, 6.6]
              : state.kind === 'matrix' || state.kind === 'handoff'
                ? [0, 0, 8.8]
                : state.kind === 'collapse'
                  ? [0, 0, 7.8]
                  : [0, 0, 7.2];
    const lookTarget: Point3 =
      state.kind === 'ocular'
        ? [0, portrait ? 0.55 : 0, 0]
        : state.kind === 'scenario'
          ? [portrait ? 0 : 0.1, portrait ? 0.18 : -0.02, 0.08]
          : [0, (state.kind === 'matrix' || state.kind === 'handoff') && portrait ? 0.7 : 0, 0];
    const fov = portrait
      ? state.kind === 'scenario'
        ? 38
        : state.kind === 'observer' || state.kind === 'ocular'
          ? 35
          : state.kind === 'collapse'
            ? 37
            : 40
      : state.kind === 'scenario'
        ? 36
        : state.kind === 'observer' || state.kind === 'ocular'
          ? 32
          : state.kind === 'collapse'
            ? 35
            : state.kind === 'matrix' || state.kind === 'handoff'
              ? 40
              : 42;
    const timeline = gsap.timeline({
      defaults: { duration, ease: 'power4.inOut', overwrite: 'auto' },
      onUpdate: () => {
        camera.lookAt(target.current);
        const perspective = camera as PerspectiveCamera;
        if (perspective.isPerspectiveCamera) perspective.updateProjectionMatrix();
        invalidate();
      },
    });
    timeline.to(camera.position, { x: position[0], y: position[1], z: position[2] }, 0);
    timeline.to(target.current, { x: lookTarget[0], y: lookTarget[1], z: lookTarget[2] }, 0);
    const perspective = camera as PerspectiveCamera;
    if (perspective.isPerspectiveCamera) timeline.to(perspective, { fov }, 0);
    return () => {
      timeline.kill();
    };
  }, [
    branchProgress,
    camera,
    invalidate,
    observerCameraPath,
    observerProgress,
    observerTargetPath,
    portrait,
    reducedMotion,
    state.kind,
    state.scenarioId,
  ]);
  return null;
}

function Scene({
  state,
  reducedMotion,
  textureAnisotropy,
  texturePaths,
  branchProgress = 0,
  observerProgress = 0,
}: Pick<EarthStageProps, 'state' | 'reducedMotion' | 'branchProgress' | 'observerProgress'> & {
  textureAnisotropy: number;
  texturePaths: EarthTexturePaths;
}) {
  const { invalidate, size } = useThree();
  const portrait = size.width / size.height < 0.72;
  const observerAssetEligible = !['present', 'branches', 'scenario'].includes(state.kind);
  const presentEarth = useRef<Group>(null);
  const branchTrunk = useRef<Group>(null);
  const branchRailLeft = useRef<Group>(null);
  const branchRailRight = useRef<Group>(null);
  const branchJunctions = useRef<Group>(null);
  const branchStems = useRef<Array<Group | null>>([]);
  const branchTrunkHead = useRef<Mesh>(null);
  const branchRailHeads = useRef<Array<Mesh | null>>([]);
  const branchStemHeads = useRef<Array<Mesh | null>>([]);
  const observer = useRef<Group>(null);
  const system = useRef<Group>(null);
  const worlds = useRef<Array<Group | null>>([]);
  const previousKind = useRef(state.kind);
  const previousScenarioId = useRef(state.scenarioId);

  useLayoutEffect(() => {
    if (state.kind !== 'branches') return;
    const progress = reducedMotion ? 1 : branchProgress;
    const earthProgress = progressBetween(progress, 0, 0.22);
    const presentY = portrait ? 0.62 : 0;
    const targetY = portrait ? 2.75 : 2.35;
    const presentScale = portrait ? 1.05 : 1.52;
    const targetScale = portrait ? 0.38 : 0.46;

    if (presentEarth.current) {
      presentEarth.current.position.set(
        0,
        presentY + (targetY - presentY) * earthProgress,
        -0.15 * earthProgress,
      );
      const scale = presentScale + (targetScale - presentScale) * earthProgress;
      presentEarth.current.scale.setScalar(scale);
      presentEarth.current.rotation.set(
        -0.12 * earthProgress,
        0.28 * earthProgress,
        -0.08 * earthProgress,
      );
    }

    const trunkProgress = progressBetween(progress, 0.12, 0.34);
    const railProgress = progressBetween(progress, 0.3, 0.58);
    branchTrunk.current?.scale.setScalar(Math.max(0.001, trunkProgress));
    branchRailLeft.current?.scale.setScalar(Math.max(0.001, railProgress));
    branchRailRight.current?.scale.setScalar(Math.max(0.001, railProgress));
    const junctionProgress = progressBetween(progress, 0.48, 0.64);
    branchJunctions.current?.scale.setScalar(Math.max(0.001, junctionProgress));

    const trunkStart: Point3 = [0, branchOrigin[1] - 0.48, branchDepth];
    const trunkEnd: Point3 = [0, branchSpineY, branchDepth];
    setBranchHead(branchTrunkHead.current, trunkStart, trunkEnd, trunkProgress, 1, 'trunk');
    setBranchHead(
      branchRailHeads.current[0],
      trunkEnd,
      [futurePositions[0][0], branchSpineY, branchDepth],
      railProgress,
      0.8,
      'rail',
    );
    setBranchHead(
      branchRailHeads.current[1],
      trunkEnd,
      [futurePositions.at(-1)?.[0] ?? 4.25, branchSpineY, branchDepth],
      railProgress,
      0.8,
      'rail',
    );

    worlds.current.forEach((world, index) => {
      if (!world) return;
      const target = futurePositions[index];
      const centerDistance = Math.abs(index - 4.5);
      const stemStart = 0.53 + centerDistance * 0.022;
      const stemEnd = stemStart + 0.2;
      const stemProgress = progressBetween(progress, stemStart, stemEnd);
      branchStems.current[index]?.scale.setScalar(Math.max(0.001, stemProgress));
      setBranchHead(
        branchStemHeads.current[index],
        [target[0], branchSpineY, branchDepth],
        target,
        stemProgress,
        0.65,
        'stem',
      );

      const worldProgress = progressBetween(progress, stemEnd - 0.015, stemEnd + 0.15);
      const easedWorldProgress = cinematicOut(worldProgress);
      const budding = state.branchState === 'budding';
      const targetWorldScale = budding ? (portrait ? 0.18 : 0.34) : portrait ? 0.26 : 0.48;
      world.position.set(
        target[0],
        target[1] + (1 - worldProgress) * 0.12,
        target[2] - (1 - worldProgress) * 0.24,
      );
      world.scale.setScalar(Math.max(0.001, targetWorldScale * easedWorldProgress));
      world.rotation.set(
        (1 - worldProgress) * -0.18,
        index * 0.035 + (1 - worldProgress) * -0.8,
        (1 - worldProgress) * 0.12,
      );
    });
    invalidate();
  }, [branchProgress, invalidate, portrait, reducedMotion, state.branchState, state.kind]);

  useLayoutEffect(() => {
    const priorKind = previousKind.current;
    const priorScenarioId = previousScenarioId.current;
    const enteringObserver = state.kind === 'observer' && priorKind !== 'observer';
    const changingScenario = state.kind === 'scenario' && priorScenarioId !== state.scenarioId;
    const duration = reducedMotion
      ? 0
      : state.kind === 'observer' || state.kind === 'ocular'
        ? 1.72
        : state.kind === 'scenario'
          ? 1.5
          : 1.36;
    const timeline = gsap.timeline({
      defaults: { duration, ease: 'power4.inOut', overwrite: 'auto' },
      onUpdate: invalidate,
    });
    const at = 0;

    if (presentEarth.current && state.kind !== 'branches') {
      const isPresent = state.kind === 'present' || state.kind === 'epilogue';
      const target = isPresent
        ? ([0, portrait ? 0.62 : 0, 0] as Point3)
        : ([0, portrait ? 4.8 : 4.1, -2.8] as Point3);
      const scale = isPresent ? (portrait ? 1.05 : 1.52) : 0.04;
      timeline.to(
        presentEarth.current.position,
        { duration: reducedMotion ? 0 : 1.5, x: target[0], y: target[1], z: target[2] },
        at,
      );
      timeline.to(
        presentEarth.current.scale,
        { duration: reducedMotion ? 0 : 1.24, x: scale, y: scale, z: scale },
        reducedMotion ? 0 : isPresent ? 0.08 : 0,
      );
      timeline.to(
        presentEarth.current.rotation,
        {
          duration: reducedMotion ? 0 : 1.66,
          x: isPresent ? 0 : -0.12,
          y: isPresent ? 0 : 0.28,
          z: 0,
        },
        at,
      );
    }

    const branching = state.kind === 'branches';
    const branchLines = [branchTrunk.current, branchRailLeft.current, branchRailRight.current];
    if (!branching) {
      branchStems.current.forEach((stem, index) => {
        if (stem)
          timeline.to(
            stem.scale,
            { duration: 0.28, x: 0.001, y: 0.001, z: 0.001 },
            reducedMotion ? 0 : index * 0.012,
          );
      });
      if (branchJunctions.current) {
        timeline.to(
          branchJunctions.current.scale,
          { duration: 0.22, x: 0.001, y: 0.001, z: 0.001 },
          reducedMotion ? 0 : 0.18,
        );
      }
      branchLines.slice(1).forEach((rail) => {
        if (rail)
          timeline.to(
            rail.scale,
            { duration: 0.36, x: 0.001, y: 0.001, z: 0.001 },
            reducedMotion ? 0 : 0.26,
          );
      });
      if (branchTrunk.current) {
        timeline.to(
          branchTrunk.current.scale,
          { duration: 0.28, x: 0.001, y: 0.001, z: 0.001 },
          reducedMotion ? 0 : 0.5,
        );
      }
    }

    worlds.current.forEach((world, index) => {
      if (!world) return;
      const base = futurePositions[index];
      const active = allScenarioProfiles[index].id === state.scenarioId;
      const outgoing = allScenarioProfiles[index].id === priorScenarioId && !active;
      let target: Point3 = [branchOrigin[0], branchOrigin[1], branchOrigin[2]];
      let scale = 0.001;

      if (state.kind === 'branches') {
        target = futurePositions[index];
        timeline.set(world.position, { x: target[0], y: target[1], z: target[2] }, at);
      } else if (state.kind === 'scenario') {
        target = active
          ? portrait
            ? [0, 0.3, 0.72]
            : [0.2, -0.05, 0.65]
          : portrait
            ? [2.15 + base[0] * 0.12, 0.85 + base[1] * 0.42, -1.2]
            : [2.25 + base[0] * 0.26, 0.05 + base[1] * 0.5, -1.05];
        scale = active ? (portrait ? 0.9 : 1.28) : portrait ? 0.15 : 0.27;
      } else if (state.kind === 'observer') {
        target = active
          ? portrait
            ? [2.28, 1.68, -1.08]
            : [3.45, 0.62, -1.12]
          : [base[0] * 1.4, -4.6 - (index % 2), -4.2];
        scale = active ? (portrait ? 0.28 : 0.39) : 0.001;
      } else if (state.kind === 'ocular') {
        target = [base[0] * 1.2, -5.4, -5];
        scale = 0.001;
      } else if (state.kind === 'matrix' || state.kind === 'handoff') {
        target = active ? [0, portrait ? 0.7 : 0, 0.2] : [base[0], -5.6, -5];
        scale = active ? (portrait ? 0.6 : 0.78) : 0.001;
      } else if (state.kind === 'collapse') {
        target = active ? [0, portrait ? 0.72 : 0, 0.25] : [base[0], -5.6, -5];
        scale = active ? (portrait ? 0.72 : 0.96) : 0.001;
      }

      if (state.kind !== 'branches') {
        const heroTransition =
          active && scale > 0.01 && (changingScenario || priorKind !== state.kind);
        const worldAt = reducedMotion
          ? 0
          : active
            ? heroTransition
              ? 0.1
              : 0.02
            : outgoing
              ? 0
              : Math.min(index, 9 - index) * 0.012;
        if (heroTransition && !reducedMotion) {
          const midpoint: Point3 = [
            (world.position.x + target[0]) * 0.5 + (portrait ? -0.04 : -0.12),
            (world.position.y + target[1]) * 0.5 + (portrait ? 0.12 : 0.2),
            Math.max(world.position.z, target[2]) + 0.18,
          ];
          timeline.to(
            world.position,
            {
              duration: 0.48,
              ease: 'power2.inOut',
              x: midpoint[0],
              y: midpoint[1],
              z: midpoint[2],
            },
            worldAt,
          );
          timeline.to(
            world.position,
            {
              duration: 0.9,
              ease: 'power4.out',
              x: target[0],
              y: target[1],
              z: target[2],
            },
            worldAt + 0.42,
          );
        } else {
          timeline.to(
            world.position,
            {
              duration: reducedMotion ? 0 : active ? 1.34 : outgoing ? 0.82 : 0.94,
              x: target[0],
              y: target[1],
              z: target[2],
            },
            worldAt,
          );
        }
        timeline.to(
          world.scale,
          {
            duration: reducedMotion ? 0 : active ? 1.26 : outgoing ? 0.72 : 0.86,
            x: scale,
            y: scale,
            z: scale,
          },
          worldAt + (heroTransition && !reducedMotion ? 0.08 : 0),
        );
        timeline.to(
          world.rotation,
          {
            duration: reducedMotion ? 0 : active ? 1.58 : 0.9,
            x: active ? -0.04 : 0,
            y: active ? 0.16 : index * 0.035,
            z: active ? -0.05 : 0,
          },
          worldAt,
        );
      }
    });

    if (observer.current) {
      const observing = state.kind === 'observer';
      const leavingFrame = state.kind === 'ocular';
      const target = observing
        ? ([0, portrait ? 1.25 : 0, 0] as Point3)
        : leavingFrame
          ? ([-18, -7, 10] as Point3)
          : state.kind === 'matrix' || state.kind === 'handoff'
            ? ([-13, -4.5, 7] as Point3)
            : ([-7.5, -1.6, -4] as Point3);
      const scale = observing ? (portrait ? 0.68 : 1) : leavingFrame ? 0.001 : 0.08;
      if (enteringObserver && !reducedMotion) {
        const approach: Point3 = [
          portrait ? -0.36 : -0.62,
          target[1] - (portrait ? 0.1 : 0.14),
          -0.22,
        ];
        timeline.to(
          observer.current.position,
          { duration: 1.08, x: approach[0], y: approach[1], z: approach[2] },
          at,
        );
        timeline.to(
          observer.current.position,
          { duration: 0.62, ease: 'power3.out', x: target[0], y: target[1], z: target[2] },
          0.92,
        );
        const approachScale = scale * 0.84;
        timeline.to(
          observer.current.scale,
          {
            duration: 1.04,
            x: approachScale,
            y: approachScale,
            z: approachScale,
          },
          at,
        );
        timeline.to(
          observer.current.scale,
          { duration: 0.58, ease: 'power3.out', x: scale, y: scale, z: scale },
          0.94,
        );
      } else {
        timeline.to(
          observer.current.position,
          {
            duration: reducedMotion ? 0 : leavingFrame ? 1.14 : 1.32,
            x: target[0],
            y: target[1],
            z: target[2],
          },
          at,
        );
        timeline.to(
          observer.current.scale,
          {
            duration: reducedMotion ? 0 : leavingFrame ? 0.72 : 1.12,
            x: scale,
            y: scale,
            z: scale,
          },
          reducedMotion ? 0 : leavingFrame ? 0.18 : at,
        );
      }
      timeline.to(
        observer.current.rotation,
        {
          duration: reducedMotion ? 0 : 1.38,
          x: 0,
          y: leavingFrame ? -0.14 : 0,
          z: observing ? -0.012 : 0,
        },
        at,
      );
    }

    if (system.current) {
      const active = state.kind === 'matrix' || state.kind === 'handoff';
      const scale = active ? (portrait ? 0.72 : 1) : 0.001;
      const systemAt = reducedMotion ? 0 : active ? 0.08 : 0;
      timeline.to(
        system.current.scale,
        { duration: reducedMotion ? 0 : 1.34, x: scale, y: scale, z: scale },
        systemAt,
      );
      timeline.to(
        system.current.position,
        {
          duration: reducedMotion ? 0 : 1.46,
          x: 0,
          y: active && portrait ? 0.7 : 0,
          z: active ? 0 : -4.5,
        },
        systemAt,
      );
      timeline.to(
        system.current.rotation,
        {
          duration: reducedMotion ? 0 : 1.62,
          y: active ? 0.22 : -0.45,
          z: active ? -0.08 : 0,
        },
        systemAt,
      );
    }

    previousKind.current = state.kind;
    previousScenarioId.current = state.scenarioId;

    return () => {
      timeline.kill();
    };
  }, [
    invalidate,
    portrait,
    reducedMotion,
    state.branchState,
    state.instrument,
    state.kind,
    state.scenarioId,
  ]);

  return (
    <group data-persistent-world="true">
      <Stars reducedMotion={reducedMotion} />
      <CameraRig
        branchProgress={branchProgress}
        observerProgress={observerProgress}
        reducedMotion={reducedMotion}
        state={state}
      />

      <group
        ref={presentEarth}
        position={[0, portrait ? 0.62 : 0, 0]}
        scale={portrait ? 1.05 : 1.52}
      >
        <WorldPlanet
          present
          reducedMotion={reducedMotion}
          textureAnisotropy={textureAnisotropy}
          texturePaths={texturePaths}
        />
      </group>

      <group>
        <BranchSegment
          color="#b8f15c"
          end={[0, branchSpineY, branchDepth]}
          kind="trunk"
          segmentRef={(element) => {
            branchTrunk.current = element;
          }}
          radius={0.014}
          start={[0, branchOrigin[1] - 0.48, branchDepth]}
        />
        <BranchSegment
          color="#89bfa8"
          end={[futurePositions[0][0], branchSpineY, branchDepth]}
          kind="rail"
          segmentRef={(element) => {
            branchRailLeft.current = element;
          }}
          radius={0.009}
          start={[0, branchSpineY, branchDepth]}
        />
        <BranchSegment
          color="#89bfa8"
          end={[futurePositions.at(-1)?.[0] ?? 4.25, branchSpineY, branchDepth]}
          kind="rail"
          segmentRef={(element) => {
            branchRailRight.current = element;
          }}
          radius={0.009}
          start={[0, branchSpineY, branchDepth]}
        />
        {allScenarioProfiles.map((profile, index) => {
          const target = futurePositions[index];
          return (
            <BranchSegment
              color={profile.accent}
              end={target}
              key={profile.id}
              kind="stem"
              segmentRef={(element) => {
                branchStems.current[index] = element;
              }}
              radius={0.007}
              start={[target[0], branchSpineY, branchDepth]}
            />
          );
        })}
        <group ref={branchJunctions} scale={0.001}>
          <group position={[0, branchSpineY, branchDepth]}>
            <mesh>
              <sphereGeometry args={[0.03, 14, 14]} />
              <meshBasicMaterial color="#efffc8" />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.057, 0.006, 5, 28]} />
              <meshBasicMaterial color="#89bfa8" opacity={0.72} transparent />
            </mesh>
          </group>
          {allScenarioProfiles.map((profile, index) => (
            <group
              key={profile.id}
              position={[futurePositions[index][0], branchSpineY, branchDepth]}
            >
              <mesh>
                <sphereGeometry args={[0.017, 12, 12]} />
                <meshBasicMaterial color={profile.accent} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.031, 0.0035, 5, 24]} />
                <meshBasicMaterial color={profile.accent} opacity={0.68} transparent />
              </mesh>
            </group>
          ))}
        </group>
        <mesh ref={branchTrunkHead} scale={0.001}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color="#efffc8" />
        </mesh>
        {['#c5ffe4', '#c5ffe4'].map((color, index) => (
          <mesh
            key={`${color}-${index}`}
            ref={(element) => {
              branchRailHeads.current[index] = element;
            }}
            scale={0.001}
          >
            <sphereGeometry args={[0.031, 14, 14]} />
            <meshBasicMaterial color={color} />
          </mesh>
        ))}
        {allScenarioProfiles.map((profile, index) => (
          <mesh
            key={`head-${profile.id}`}
            ref={(element) => {
              branchStemHeads.current[index] = element;
            }}
            scale={0.001}
          >
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshBasicMaterial color={profile.accent} />
          </mesh>
        ))}
      </group>

      {allScenarioProfiles.map((profile, index) => (
        <group
          key={profile.id}
          position={branchOrigin}
          ref={(element) => {
            worlds.current[index] = element;
          }}
          scale={0.001}
        >
          <WorldPlanet
            detailLevel={
              profile.id === state.scenarioId
                ? state.kind === 'ocular'
                  ? 'none'
                  : state.kind === 'observer'
                    ? 'subtle'
                    : 'full'
                : 'subtle'
            }
            profile={
              profile.id === state.scenarioId && state.kind === 'ocular' ? undefined : profile
            }
            reducedMotion={reducedMotion}
            showLights={profile.id === state.scenarioId}
            textureAnisotropy={textureAnisotropy}
            texturePaths={texturePaths}
          />
        </group>
      ))}

      {observerAssetEligible && (
        <group ref={observer} position={[-7.5, -1.6, -4]} scale={0.08}>
          <Suspense fallback={null}>
            <AlienAstronomer
              observerProgress={observerProgress}
              reducedMotion={reducedMotion}
              state={state}
            />
          </Suspense>
        </group>
      )}

      <group ref={system} position={[0, 0, -4.5]} scale={0.001}>
        <SystemScene reducedMotion={reducedMotion} state={state} />
      </group>
    </group>
  );
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('en', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}

function CollapsePanel({
  reducedMotion,
  scenarioId,
  view,
  visible,
}: {
  reducedMotion: boolean;
  scenarioId: NonNullable<StoryVisualState['scenarioId']>;
  view: StoryVisualState['collapseView'];
  visible: boolean;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const profile = getScenarioProfile(scenarioId);
  const { parameters, reportedResults } = profile.collapse;

  useEffect(() => {
    if (!panelRef.current) return;
    const rings = Array.from(panelRef.current.querySelectorAll<HTMLElement>('.collapsePulseRing'));
    if (rings.length === 0) return;
    gsap.killTweensOf(rings);
    if (reducedMotion || !visible || view !== 'single') {
      gsap.set(rings, { opacity: visible ? 0.5 : 0, scale: 1 });
      return;
    }
    const tween = gsap.fromTo(
      rings,
      { opacity: 0.62, scale: 0.82 },
      {
        opacity: 0,
        scale: 1.5,
        duration: 2.8,
        ease: 'power1.out',
        repeat: -1,
        stagger: 0.7,
      },
    );
    return () => {
      tween.kill();
    };
  }, [reducedMotion, view, visible]);

  const phases = [
    ['Growth', `r ${parameters.r}/yr`, 'fixed model parameter'],
    ['Resource pressure', `R₀ ${parameters.R0} · δ ${parameters.delta}/yr`, 'reported inputs'],
    ['Collapse survival', formatPercent(parameters.cf), 'capacity retained'],
    [
      'Recovery',
      `${parameters.rd} yr · ${formatPercent(parameters.rf)} of R₀`,
      'delay and restored stock',
    ],
  ];

  return (
    <section
      aria-label="Reported collapse and recovery evidence"
      className={`collapsePanel ${visible ? 'storyOverlayVisible' : ''}`}
      data-view={view}
      ref={panelRef}
      style={{ '--collapse-accent': profile.accent } as React.CSSProperties}
    >
      {view === 'single' ? (
        <>
          <header>
            <span>Reported model layer · {scenarioId}</span>
            <strong>Activity can stop while evidence lingers.</strong>
          </header>
          <div className="collapseOrbit" aria-hidden="true">
            <div className="collapseWorld">
              <Image
                alt=""
                fill
                sizes="34vw"
                src={`/assets/scenarios/${scenarioId.toLowerCase()}-world-v1.webp`}
              />
            </div>
            <i className="collapsePulseRing" />
            <i className="collapsePulseRing" />
            <i className="collapsePulseRing" />
          </div>
          <dl className="collapsePhases">
            {phases.map(([label, value, note], index) => (
              <div className={`collapsePhase collapsePhase-${index + 1}`} key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
                <small>{note}</small>
              </div>
            ))}
          </dl>
          <div className="collapseResult">
            <span>
              Reported aggregate · {collapseDataset.simulation.monteCarloRunsPerScenario} runs
            </span>
            <strong>{reportedResults.summary}</strong>
            <small>
              {collapseDataset.simulation.windowYears}-year window · hazard h {parameters.h}/yr · no
              per-run trajectory reconstructed
            </small>
          </div>
          <p className="collapsePersistenceNote">
            Signature afterglow is category-dependent. Persistence probability is not calculated in
            this story.
          </p>
        </>
      ) : (
        <>
          <header>
            <span>Reported ensemble summaries</span>
            <strong>Ten different rhythms</strong>
          </header>
          <ol className="collapseRhythms">
            {allScenarioProfiles.map((candidate) => {
              const duty = candidate.collapse.reportedResults.meanDutyCycle;
              return (
                <li
                  data-available={duty === null ? 'false' : 'true'}
                  key={candidate.id}
                  style={
                    {
                      '--rhythm-accent': candidate.accent,
                      '--reported-duty': duty ?? 0,
                    } as React.CSSProperties
                  }
                >
                  <div aria-hidden="true">
                    <i />
                    <span />
                  </div>
                  <strong>{candidate.id}</strong>
                  <span>{duty === null ? 'Not transcribed' : formatPercent(duty)}</span>
                  <small>mean duty cycle</small>
                </li>
              );
            })}
          </ol>
          <p className="collapsePanelSource">
            Reported prose values only · unavailable remains unavailable · figure bars were not
            digitized
          </p>
        </>
      )}
    </section>
  );
}

function CanvasLifecycle({
  onContextLost,
  onContextRestored,
  onReady,
}: {
  onContextLost: () => void;
  onContextRestored: () => void;
  onReady: () => void;
}) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    const handleContextRestored = () => {
      onContextRestored();
      invalidate();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    onReady();

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl, invalidate, onContextLost, onContextRestored, onReady]);
  return null;
}

type RendererState = 'failed' | 'loading' | 'lost' | 'poster' | 'ready' | 'restored';

export function EarthStage({
  state,
  reducedMotion,
  branchProgress = 0,
  observerProgress = 0,
  className = '',
  onReady,
  onRecoveryChange,
}: EarthStageProps) {
  const profile = state.scenarioId ? getScenarioProfile(state.scenarioId) : undefined;
  const [renderTier] = useState(readEarthRenderTier);
  const posterFirst = renderTier.deviceTier === 'low';
  const [canvasGeneration, setCanvasGeneration] = useState(0);
  const [interactiveRequested, setInteractiveRequested] = useState(!posterFirst);
  const [rendererState, setRendererState] = useState<RendererState>(
    posterFirst ? 'poster' : 'loading',
  );
  const [webGlAvailability, setWebGlAvailability] = useState<WebGlAvailability>('checking');
  const [visible, setVisible] = useState(true);
  const wrapper = useRef<HTMLDivElement>(null);
  const webglReady = rendererState === 'ready';
  const recoveryActive =
    rendererState === 'failed' || rendererState === 'lost' || rendererState === 'restored';
  const stageControlActive = recoveryActive || !interactiveRequested;

  useEffect(() => {
    onReady?.(posterFirst ? 'poster' : 'fallback');
  }, [onReady, posterFirst]);

  useEffect(() => {
    onRecoveryChange?.(stageControlActive);
  }, [onRecoveryChange, stageControlActive]);

  useEffect(
    () => () => {
      onRecoveryChange?.(false);
    },
    [onRecoveryChange],
  );

  useEffect(() => {
    if (!wrapper.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? true),
      { rootMargin: '160px' },
    );
    observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, []);

  const handleCanvasFailure = useCallback(() => {
    setRendererState('failed');
    trackPublicInteraction('fallback_mode', 'webgl_initialization_failed');
    onReady?.('fallback');
  }, [onReady]);

  const handleCanvasReady = useCallback(() => {
    setRendererState('ready');
    onReady?.('spatial');
  }, [onReady]);

  const handleContextLost = useCallback(() => {
    setRendererState('lost');
    trackPublicInteraction('fallback_mode', 'webgl_context_lost');
    onReady?.('fallback');
  }, [onReady]);

  const handleContextRestored = useCallback(() => {
    setRendererState('restored');
    trackPublicInteraction('fallback_mode', 'webgl_context_restored');
    onReady?.('fallback');
  }, [onReady]);

  useEffect(() => {
    if (!interactiveRequested) return;
    const frame = window.requestAnimationFrame(() => {
      if (detectWebGl2Support()) {
        setWebGlAvailability('supported');
        return;
      }
      setWebGlAvailability('unsupported');
      handleCanvasFailure();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [canvasGeneration, handleCanvasFailure, interactiveRequested]);

  const openInteractiveStage = useCallback(() => {
    trackPublicInteraction('fallback_mode', 'low_tier_interactive_opt_in');
    setInteractiveRequested(true);
    setRendererState('loading');
    onReady?.('fallback');
  }, [onReady]);

  const retrySpatialStage = useCallback(() => {
    trackPublicInteraction('fallback_mode', 'webgl_retry');
    setWebGlAvailability('checking');
    setRendererState('loading');
    setCanvasGeneration((generation) => generation + 1);
    onReady?.('fallback');
  }, [onReady]);

  const recoveryMessage =
    rendererState === 'lost'
      ? 'Spatial rendering paused after graphics context loss. The complete 2D view remains available.'
      : rendererState === 'restored'
        ? 'The graphics context was restored. Retry to rebuild the spatial layer.'
        : 'Spatial rendering could not initialize. The complete 2D view remains available.';

  return (
    <div
      className={`earthStage ${webglReady ? 'earthStageWebglReady' : ''} ${className}`}
      data-scene-kind={state.kind}
      data-branch-state={state.branchState}
      data-branch-layout="trunk-spine-stems"
      data-branch-animation="scroll-scrubbed"
      data-branch-progress={branchProgress.toFixed(3)}
      data-observer-asset="janus-observer-poster-v1+fab-progressive"
      data-observer-motion={reducedMotion ? 'reduced' : 'seven-clip-scroll-scrub'}
      data-observer-camera="alien-dolly-editorial-cut"
      data-observer-progress={observerProgress.toFixed(3)}
      data-earth-anisotropy-cap={renderTier.anisotropyCap}
      data-earth-device-tier={renderTier.deviceTier}
      data-earth-dpr-cap={renderTier.dprCap}
      data-earth-texture-tier={renderTier.textureTier}
      data-render-state={rendererState}
      data-render-loop="demand"
      data-spatial-consent={interactiveRequested ? 'granted' : 'required'}
      data-stage-visible={visible ? 'true' : 'false'}
      data-world-lifecycle={interactiveRequested ? 'persistent' : 'poster-first'}
      ref={wrapper}
      style={{ '--scene-accent': profile?.accent ?? '#b8f15c' } as React.CSSProperties}
    >
      <dl className="srOnly" data-earth-render-status="bounded">
        <div>
          <dt>Earth rendering device tier</dt>
          <dd>{renderTier.deviceTier}</dd>
        </div>
        <div>
          <dt>Earth texture tier</dt>
          <dd>{renderTier.textureTier}</dd>
        </div>
        <div>
          <dt>Canvas device-pixel-ratio cap</dt>
          <dd>{renderTier.dprCap}</dd>
        </div>
        <div>
          <dt>Texture anisotropy cap</dt>
          <dd>{renderTier.anisotropyCap}</dd>
        </div>
      </dl>
      {state.kind === 'observer' && (
        <div className="observerPoster" aria-hidden="true">
          <Image
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 100vw, 68vw"
            src="/assets/observer/janus-observer-poster-v1.webp"
          />
          <span />
        </div>
      )}
      <div className="stageFallback" aria-hidden="true">
        <span className="fallbackEarth">
          <Image
            alt=""
            fill
            sizes="(max-width: 760px) 68vw, 390px"
            src="/assets/planets/earth-day-1440.webp"
            unoptimized
          />
        </span>
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
      <CollapsePanel
        reducedMotion={reducedMotion}
        scenarioId={state.scenarioId ?? 'S4'}
        view={state.collapseView}
        visible={state.kind === 'collapse'}
      />
      {!interactiveRequested && (
        <div className="stageRecovery stageInteractiveChoice">
          <p>
            The poster and complete structured story are ready. The interactive view is optional.
          </p>
          <button onClick={openInteractiveStage} type="button">
            Open interactive view
          </button>
        </div>
      )}
      {recoveryActive && (
        <div className="stageRecovery">
          <p aria-live="polite" role="status">
            {recoveryMessage}
          </p>
          <button onClick={retrySpatialStage} type="button">
            Retry spatial view
          </button>
        </div>
      )}
      {webGlAvailability === 'supported' && (
        <CanvasGuard key={canvasGeneration} onFailure={handleCanvasFailure}>
          <Canvas
            aria-hidden="true"
            camera={{ position: [0, 0, 7.2], fov: 42 }}
            className="earthCanvas"
            dpr={[1, renderTier.dprCap]}
            frameloop="demand"
            gl={createWebGpuRenderer}
          >
            <ambientLight intensity={0.56} />
            <directionalLight intensity={3.2} position={[4, 2.5, 5]} />
            <directionalLight color="#8db8a4" intensity={1.2} position={[-4, 1, 2]} />
            <pointLight
              color={profile?.accent ?? '#b8f15c'}
              intensity={16}
              position={[-4, -2, 3]}
            />
            <pointLight color="#ffb15c" intensity={10} position={[2.5, 2, 1]} />
            <Suspense fallback={null}>
              <CanvasLifecycle
                onContextLost={handleContextLost}
                onContextRestored={handleContextRestored}
                onReady={handleCanvasReady}
              />
              <Scene
                branchProgress={branchProgress}
                observerProgress={observerProgress}
                reducedMotion={reducedMotion}
                state={state}
                textureAnisotropy={renderTier.anisotropyCap}
                texturePaths={renderTier.texturePaths}
              />
            </Suspense>
          </Canvas>
        </CanvasGuard>
      )}
    </div>
  );
}
