'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, Suspense, useEffect, type ReactNode } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { WorldSignals } from '../../lib/world-signals';
import { LowPolyWorld } from '../planets/LowPoly';
import { useReducedMotionPreference } from './MotionPreference';
function Model({
  world,
  signals,
  active,
  reduced,
}: {
  world: number;
  signals: WorldSignals;
  active: boolean;
  reduced: boolean;
}) {
  const { camera, gl, invalidate, size } = useThree();
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    // Keep vertical touch scrolling available through the preview on narrow layouts.
    controls.enableRotate = window.matchMedia('(pointer: fine)').matches;
    controls.listenToKeyEvents(gl.domElement);
    gl.domElement.setAttribute('tabindex', controls.enableRotate ? '0' : '-1');
    gl.domElement.setAttribute('role', 'img');
    gl.domElement.setAttribute(
      'aria-label',
      `Scenario S${world + 1} illustration. ${controls.enableRotate ? 'Drag or use Shift and arrow keys to rotate.' : 'The scenario data follows below.'}`,
    );
    if (!controls.enableRotate) gl.domElement.style.setProperty('touch-action', 'pan-y');
    const wake = () => invalidate();
    controls.addEventListener('change', wake);
    return () => {
      controls.removeEventListener('change', wake);
      controls.dispose();
    };
  }, [camera, gl, invalidate, world]);
  useEffect(() => {
    invalidate();
  }, [active, reduced, world, invalidate]);
  useFrame(() => {
    if (active && !reduced) invalidate();
  });
  return (
    <group scale={2.25}>
      <LowPolyWorld
        key={world}
        id={signals.id}
        signals={signals}
        quality={size.width < 600 ? 'compact' : 'story'}
        reduced={reduced || !active}
      />
    </group>
  );
}
class Boundary extends Component<
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
export default function PortraitCanvas({
  world,
  signals,
  active,
  onFailure,
}: {
  world: number;
  signals: WorldSignals;
  active: boolean;
  onFailure: () => void;
}) {
  const reduced = useReducedMotionPreference();
  return (
    <Boundary onFailure={onFailure}>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 9.5], fov: 43 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        fallback={<span>Explore the scenario description below.</span>}
      >
        <ambientLight intensity={0.28} />
        <hemisphereLight args={['#d0f0ff', '#314669', 1.35]} />
        <directionalLight position={[-6, 7, 4]} intensity={2.3} color="#fff1d8" />
        <directionalLight position={[4, 2, -2]} intensity={2} color="#87dfef" />
        <Suspense fallback={null}>
          <Model world={world} signals={signals} active={active} reduced={reduced} />
        </Suspense>
      </Canvas>
    </Boundary>
  );
}
