'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import * as THREE from 'three';
import { presentEarth } from './origin-world';
import {
  LowPolyBody,
  LowPolyWorld,
  lowPower,
  prewarmBody,
  prewarmWorld,
  useWarmShaders,
  WORLD_ENVELOPE,
} from '../planets/LowPoly';
import { presentSignals, type WorldSignals } from '../../lib/world-signals';
import { ObserverLife } from './ObserverLife';
import { smooth, chapterFrame, type FlightState } from './scroll';
import { worlds } from './worlds';
import { Telescope, telescopeLayout } from './Telescope';
import { canvasMetadata } from './canvas-metadata';
import { opticalTravel } from './optical-travel';
import { InspectionScene } from './InspectionScene';
import { systemSelections, type Inspection } from '../planets/explore';
import { systemLayout, screenToScene } from './system-layout';
import { hideSpatialTargets, hideSpatialTarget, placeSpatialTarget } from './spatial-targets';
import { companionReveal, behindEarth } from './companion-reveal';
import type { ViewAdjustment } from './Inspector';
import type { SystemPortrait } from '../../lib/system-portrait';
import s from './voyage.module.css';

type Props = {
  systems: SystemPortrait[];
  signals: WorldSignals[];
  flight: RefObject<FlightState>;
  reduced: boolean;
  onReady: () => void;
  onFailure: () => void;
  inspection: Inspection | null;
  onSelect: (id: string) => void;
  view: ViewAdjustment;
};
type Pose = [number, number, number, number];

/** Fully specified poses at every editorial anchor. No accumulated scroll deltas. */
function worldPose(world: number, scene: number, mobile: boolean): Pose {
  const x = mobile ? 0 : 2.75;
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

    // Individual portrait framing leaves room for each skyline and the explorer controls.
    const [portraitY, portraitScale] = [
      [-0.08, 2.25],
      [0.15, 2.4],
      [0.55, 2.3],
      [0.18, 2.22],
      [0.1, 2.22],
      [0.5, 2.3],
      [0.32, 2.22],
      [0.32, 2.22],
      [0.45, 2.25],
      [0.35, 2.3],
    ][selected];
    return world === selected
      ? [x, mobile ? 2.0 : portraitY, 0, mobile ? (tall ? 1.08 : 1.17) : portraitScale]
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
  signals,
  inspection,
  onSelect,
  view,
  reduced,
  onReady,
}: Omit<Props, 'onFailure'>) {
  const { size, invalidate, gl, camera } = useThree();
  useWarmShaders();
  const mobile = size.width <= 760;
  const layouts = useMemo(
    () => systems.map((system) => systemLayout(size.width, size.height, systemSelections(system))),
    [systems, size],
  );
  const framing = mobile ? 1 : Math.min(1, size.width / size.height / 1.55);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const companions = useRef(new Map<string, THREE.Group>());
  const projected = useMemo(() => new THREE.Vector3(), []);
  const worldScale = useMemo(() => new THREE.Vector3(), []);
  const alien = useRef<THREE.Group>(null);
  const telescope = useRef<THREE.Group>(null);
  const optics = useMemo(() => telescopeLayout(mobile, framing), [mobile, framing]);
  const baseCamera = useMemo(() => new THREE.Vector3(0, 0, 11), []);
  const baseRotation = useMemo(() => new THREE.Quaternion(), []);
  const opticalPath = useMemo(() => {
    const approach = optics.eye.clone().addScaledVector(optics.forward, -0.8 * optics.scale);
    return new THREE.CubicBezierCurve3(
      baseCamera,
      baseCamera.clone().add(new THREE.Vector3(0, 0, -2)),
      approach.clone().addScaledVector(optics.forward, -3 * optics.scale),
      approach,
    );
  }, [baseCamera, optics]);
  const opticalCamera = useMemo(() => new THREE.Vector3(), []);
  const exitCamera = useMemo(
    () => optics.eye.clone().addScaledVector(optics.forward, 2.5 * optics.scale),
    [optics],
  );
  const starGroup = useRef<THREE.Points>(null);
  const elapsed = useRef(0);
  const diagnosticTime = useRef(0);
  const [expedition, setExpedition] = useState(false);
  const [overview, setOverview] = useState(false);
  const [chapter, setChapter] = useState(Math.round(flight.current.progress));
  const starPositions = useMemo(() => {
    const random = (i: number) => {
      const n = Math.sin(i * 127.1 + 3026) * 43758.5453;
      return n - Math.floor(n);
    };
    const points: number[] = [];
    for (let i = 0; i < 1800; i++) {
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
  // Build ahead in idle time: the overview first, then the chapters around the reader.
  useEffect(() => {
    const low = lowPower(gl);
    const quality = low ? 'minimal' : mobile ? 'compact' : 'story';
    const grid = low ? 'minimal' : 'overview';
    if (chapter <= 1) signals.forEach((s, i) => prewarmWorld(worlds[i].id, s, grid));
    for (const next of [chapter, chapter + 1, chapter - 1, chapter + 2]) {
      const i = next - 2;
      if (i < 0 || i >= signals.length) continue;
      prewarmWorld(worlds[i].id, signals[i], quality);
      for (const id of systemSelections(systems[i]).slice(1))
        prewarmBody(
          worlds[i].id,
          signals[i],
          id,
          low ? 'minimal' : mobile ? 'overview' : 'compact',
        );
    }
  }, [chapter, mobile, signals, systems, gl]);
  // On a software rasterizer every drawn frame blocks input until it is rasterized. While an
  // anchor travel scrolls the page, hold the scene and draw once on arrival, so the travel stays
  // interruptible by the next wheel or touch.
  const held = useCallback(
    () =>
      lowPower(gl) &&
      document.querySelector<HTMLElement>('[data-voyage]')?.dataset.anchorTravel === 'moving',
    [gl],
  );
  useEffect(() => {
    const root = document.querySelector('[data-voyage]');
    if (!root || !lowPower(gl)) return;
    const observer = new MutationObserver(() => invalidate());
    observer.observe(root, { attributes: true, attributeFilter: ['data-anchor-travel'] });
    return () => observer.disconnect();
  }, [gl, invalidate]);
  useEffect(() => {
    const frame = () => {
      if (flight.current.progress > 0.02) setExpedition(true);
      setChapter(Math.round(flight.current.progress));
      if (!held()) invalidate();
    };
    frame();
    window.addEventListener('janus:flight', frame);
    return () => window.removeEventListener('janus:flight', frame);
  }, [invalidate, flight, held]);
  useFrame((_, delta) => {
    if (inspection) {
      hideSpatialTargets();
      groups.current.forEach((group) => {
        if (group) group.visible = false;
      });
      if (alien.current) alien.current.visible = false;
      if (telescope.current) telescope.current.visible = false;
      return;
    }
    const dt = Math.min(delta, 0.05);
    const { p, lo, hi, blend: chapterBlend } = chapterFrame(flight.current.progress);
    const needsOverview = p > 0.02 && p < 1.95;
    if (needsOverview !== overview) setOverview(needsOverview);
    const blend = reduced ? 0 : chapterBlend;
    const aScene = reduced ? Math.round(p) : lo;
    const travel = opticalTravel(p);
    groups.current.forEach((group, index) => {
      if (!group) return;
      const pose = (scene: number): Pose => {
        if ((scene === 12 || scene === 13) && index === 9)
          return [optics.target.x, optics.target.y, optics.target.z, scene === 12 ? 0.65 : 2.8];
        if (scene === 16 && index === 0 && flight.current.closingPortrait) {
          const slot = flight.current.closingPortrait;
          const point = screenToScene(slot.x, slot.y, size.height, size.width);
          return [point.x, point.y, 0, (slot.diameter * point.perPixel) / WORLD_ENVELOPE];
        }
        if (scene >= 2 && scene <= 11 && index === scene - 1) {
          const earth = layouts[index - 1][0];
          const point = screenToScene(earth.x, earth.y, size.height, size.width);
          return [point.x, point.y, 0, (earth.diameter * point.perPixel) / WORLD_ENVELOPE];
        }
        const value = worldPose(index - 1, scene, mobile);
        return [value[0] * framing, value[1], value[2], value[3] * framing];
      };
      const a = pose(aScene),
        b = pose(hi);
      const handoff = lo >= 2 && hi <= 11 && (index === lo - 1 || index === hi - 1);
      const arc = handoff ? Math.sin(blend * Math.PI) : 0;
      group.position.set(
        THREE.MathUtils.lerp(a[0], b[0], blend),
        THREE.MathUtils.lerp(a[1], b[1], blend) + arc * (index === hi - 1 ? 0.22 : -0.22),
        THREE.MathUtils.lerp(a[2], b[2], blend) - arc * 0.6,
      );
      const scale = THREE.MathUtils.lerp(a[3], b[3], blend);
      group.scale.setScalar(Math.max(0.0001, scale));
      group.visible = scale > 0.025;
    });
    if (alien.current) {
      const amount = reduced ? (Math.round(p) === 12 ? 1 : 0) : smooth((p - 11.2) / 0.65);
      alien.current.visible = amount > 0.005 && p < 12.55;
      alien.current.position.set(
        optics.observerPosition.x - smooth((p - 12) / 0.45) * 4 * optics.observerScale,
        optics.observerPosition.y,
        optics.observerPosition.z - (1 - amount) * 6,
      );
      alien.current.scale.setScalar(optics.observerScale * amount);
      alien.current.rotation.y = optics.observerRotation;
    }
    const lens = reduced ? (Math.round(p) === 13 ? 1 : 0) : travel.enter;
    opticalPath.getPoint(travel.approach, opticalCamera);
    opticalCamera.lerp(exitCamera, travel.through);
    camera.position.lerpVectors(baseCamera, opticalCamera, 1 - travel.leave);
    camera.quaternion.slerpQuaternions(
      baseRotation,
      optics.orientation,
      travel.align * (1 - travel.leave),
    );
    if (camera instanceof THREE.PerspectiveCamera) {
      if (travel.frame > 0)
        camera.setViewOffset(
          size.width,
          size.height,
          mobile ? 0 : -size.width * 0.19 * travel.frame,
          mobile ? size.height * 0.25 * travel.frame : 0,
          size.width,
          size.height,
        );
      else if (camera.view?.enabled) camera.clearViewOffset();
    }
    if (telescope.current) {
      telescope.current.visible = p > 11.4 && p < 12.98;
      telescope.current.position.copy(optics.position);
      telescope.current.rotation.copy(optics.rotation);
      telescope.current.scale.setScalar(optics.scale * (reduced ? 1 : smooth((p - 11.4) / 0.5)));
    }
    canvasMetadata(
      gl.domElement,
      'data-optical-view',
      lens > 0.995 && travel.leave === 0 ? 'eyepiece' : 'exterior',
    );

    if (!reduced && starGroup.current) {
      elapsed.current += dt;
      starGroup.current.rotation.y = p * 0.026 + elapsed.current * 0.0006;
      starGroup.current.rotation.x = Math.sin(p * 0.32) * 0.018;
    }
    camera.updateMatrixWorld();
    // Animate both sides of a chapter handoff, including bodies still hidden behind Earth.
    for (const [key, child] of companions.current) {
      const [worldKey, id] = key.split(':');
      const world = Number(worldKey),
        parent = groups.current[world + 1];
      if (!parent) continue;
      const layout = layouts[world],
        order = layout.findIndex((place) => place.id === id);
      const reveal = companionReveal(p, world + 2, order - 1, reduced);
      child.userData.reveal = reveal;
      child.visible = reveal > 0.00001 && parent.visible;
      if (!child.visible) continue;
      const earth = layout[0],
        place = layout[order];
      const earthPoint = screenToScene(earth.x, earth.y, size.height, size.width);
      const point = screenToScene(place.x, place.y, size.height, size.width, place.z);
      const baseScale = (earth.diameter * earthPoint.perPixel) / WORLD_ENVELOPE;
      let x = (point.x - earthPoint.x) / baseScale;
      let y = (point.y - earthPoint.y) / baseScale;
      let z = point.z / baseScale;
      const time = reduced ? 0 : elapsed.current;
      if (id === 'Moon') {
        const angle = Math.sin(time * 0.025) * 0.32;
        const originalX = x;
        x = x * Math.cos(angle) + z * Math.sin(angle);
        y += Math.sin(angle) * 0.18;
        z = -originalX * Math.sin(angle) + z * Math.cos(angle);
      } else {
        x += Math.sin(time * 0.014) * 0.1;
        y += Math.sin(time * 0.011) * 0.04;
        z += Math.sin(time * 0.012) * 0.14;
      }
      const scale = parent.scale.x;
      const hidden = behindEarth(
        (camera.position.x - parent.position.x) / scale,
        (camera.position.y - parent.position.y) / scale,
        (camera.position.z - parent.position.z) / scale,
      );
      child.position.set(
        THREE.MathUtils.lerp(hidden.x, x, reveal),
        THREE.MathUtils.lerp(hidden.y, y, reveal),
        THREE.MathUtils.lerp(hidden.z, z, reveal),
      );
    }
    const activeWorld = Math.round(p) - 2;
    const parent = groups.current[activeWorld + 1];
    if (
      parent &&
      activeWorld >= 0 &&
      activeWorld < 10 &&
      parent.visible &&
      Math.abs(p - (activeWorld + 2)) < 0.46
    ) {
      hideSpatialTargets(activeWorld);
      const layout = layouts[activeWorld],
        earth = layout[0];
      const earthPosition = screenToScene(earth.x, earth.y, size.height, size.width);
      const baseScale = (earth.diameter * earthPosition.perPixel) / WORLD_ENVELOPE;
      parent.updateWorldMatrix(true, true);
      for (const place of layout) {
        let object: THREE.Group = parent;
        let diameter = WORLD_ENVELOPE;
        if (place.id !== 'Earth') {
          const child = companions.current.get(`${activeWorld}:${place.id}`);
          if (!child) {
            hideSpatialTarget(activeWorld, place.id);
            continue;
          }
          const position = screenToScene(place.x, place.y, size.height, size.width, place.z);
          if (child.userData.reveal < 0.96) {
            hideSpatialTarget(activeWorld, place.id);
            continue;
          }
          child.updateWorldMatrix(true, true);
          object = child;
          diameter = (place.diameter * position.perPixel) / baseScale;
        }
        object.getWorldPosition(projected);
        const depth = projected.z;
        object.getWorldScale(worldScale);
        const pixels =
          (diameter * worldScale.x * size.height) /
          (2 * Math.tan((43 * Math.PI) / 360) * (camera.position.z - depth));
        projected.project(camera);
        if (projected.z > -1 && projected.z < 1)
          placeSpatialTarget(
            activeWorld,
            place.id,
            ((projected.x + 1) * size.width) / 2,
            ((1 - projected.y) * size.height) / 2,
            pixels,
            depth,
          );
      }
    } else hideSpatialTargets();
    if (p > 15.9 && groups.current[0]) {
      projected.copy(groups.current[0].position).project(camera);
      canvasMetadata(
        gl.domElement,
        'data-closing-center',
        JSON.stringify([
          ((projected.x + 1) * size.width) / 2,
          ((1 - projected.y) * size.height) / 2,
        ]),
      );
    } else gl.domElement.removeAttribute('data-closing-center');
    diagnosticTime.current += dt;
    if (reduced || diagnosticTime.current >= 0.1) {
      diagnosticTime.current = 0;
      canvasMetadata(
        gl.domElement,
        'data-optical-travel',
        JSON.stringify({
          ...travel,
          telescopeVisible: telescope.current?.visible,
          camera: camera.position.toArray(),
        }),
      );
      canvasMetadata(gl.domElement, 'data-scene', (reduced ? aScene : p).toFixed(3));
      canvasMetadata(
        gl.domElement,
        'data-companion-reveal',
        JSON.stringify(
          [...companions.current].map(([id, body]) => ({
            id,
            reveal: Number((body.userData.reveal ?? 0).toFixed(4)),
            visible: body.visible,
            position: body.position.toArray(),
            hasEarth:
              (body.parent?.children.length ?? 0) > layouts[Number(id.split(':')[0])].length - 1,
          })),
        ),
      );
      canvasMetadata(
        gl.domElement,
        'data-story-body',
        aScene >= 2 && aScene <= 11 ? 'system' : 'Earth',
      );
    }
    if (!reduced && flight.current.active && !held()) invalidate();
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
          size={1.4}
          transparent
          opacity={0.72}
          sizeAttenuation={false}
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
            overview ||
            chapter === 1 ||
            (expedition &&
              (Math.abs(chapter - (i + 1)) <= 1 ||
                (chapter >= 12 && chapter <= 13 && i === 9)))) && (
            <LowPolyWorld
              live={i === 0 ? chapter === 0 || chapter === 16 : chapter === i + 1}
              eager={i === 0 ? chapter === 0 || chapter === 16 : chapter === i + 1}
              id={i === 0 ? 'present' : art.id}
              signals={i === 0 ? presentSignals : signals[i - 1]}
              reduced={reduced}
              quality={
                i === 0 || chapter === i + 1 || (chapter >= 12 && chapter <= 13 && i === 9)
                  ? mobile
                    ? 'compact'
                    : 'story'
                  : 'overview'
              }
            />
          )}
          {i > 0 &&
            Math.abs(chapter - (i + 1)) <= 1 &&
            !inspection &&
            layouts[i - 1].slice(1).map((place) => {
              const earth = layouts[i - 1][0];
              const earthPoint = screenToScene(earth.x, earth.y, size.height, size.width);
              const point = screenToScene(place.x, place.y, size.height, size.width, place.z);
              const scale = (earth.diameter * earthPoint.perPixel) / WORLD_ENVELOPE;
              return (
                <group
                  key={place.id}
                  ref={(node) => {
                    const key = `${i - 1}:${place.id}`;
                    if (node) companions.current.set(key, node);
                    else companions.current.delete(key);
                  }}
                  visible={false}
                >
                  <LowPolyBody
                    live={chapter === i + 1}
                    eager={chapter === i + 1}
                    scenario={art.id}
                    signals={signals[i - 1]}
                    selection={place.id}
                    reduced={reduced}
                    quality={mobile ? 'overview' : 'compact'}
                    size={(place.diameter * point.perPixel) / scale}
                  />
                </group>
              );
            })}
        </group>
      ))}
      {inspection && (
        <InspectionScene
          key={inspection.world}
          inspection={inspection}
          signals={signals[inspection.world]}
          system={systems[inspection.world]}
          reduced={reduced}
          onSelect={onSelect}
          view={view}
        />
      )}
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
  return (
    <SceneBoundary onFailure={props.onFailure}>
      <Canvas
        className={s.spaceCanvas}
        aria-hidden="true"
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
        style={{ pointerEvents: props.inspection ? 'auto' : 'none' }}
      >
        <ContextLifecycle onFailure={props.onFailure} />
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
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
