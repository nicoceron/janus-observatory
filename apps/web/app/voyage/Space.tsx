'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import * as THREE from 'three';
import { Planet, presentEarth } from './Planet';
import { ObserverLife } from './ObserverLife';
import { clamp, smooth, type FlightState } from './scroll';
import { worlds } from './worlds';
import { Telescope, telescopeLayout } from './Telescope';
import { WorldSystem, systemNames, type SystemLabels } from './WorldSystem';
import type { SystemPortrait } from '../../lib/system-portrait';
import s from './voyage.module.css';

type Props = {
  systems: SystemPortrait[];
  flight: RefObject<FlightState>;
  reduced: boolean;
  onReady: () => void;
  onFailure: () => void;
};
type Pose = [number, number, number, number];

/** Fully specified poses at every editorial anchor. No accumulated scroll deltas. */
function worldPose(world: number, scene: number, mobile: boolean): Pose {
  const x = mobile ? 0 : 2.6;
  if (scene === 0)
    return world === -1
      ? [mobile ? 0 : 2.95, mobile ? 0.5 : 0.0, 0, mobile ? 1.05 : 2.55]
      : [12, 0, -10, 0];
  if (scene === 1) {
    if (world === -1) return [-9, 0, -8, 0];
    const col = world % 3,
      row = Math.floor(world / 3);
    return [
      mobile ? (col - 1) * 1.45 : 1.3 + col * 1.64,
      mobile ? 2.5 - row * 1.25 : 2.25 - row * 1.5,
      -1,
      0.55 * worlds[world].displayScale,
    ];
  }
  if (scene >= 2 && scene <= 11) {
    const selected = scene - 2;
    const tall = [
      'ecumenopolis',
      'symbiosis',
      'wilderness',
      'reclaimed',
      'fractured',
      'machine-swarm',
    ].includes(worlds[selected].form);
    const terrestrial = ['wilderness', 'reclaimed'].includes(worlds[selected].form);
    return world === selected
      ? [
          x,
          mobile ? (tall ? 1.72 : 2.0) : -0.1,
          0,
          (mobile ? (terrestrial ? 1.02 : 0.96) : terrestrial ? 2.15 : 1.93) *
            worlds[selected].displayScale,
        ]
      : [world < selected ? -7 : 11, ((world % 3) - 1) * 0.5, -9, 0.02];
  }
  if (scene === 12)
    return world === 8 ? [mobile ? 1.8 : 5.1, mobile ? 3.4 : 2.15, -5, 0.32] : [10, 0, -15, 0];
  if (scene === 13) return world === 8 ? [x, mobile ? 1.3 : 0.2, -5, 0.065] : [10, 0, -15, 0];
  if (scene === 14 || scene === 15) return [12, 0, -15, 0];
  return world === -1
    ? [mobile ? 0 : 2.5, mobile ? 1.8 : 0, -4, mobile ? 1.6 : 2.2]
    : [12, 0, -15, 0];
}

function Scene({
  flight,
  systems,
  labels,
  reduced,
  onReady,
}: Omit<Props, 'onFailure'> & { labels: SystemLabels }) {
  const { size, invalidate, gl, camera } = useThree();
  const mobile = size.width < 760;
  const framing = mobile ? 1 : Math.min(1, size.width / size.height / 1.55);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const alien = useRef<THREE.Group>(null);
  const telescope = useRef<THREE.Group>(null);
  const optics = useMemo(() => telescopeLayout(mobile, framing), [mobile, framing]);
  const baseCamera = useMemo(() => new THREE.Vector3(0, 0, 11), []);
  const baseRotation = useMemo(() => new THREE.Quaternion(), []);
  const starGroup = useRef<THREE.Points>(null);
  const progress = useRef(flight.current.progress);
  const elapsed = useRef(0);
  const [expedition, setExpedition] = useState(false);
  const [stagedWorlds, setStagedWorlds] = useState(0);
  const [chapter, setChapter] = useState(Math.round(flight.current.progress));
  const starPositions = useMemo(() => {
    const random = (i: number) => {
      const n = Math.sin(i * 127.1 + 3026) * 43758.5453;
      return n - Math.floor(n);
    };
    const points: number[] = [];
    for (let i = 0; i < 900; i++) {
      const y = random(i * 3) * 2 - 1,
        angle = random(i * 3 + 1) * Math.PI * 2,
        radius = 36 + random(i * 3 + 2) * 24,
        ring = Math.sqrt(1 - y * y);
      points.push(Math.cos(angle) * ring * radius, y * radius, Math.sin(angle) * ring * radius);
    }
    return new Float32Array(points);
  }, []);
  useEffect(() => {
    onReady();
  }, [onReady]);
  useEffect(() => {
    let cancelled = false,
      timer = 0,
      idle = 0,
      count = 0;
    const prepare = () => {
      if (cancelled) return;
      setStagedWorlds(++count);
      if (count < worlds.length) timer = window.setTimeout(schedule, 100);
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function')
        idle = window.requestIdleCallback(prepare, { timeout: 1000 });
      else timer = window.setTimeout(prepare, 80);
    };
    timer = window.setTimeout(schedule, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, []);
  useEffect(() => {
    const frame = () => {
      if (flight.current.progress > 0.02) setExpedition(true);
      setChapter(Math.round(flight.current.progress));
      invalidate();
    };
    frame();
    window.addEventListener('janus:flight', frame);
    return () => window.removeEventListener('janus:flight', frame);
  }, [invalidate, flight]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const target = flight.current.progress;
    progress.current =
      reduced || Math.abs(target - progress.current) > 1.1
        ? target
        : THREE.MathUtils.damp(progress.current, target, 16, dt);
    const p = clamp(progress.current, 0, 16),
      lo = Math.floor(p),
      hi = Math.min(16, lo + 1);
    const blend = reduced ? 0 : smooth(clamp((p - lo - 0.1) / 0.8));
    const aScene = reduced ? Math.round(p) : lo;
    groups.current.forEach((group, index) => {
      if (!group) return;
      const pose = (scene: number): Pose => {
        if (scene === 13 && index === 9)
          return [optics.target.x, optics.target.y, optics.target.z, 0.14];
        const value = worldPose(index - 1, scene, mobile);
        return [value[0] * framing, value[1], value[2], value[3] * framing];
      };
      const a = pose(aScene),
        b = pose(hi);
      group.position.set(
        THREE.MathUtils.lerp(a[0], b[0], blend),
        THREE.MathUtils.lerp(a[1], b[1], blend),
        THREE.MathUtils.lerp(a[2], b[2], blend),
      );
      const scale = THREE.MathUtils.lerp(a[3], b[3], blend);
      group.scale.setScalar(Math.max(0.0001, scale));
      group.visible = scale > 0.025;
      if (!reduced && group.visible && p < 12) {
        group.position.x += flight.current.pointerX * 0.045;
        group.position.y += flight.current.pointerY * 0.035;
      }
    });
    if (alien.current) {
      const amount = reduced
        ? Math.round(p) === 12
          ? 1
          : 0
        : smooth((p - 11.2) / 0.65) * (1 - smooth((p - 12.15) / 0.85));
      alien.current.visible = amount > 0.005;
      alien.current.position.set(
        optics.observerPosition.x,
        optics.observerPosition.y,
        optics.observerPosition.z - (1 - amount) * 6,
      );
      alien.current.scale.setScalar(optics.observerScale * amount);
      alien.current.rotation.y = optics.observerRotation;
    }
    const lens = reduced
      ? Math.round(p) === 13
        ? 1
        : 0
      : smooth((p - 12.12) / 0.78) * (1 - smooth((p - 13.25) / 0.65));
    camera.position.lerpVectors(baseCamera, optics.camera, lens);
    camera.quaternion.slerpQuaternions(baseRotation, optics.orientation, lens);
    if (camera instanceof THREE.PerspectiveCamera) {
      if (lens > 0)
        camera.setViewOffset(
          size.width,
          size.height,
          mobile ? 0 : -size.width * 0.19 * lens,
          mobile ? size.height * 0.25 * lens : 0,
          size.width,
          size.height,
        );
      else if (camera.view?.enabled) camera.clearViewOffset();
    }
    if (telescope.current) {
      telescope.current.visible = p > 11.4 && p < 13.9;
      telescope.current.position.copy(optics.position);
      telescope.current.rotation.copy(optics.rotation);
      telescope.current.scale.setScalar(optics.scale * (reduced ? 1 : smooth((p - 11.4) / 0.5)));
    }
    gl.domElement.setAttribute('data-optical-view', lens > 0.995 ? 'eyepiece' : 'exterior');
    if (!reduced && starGroup.current) {
      elapsed.current += dt;
      starGroup.current.rotation.y = p * 0.013 + elapsed.current * 0.001;
    }
    gl.domElement.setAttribute('data-scene', (reduced ? aScene : p).toFixed(3));
    if (!reduced && flight.current.active) invalidate();
  });
  return (
    <>
      <ambientLight intensity={0.28} />
      <hemisphereLight args={['#d0f0ff', '#314669', 1.35]} />
      <directionalLight position={[-6, 7, 4]} intensity={2.3} color="#fff1d8" />
      <directionalLight position={[4, 2, -2]} intensity={2.0} color="#87dfef" />
      <points ref={starGroup}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#aeb8bf"
          size={0.045}
          transparent
          opacity={0.55}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      {[presentEarth, ...worlds].map((art, i) => (
        <group
          key={art.id}
          ref={(node) => {
            groups.current[i] = node;
          }}
          visible={false}
        >
          {(i === 0 ||
            i <= stagedWorlds ||
            (expedition && (i === chapter - 1 || (chapter >= 12 && chapter <= 13 && i === 9)))) && (
            <Planet art={art} reduced={reduced} mobile={mobile} />
          )}
          {i > 0 && (i <= stagedWorlds || i === chapter - 1) && (
            <WorldSystem
              art={art}
              context={systems[i - 1]}
              chapter={i + 1}
              progress={progress}
              labels={labels}
              reduced={reduced}
              mobile={mobile}
            />
          )}
        </group>
      ))}
      <group ref={alien} visible={false}>
        {expedition && (
          <ObserverLife
            reduced={reduced}
            focusHand={optics.focusHand}
            supportHand={optics.supportHand}
          />
        )}
      </group>
      <group ref={telescope} visible={false}>
        {expedition && <Telescope />}
      </group>
    </>
  );
}

class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error('Janus spatial renderer:', error);
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function Space(props: Props) {
  const labels = useRef<Record<string, HTMLDivElement | null>>({});
  return (
    <SceneBoundary onFailure={props.onFailure}>
      <Canvas
        camera={{ position: [0, 0, 11], fov: 43, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#050709', 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        fallback={<span>The complete story is available below without 3D.</span>}
        style={{ pointerEvents: 'none' }}
      >
        <ContextLifecycle onFailure={props.onFailure} />
        <Suspense fallback={null}>
          <Scene {...props} labels={labels} />
        </Suspense>
      </Canvas>
      <div className={s.systemLabels} aria-hidden="true">
        {props.systems.flatMap((system, i) =>
          [...system.bodies.map((b) => b.body), ...system.features].map((key) => (
            <div
              key={worlds[i].id + ':' + key}
              className={s.systemLabel}
              data-system-label={worlds[i].id + ':' + key}
              ref={(node) => {
                labels.current[worlds[i].id + ':' + key] = node;
              }}
            >
              <span>{systemNames[key]}</span>
            </div>
          )),
        )}
      </div>
    </SceneBoundary>
  );
}

function ContextLifecycle({ onFailure }: { onFailure: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure]);
  return null;
}
