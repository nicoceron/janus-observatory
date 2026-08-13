'use client';

import { Canvas, useFrame, useLoader, useThree, type GLProps } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import gsap from 'gsap';
import {
  AdditiveBlending,
  BackSide,
  CatmullRomCurve3,
  LoopRepeat,
  Quaternion,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Mesh,
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
  branchProgress?: number;
  observerProgress?: number;
  className?: string;
};

type Point3 = [number, number, number];

const earthTexturePaths: string[] = [
  '/assets/planets/earth-day-4096.jpg',
  '/assets/planets/earth-night-4096.jpg',
  '/assets/planets/earth-bump-roughness-clouds-4096.jpg',
];

type RendererFactory = Extract<GLProps, (...args: never[]) => unknown>;

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
        loadedTexture.anisotropy = 8;
        loadedTexture.needsUpdate = true;
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

function progressBetween(progress: number, start: number, end: number) {
  const linear = Math.min(1, Math.max(0, (progress - start) / (end - start)));
  return linear * linear * (3 - 2 * linear);
}

function backOut(progress: number) {
  const overshoot = 1.35;
  const shifted = progress - 1;
  return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2;
}

function setBranchHead(
  head: Mesh | null,
  start: Point3,
  end: Point3,
  progress: number,
  size: number,
) {
  if (!head) return;
  head.position.set(
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress,
    start[2] + (end[2] - start[2]) * progress,
  );
  const pulse =
    progress > 0.001 && progress < 0.999
      ? size * (0.8 + Math.sin(progress * Math.PI) * 0.55)
      : 0.001;
  head.scale.setScalar(pulse);
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
  detailLevel = 'full',
}: {
  profile?: ScenarioProfile;
  reducedMotion: boolean;
  present?: boolean;
  showLights?: boolean;
  detailLevel?: 'full' | 'subtle' | 'none';
}) {
  const [dayTexture, nightTexture, bumpRoughnessCloudsTexture] = useLoader(
    EarthTextureLoader,
    earthTexturePaths,
  );
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
    if (planet.current) planet.current.rotation.y += delta * (present ? 0.028 : 0.045);
    if (orbit.current) orbit.current.rotation.y -= delta * 0.05;
  });

  useLayoutEffect(() => {
    const scale = detailLevel === 'none' ? 0.001 : detailLevel === 'subtle' ? 0.64 : 1;
    const duration = reducedMotion ? 0 : 0.9;
    const targets = [surface.current, orbit.current].filter((target): target is Group =>
      Boolean(target),
    );
    const tweens = targets.map((target) =>
      gsap.to(target.scale, {
        duration,
        ease: 'power3.inOut',
        overwrite: 'auto',
        x: scale,
        y: scale,
        z: scale,
      }),
    );
    return () => {
      tweens.forEach((tween) => tween.kill());
    };
  }, [detailLevel, reducedMotion]);

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
          scale={detailLevel === 'full' ? 1 : 0.64}
          visible={detailLevel !== 'none'}
        >
          {art && <SurfaceInterventions accent={profile?.accent ?? art.secondary} art={art} />}
        </group>
      </mesh>
      <mesh scale={1.04}>
        <sphereGeometry args={[1, 64, 64]} />
        <primitive attach="material" object={atmosphereMaterial} />
      </mesh>
      <group ref={orbit} scale={detailLevel === 'full' ? 1 : 0.64} visible={detailLevel !== 'none'}>
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

function BranchSegment({
  start,
  end,
  color,
  segmentRef,
  radius = 0.018,
}: {
  start: Point3;
  end: Point3;
  color: string;
  segmentRef: (element: Group | null) => void;
  radius?: number;
}) {
  const { length, quaternion } = useMemo(() => {
    const from = new Vector3(...start);
    const direction = new Vector3(...end).sub(from);
    return {
      length: direction.length(),
      quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()),
    };
  }, [end, start]);

  return (
    <group position={start} quaternion={quaternion} ref={segmentRef} scale={[1, 0.001, 1]}>
      <mesh position={[0, length / 2, 0]}>
        <cylinderGeometry args={[radius * 0.74, radius, length, 10]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.72}
          opacity={0.68}
          roughness={0.42}
          transparent
        />
      </mesh>
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

const fabObserverModelPath = '/assets/models/janus-alien-observer-v3.glb';

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
        action.reset().setLoop(LoopRepeat, Number.POSITIVE_INFINITY).play();
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
    if (state.kind !== 'observer' || reducedMotion) return;
    // Scrub only through the reach and focus hold. The final quarter of the
    // authored loop lowers the arm, so it remains reserved for a future exit shot.
    const performanceProgress = progressBetween(observerProgress, 0.02, 0.44);
    const playhead = performanceProgress * 3.08;
    names.forEach((name) => {
      const action = actions[name];
      if (!action) return;
      action.time = Math.min(playhead, action.getClip().duration * 0.77);
    });
    mixer.update(0);
    invalidate();
  }, [actions, invalidate, mixer, names, observerProgress, reducedMotion, state.kind]);

  return (
    <group position={[0.5, -0.8, 0.18]} ref={assetRoot}>
      <primitive object={observerScene} />
      <group position={[0.28, 1.22, 0.02]} scale={0.52}>
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

      <AlienObserverAsset
        observerProgress={observerProgress}
        reducedMotion={reducedMotion}
        state={state}
      />
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

useGLTF.preload(fabObserverModelPath);

function SystemScene({ state }: Pick<EarthStageProps, 'state'>) {
  const profile = state.scenarioId ? getScenarioProfile(state.scenarioId) : undefined;
  return (
    <group>
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
        new Vector3(0.18, y + 0.22, portrait ? 9.4 : 6.35),
        new Vector3(0.58, y + 0.42, portrait ? 5.2 : 3.55),
        new Vector3(0.52, y + 0.58, portrait ? 2.2 : 1.72),
        new Vector3(0.46, y + 0.78, portrait ? 1.55 : 1.15),
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
        new Vector3(0.18, y + 0.16, 0.08),
        new Vector3(0.28, y + 0.34, 0.18),
        new Vector3(0.24, y + 0.38, 0.18),
        new Vector3(0.2, y + 0.36, 0.18),
      ],
      false,
      'centripetal',
    );
  }, [portrait]);

  useLayoutEffect(() => {
    if (state.kind === 'branches' && !reducedMotion) {
      const progress = progressBetween(branchProgress, 0, 0.24);
      const start: Point3 = [0, 0, portrait ? 10.4 : 7.2];
      const end: Point3 = portrait ? [0, 0.2, 15.8] : [0, 0.12, 10.2];
      camera.position.set(
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
        start[2] + (end[2] - start[2]) * progress,
      );
      camera.lookAt(0, 0, 0);
      target.current.set(0, 0, 0);
      invalidate();
      return;
    }
    if (state.kind === 'observer' && !reducedMotion) {
      // Let the alien complete most of the look/reach before the camera takes over.
      const progress = progressBetween(observerProgress, 0.38, 1);
      observerCameraPath.getPoint(progress, camera.position);
      observerTargetPath.getPoint(progress, target.current);
      camera.lookAt(target.current);
      invalidate();
      return;
    }
    const duration = reducedMotion ? 0 : state.kind === 'branches' ? 0.78 : 1.35;
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
    const lookTarget: Point3 =
      state.kind === 'ocular'
        ? [0, portrait ? 0.55 : 0, 0]
        : [0, state.kind === 'system' && portrait ? 0.7 : 0, 0];
    const timeline = gsap.timeline({
      defaults: { duration, ease: 'power3.inOut', overwrite: 'auto' },
      onUpdate: () => {
        camera.lookAt(target.current);
        invalidate();
      },
    });
    timeline.to(camera.position, { x: position[0], y: position[1], z: position[2] }, 0);
    timeline.to(target.current, { x: lookTarget[0], y: lookTarget[1], z: lookTarget[2] }, 0);
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
  branchProgress = 0,
  observerProgress = 0,
}: Pick<EarthStageProps, 'state' | 'reducedMotion' | 'branchProgress' | 'observerProgress'>) {
  const { invalidate, size } = useThree();
  const portrait = size.width / size.height < 0.72;
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
  const ocularTunnel = useRef<Group>(null);
  const gravitationalLens = useRef<Group>(null);
  const system = useRef<Group>(null);
  const worlds = useRef<Array<Group | null>>([]);

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
    branchTrunk.current?.scale.set(1, Math.max(0.001, trunkProgress), 1);
    branchRailLeft.current?.scale.set(1, Math.max(0.001, railProgress), 1);
    branchRailRight.current?.scale.set(1, Math.max(0.001, railProgress), 1);
    const junctionProgress = progressBetween(progress, 0.48, 0.64);
    branchJunctions.current?.scale.setScalar(Math.max(0.001, junctionProgress));

    const trunkStart: Point3 = [0, branchOrigin[1] - 0.48, branchDepth];
    const trunkEnd: Point3 = [0, branchSpineY, branchDepth];
    setBranchHead(branchTrunkHead.current, trunkStart, trunkEnd, trunkProgress, 1);
    setBranchHead(
      branchRailHeads.current[0],
      trunkEnd,
      [futurePositions[0][0], branchSpineY, branchDepth],
      railProgress,
      0.8,
    );
    setBranchHead(
      branchRailHeads.current[1],
      trunkEnd,
      [futurePositions.at(-1)?.[0] ?? 4.25, branchSpineY, branchDepth],
      railProgress,
      0.8,
    );

    worlds.current.forEach((world, index) => {
      if (!world) return;
      const target = futurePositions[index];
      const centerDistance = Math.abs(index - 4.5);
      const stemStart = 0.53 + centerDistance * 0.022;
      const stemEnd = stemStart + 0.2;
      const stemProgress = progressBetween(progress, stemStart, stemEnd);
      branchStems.current[index]?.scale.set(1, Math.max(0.001, stemProgress), 1);
      setBranchHead(
        branchStemHeads.current[index],
        [target[0], branchSpineY, branchDepth],
        target,
        stemProgress,
        0.65,
      );

      const worldProgress = progressBetween(progress, stemEnd - 0.015, stemEnd + 0.15);
      const easedWorldProgress = Math.max(0, backOut(worldProgress));
      const budding = state.branchState === 'budding';
      const targetWorldScale = budding ? (portrait ? 0.18 : 0.34) : portrait ? 0.26 : 0.48;
      world.position.set(...target);
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
    const duration = reducedMotion
      ? 0
      : state.kind === 'observer' || state.kind === 'ocular'
        ? 1.6
        : 1.25;
    const timeline = gsap.timeline({
      defaults: { duration, ease: 'power3.inOut', overwrite: 'auto' },
      onUpdate: invalidate,
    });
    const at = 0;

    if (presentEarth.current && state.kind !== 'branches') {
      const isPresent = state.kind === 'present';
      const target = isPresent
        ? ([0, portrait ? 0.62 : 0, 0] as Point3)
        : ([0, portrait ? 4.8 : 4.1, -2.8] as Point3);
      const scale = isPresent ? (portrait ? 1.05 : 1.52) : 0.04;
      timeline.to(presentEarth.current.position, { x: target[0], y: target[1], z: target[2] }, at);
      timeline.to(presentEarth.current.scale, { x: scale, y: scale, z: scale }, at);
      timeline.to(
        presentEarth.current.rotation,
        {
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
          timeline.to(stem.scale, { duration: 0.28, y: 0.001 }, reducedMotion ? 0 : index * 0.012);
      });
      if (branchJunctions.current) {
        timeline.to(
          branchJunctions.current.scale,
          { duration: 0.22, x: 0.001, y: 0.001, z: 0.001 },
          reducedMotion ? 0 : 0.18,
        );
      }
      branchLines.slice(1).forEach((rail) => {
        if (rail) timeline.to(rail.scale, { duration: 0.36, y: 0.001 }, reducedMotion ? 0 : 0.26);
      });
      if (branchTrunk.current) {
        timeline.to(
          branchTrunk.current.scale,
          { duration: 0.28, y: 0.001 },
          reducedMotion ? 0 : 0.5,
        );
      }
    }

    worlds.current.forEach((world, index) => {
      if (!world) return;
      const base = futurePositions[index];
      const active = allScenarioProfiles[index].id === state.scenarioId;
      let target: Point3 = [branchOrigin[0], branchOrigin[1], branchOrigin[2]];
      let scale = 0.001;
      const worldAt = at;

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
        target = active ? [0, portrait ? 0.55 : 0, 0.35] : [base[0] * 1.2, -5.4, -5];
        scale = active ? (portrait ? 1.05 : 1.62) : 0.001;
      } else if (state.kind === 'system') {
        target = active ? [0, portrait ? 0.7 : 0, 0.2] : [base[0], -5.6, -5];
        scale = active ? (portrait ? 0.6 : 0.78) : 0.001;
      }

      if (state.kind !== 'branches') {
        timeline.to(world.position, { x: target[0], y: target[1], z: target[2] }, at);
      }
      if (state.kind !== 'branches') {
        timeline.to(world.scale, { x: scale, y: scale, z: scale }, worldAt);
        timeline.to(
          world.rotation,
          { x: active ? -0.04 : 0, y: active ? 0.16 : index * 0.035, z: active ? -0.05 : 0 },
          worldAt,
        );
      }
    });

    if (observer.current) {
      const observing = state.kind === 'observer';
      const passingThrough = state.kind === 'ocular';
      const target = observing
        ? ([0, portrait ? 1.25 : 0, 0] as Point3)
        : passingThrough
          ? ([-18, -7, 10] as Point3)
          : state.kind === 'system'
            ? ([-13, -4.5, 7] as Point3)
            : ([-7.5, -1.6, -4] as Point3);
      const scale = observing ? (portrait ? 0.68 : 1) : passingThrough ? 0.001 : 0.08;
      timeline.to(observer.current.position, { x: target[0], y: target[1], z: target[2] }, at);
      timeline.to(observer.current.scale, { x: scale, y: scale, z: scale }, at);
      timeline.to(observer.current.rotation, { x: 0, y: passingThrough ? -0.18 : 0, z: 0 }, at);
    }

    if (ocularTunnel.current) {
      const ocular = state.kind === 'ocular';
      const scale = ocular ? (portrait ? 0.82 : 1) : 0.001;
      timeline.to(ocularTunnel.current.scale, { x: scale, y: scale, z: scale }, at);
      timeline.to(
        ocularTunnel.current.position,
        {
          x: 0,
          y: portrait ? 0.55 : 0,
          z: ocular ? 0 : 4.8,
        },
        at,
      );
      timeline.to(
        ocularTunnel.current.rotation,
        {
          x: 0,
          y: 0,
          z: ocular ? Math.PI * 0.08 : -Math.PI * 0.2,
        },
        at,
      );
    }

    if (gravitationalLens.current) {
      const active = state.kind === 'ocular' && state.instrument === 'solar_gravitational_lens';
      const scale = active ? 1 : 0.001;
      timeline.to(gravitationalLens.current.scale, { x: scale, y: scale, z: scale }, at);
      timeline.to(gravitationalLens.current.rotation, { z: active ? Math.PI * 0.22 : 0 }, at);
    }

    if (system.current) {
      const active = state.kind === 'system';
      const scale = active ? (portrait ? 0.72 : 1) : 0.001;
      timeline.to(system.current.scale, { x: scale, y: scale, z: scale }, at);
      timeline.to(
        system.current.position,
        { x: 0, y: active && portrait ? 0.7 : 0, z: active ? 0 : -4.5 },
        at,
      );
      timeline.to(system.current.rotation, { y: active ? 0.22 : -0.45, z: active ? -0.08 : 0 }, at);
    }

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
        <WorldPlanet present reducedMotion={reducedMotion} />
      </group>

      <group>
        <BranchSegment
          color="#b8f15c"
          end={[0, branchSpineY, branchDepth]}
          segmentRef={(element) => {
            branchTrunk.current = element;
          }}
          radius={0.024}
          start={[0, branchOrigin[1] - 0.48, branchDepth]}
        />
        <BranchSegment
          color="#89bfa8"
          end={[futurePositions[0][0], branchSpineY, branchDepth]}
          segmentRef={(element) => {
            branchRailLeft.current = element;
          }}
          radius={0.019}
          start={[0, branchSpineY, branchDepth]}
        />
        <BranchSegment
          color="#89bfa8"
          end={[futurePositions.at(-1)?.[0] ?? 4.25, branchSpineY, branchDepth]}
          segmentRef={(element) => {
            branchRailRight.current = element;
          }}
          radius={0.019}
          start={[0, branchSpineY, branchDepth]}
        />
        {allScenarioProfiles.map((profile, index) => {
          const target = futurePositions[index];
          return (
            <BranchSegment
              color={profile.accent}
              end={target}
              key={profile.id}
              segmentRef={(element) => {
                branchStems.current[index] = element;
              }}
              radius={0.014}
              start={[target[0], branchSpineY, branchDepth]}
            />
          );
        })}
        <group ref={branchJunctions} scale={0.001}>
          <mesh position={[0, branchSpineY, branchDepth]}>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshBasicMaterial color="#b8f15c" />
          </mesh>
          {allScenarioProfiles.map((profile, index) => (
            <mesh
              key={profile.id}
              position={[futurePositions[index][0], branchSpineY, branchDepth]}
            >
              <sphereGeometry args={[0.032, 14, 14]} />
              <meshBasicMaterial color={profile.accent} />
            </mesh>
          ))}
        </group>
        <mesh ref={branchTrunkHead} scale={0.001}>
          <sphereGeometry args={[0.068, 18, 18]} />
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
            <sphereGeometry args={[0.052, 16, 16]} />
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
            <sphereGeometry args={[0.046, 14, 14]} />
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
          />
        </group>
      ))}

      <group ref={observer} position={[-7.5, -1.6, -4]} scale={0.08}>
        <AlienAstronomer
          observerProgress={observerProgress}
          reducedMotion={reducedMotion}
          state={state}
        />
      </group>

      <group ref={ocularTunnel} position={[0, portrait ? 0.55 : 0, 4.8]} scale={0.001}>
        {[2.05, 2.32, 2.62].map((radius, index) => (
          <mesh key={radius} position={[0, 0, index * -0.08]}>
            <torusGeometry args={[radius, 0.014 - index * 0.002, 8, 128]} />
            <meshBasicMaterial color="#d9efe2" opacity={0.18 - index * 0.035} transparent />
          </mesh>
        ))}
        <group ref={gravitationalLens} scale={0.001}>
          {[2.12, 2.42, 2.78].map((radius, index) => (
            <mesh key={radius} rotation={[0, index * 0.08, index * 0.12]}>
              <torusGeometry args={[radius, 0.018, 8, 128]} />
              <meshBasicMaterial
                color={index === 0 ? '#fff2b0' : '#a997ff'}
                opacity={0.58 - index * 0.1}
                transparent
              />
            </mesh>
          ))}
        </group>
      </group>

      <group ref={system} position={[0, 0, -4.5]} scale={0.001}>
        <SystemScene state={state} />
      </group>
    </group>
  );
}

function CanvasReady({ onReady }: { onReady: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    if (gl.domElement) onReady();
  }, [gl, onReady]);
  return null;
}

export function EarthStage({
  state,
  reducedMotion,
  branchProgress = 0,
  observerProgress = 0,
  className = '',
}: EarthStageProps) {
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
      data-branch-layout="trunk-spine-stems"
      data-branch-animation="scroll-scrubbed"
      data-branch-progress={branchProgress.toFixed(3)}
      data-observer-asset="fab-animated-v3"
      data-observer-motion={reducedMotion ? 'reduced' : 'six-clip-scroll-scrub'}
      data-observer-camera="shoulder-eyepiece-ocular"
      data-observer-progress={observerProgress.toFixed(3)}
      data-world-lifecycle="persistent"
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
          gl={createWebGpuRenderer}
        >
          <ambientLight intensity={0.56} />
          <directionalLight intensity={3.2} position={[4, 2.5, 5]} />
          <directionalLight color="#8db8a4" intensity={1.2} position={[-4, 1, 2]} />
          <pointLight color={profile?.accent ?? '#b8f15c'} intensity={16} position={[-4, -2, 3]} />
          <pointLight color="#ffb15c" intensity={10} position={[2.5, 2, 1]} />
          <Suspense fallback={null}>
            <CanvasReady onReady={() => setWebglReady(true)} />
            <Scene
              branchProgress={branchProgress}
              observerProgress={observerProgress}
              reducedMotion={reducedMotion}
              state={state}
            />
          </Suspense>
        </Canvas>
      </CanvasGuard>
    </div>
  );
}
