'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { observerClip, placeLimb, type LimbNodes } from './observer-animation';

type Vec = [number, number, number];
const skin = '#83bfaf',
  pale = '#c2e4bf',
  suit = '#315d72',
  cuff = '#d6c9a9',
  scarf = '#df9d5c';
function Facet({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  color = skin,
  radius = 1,
  detail = 0,
  rotation = [0, 0, 0],
}: {
  position?: Vec;
  scale?: Vec;
  color?: string;
  radius?: number;
  detail?: number;
  rotation?: Vec;
}) {
  return (
    <mesh position={position} scale={scale} rotation={rotation}>
      <icosahedronGeometry args={[radius, detail]} />
      <meshStandardMaterial color={color} flatShading roughness={0.93} />
    </mesh>
  );
}
function Bone({ from, to, radius, color }: { from: Vec; to: Vec; radius: number; color: string }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to),
      d = b.clone().sub(a);
    return {
      position: a.add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        d.clone().normalize(),
      ),
      length: d.length(),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius * 0.82, radius, length, 6]} />
      <meshStandardMaterial color={color} flatShading roughness={0.95} />
    </mesh>
  );
}
function headGeometry() {
  const rings = [
    [-0.16, 0.15, 0.17],
    [-0.02, 0.29, 0.26],
    [0.2, 0.42, 0.32],
    [0.46, 0.4, 0.28],
    [0.64, 0.28, 0.18],
    [0.72, 0.09, 0.07],
  ];
  const positions: number[] = [];
  for (let row = 0; row < rings.length - 1; row++)
    for (let side = 0; side < 10; side++) {
      const point = (r: number, s: number) => {
        const [y, x, z] = rings[r],
          a = (s / 10) * Math.PI * 2;
        return [Math.sin(a) * x, y, Math.cos(a) * z];
      };
      const a = point(row, side),
        b = point(row, (side + 1) % 10),
        c = point(row + 1, side),
        d = point(row + 1, (side + 1) % 10);
      positions.push(...a, ...b, ...c, ...b, ...d, ...c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}
function Eye({ side }: { side: number }) {
  return (
    <group position={[side * 0.223, 0.245, 0.261]} rotation={[0, side * 0.38, side * -0.13]}>
      <Facet scale={[0.191, 0.157, 0.07]} color="#73988a" detail={1} />
      <group name={side < 0 ? 'leftBlink' : 'rightBlink'}>
        <Facet position={[0, 0, 0.038]} scale={[0.16, 0.124, 0.036]} color="#dfdfbc" detail={1} />
        <Facet
          position={[0.026, -0.001, 0.069]}
          scale={[0.093, 0.105, 0.018]}
          color="#233a41"
          detail={1}
        />
        <Facet position={[0.004, 0.043, 0.086]} scale={[0.024, 0.024, 0.005]} color="#f8eed0" />
      </group>
      {side === -1 && (
        <mesh position={[0, 0, 0.079]}>
          <ringGeometry args={[0.148, 0.164, 10]} />
          <meshStandardMaterial color="#d2b578" metalness={0.3} roughness={0.5} />
        </mesh>
      )}
      <mesh position={[0, 0.137, 0.023]} rotation={[0, 0, side * -0.09]}>
        <boxGeometry args={[0.24, 0.035, 0.06]} />
        <meshStandardMaterial color="#618677" roughness={1} />
      </mesh>
    </group>
  );
}

/** Unit-length limb meshes are placed by a two-segment rig after the clip updates. */
function Limb({ name, radius, leg = false }: { name: string; radius: number; leg?: boolean }) {
  return (
    <group>
      <mesh name={name + 'Upper'}>
        <cylinderGeometry args={[radius * 0.82, radius, 1, 6]} />
        <meshStandardMaterial color={suit} roughness={0.9} flatShading />
      </mesh>
      <group name={name + 'Joint'}>
        <Facet scale={[radius, radius, radius]} color={cuff} />
      </group>
      <mesh name={name + 'Lower'}>
        <cylinderGeometry args={[radius * 0.65, radius * 0.82, 1, 6]} />
        <meshStandardMaterial color={leg ? '#3c6a7b' : suit} roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

/** A continuous performance with deliberate gestures, planted feet and stable telescope contact. */
export function ObserverLife({
  reduced,
  focusHand,
  supportHand,
}: {
  reduced: boolean;
  focusHand: Vec;
  supportHand: Vec;
}) {
  const root = useRef<THREE.Group>(null),
    torso = useRef<THREE.Group>(null);
  const rig = useRef<{ mixer: THREE.AnimationMixer; free: THREE.Group; limbs: LimbNodes[] } | null>(
    null,
  );
  const geometry = useMemo(() => headGeometry(), []);
  const clip = useMemo(() => observerClip(supportHand), [supportHand]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const model = root.current!;
    const mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
    const limbs = ['rightArm', 'leftArm', 'rightLeg', 'leftLeg'].map((name) => ({
      upper: model.getObjectByName(name + 'Upper') as THREE.Mesh,
      lower: model.getObjectByName(name + 'Lower') as THREE.Mesh,
      joint: model.getObjectByName(name + 'Joint') as THREE.Group,
    }));
    rig.current = { mixer, limbs, free: model.getObjectByName('freeHand') as THREE.Group };
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      rig.current = null;
    };
  }, [clip]);
  const points = useMemo(() => Array.from({ length: 10 }, () => new THREE.Vector3()), []);
  useFrame(({ gl }, delta) => {
    if (!root.current?.parent?.visible || !rig.current || !torso.current) return;
    const { mixer, limbs, free } = rig.current;
    if (reduced) mixer.setTime(4.4);
    else mixer.update(Math.min(delta, 0.05));
    torso.current.updateMatrix();
    const matrix = torso.current.matrix;
    const from = (i: number, x: number, y: number, z: number) =>
      points[i].set(x, y, z).applyMatrix4(matrix);
    placeLimb(
      limbs[0],
      from(0, 0.32, -0.32, 0.01),
      points[1].set(...focusHand),
      points[2].set(0.75, -0.34, 0.65),
      0.53,
      0.64,
    );
    placeLimb(
      limbs[1],
      from(0, -0.32, -0.32, 0),
      free.position,
      points[2].set(-0.84, -0.67, 0.5),
      0.57,
      0.72,
    );
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1;
      placeLimb(
        limbs[i + 2],
        from(0, side * 0.2, -0.9, 0),
        points[1].set(side * 0.25, -1.65, 0.07),
        points[2].set(side * 0.28, -1.28, 0.6),
        0.4,
        0.43,
      );
    }
    gl.domElement.setAttribute('data-observer-time', (mixer.time % 18).toFixed(3));
  });
  return (
    <group ref={root}>
      <Facet position={[0, -1.83, 0.08]} scale={[0.78, 0.16, 0.62]} color="#496e7e" detail={1} />
      <Facet position={[-0.32, -1.78, 0.29]} scale={[0.17, 0.045, 0.12]} color="#91b5a5" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Facet
            position={[side * 0.25, -1.67, 0.17]}
            scale={[0.16, 0.115, 0.24]}
            color="#24414f"
            detail={1}
          />
          <mesh position={[side * 0.25, -1.62, 0.32]}>
            <boxGeometry args={[0.17, 0.033, 0.075]} />
            <meshStandardMaterial color="#cdb78c" />
          </mesh>
        </group>
      ))}
      <Limb name="rightLeg" radius={0.135} leg />
      <Limb name="leftLeg" radius={0.135} leg />
      <group name="chest" ref={torso}>
        <mesh position={[0, -0.63, 0]}>
          <cylinderGeometry args={[0.32, 0.43, 0.91, 7]} />
          <meshStandardMaterial color={suit} flatShading roughness={0.98} />
        </mesh>
        <Facet position={[0, -0.26, 0]} scale={[0.39, 0.25, 0.26]} color={suit} detail={1} />
        <mesh position={[0, -0.65, 0.321]}>
          <boxGeometry args={[0.024, 0.69, 0.018]} />
          <meshStandardMaterial color={cuff} roughness={1} />
        </mesh>
        <mesh position={[-0.205, -0.6, 0.298]} rotation={[0, -0.12, 0]}>
          <boxGeometry args={[0.155, 0.15, 0.024]} />
          <meshStandardMaterial color="#81958d" roughness={1} />
        </mesh>
        <mesh position={[0.14, -0.38, 0.292]}>
          <circleGeometry args={[0.048, 5]} />
          <meshStandardMaterial color={cuff} />
        </mesh>
        <mesh position={[0, -0.12, 0.0]}>
          <cylinderGeometry args={[0.23, 0.25, 0.15, 10]} />
          <meshStandardMaterial color={scarf} flatShading roughness={1} />
        </mesh>
        <group name="scarfTail" position={[-0.15, -0.15, 0.3]} rotation={[0.1, 0, -0.16]}>
          <mesh position={[0, -0.185, 0]}>
            <boxGeometry args={[0.14, 0.37, 0.044]} />
            <meshStandardMaterial color={scarf} roughness={1} />
          </mesh>
        </group>
        <Facet position={[0, -0.47, -0.29]} scale={[0.29, 0.38, 0.16]} color="#254a5a" detail={1} />
        <mesh position={[0, -0.8, 0]}>
          <cylinderGeometry args={[0.395, 0.4, 0.07, 7]} />
          <meshStandardMaterial color="#beaa7b" flatShading />
        </mesh>
        <mesh position={[0.05, -0.8, 0.393]}>
          <boxGeometry args={[0.09, 0.084, 0.025]} />
          <meshStandardMaterial color="#78dfcf" emissive="#3a9e9a" emissiveIntensity={0.45} />
        </mesh>
        {[-1, 1].map((side) => (
          <Facet
            key={side}
            position={[side * 0.34, -0.27, 0]}
            scale={[0.16, 0.09, 0.24]}
            color="#c9b383"
          />
        ))}
        <group name="head">
          <group position={[0.105, 0, 0.015]} rotation={[0, 0.04, 0]}>
            <mesh geometry={geometry}>
              <meshStandardMaterial color={skin} flatShading roughness={0.96} />
            </mesh>
            <Facet position={[0, 0.022, 0.25]} scale={[0.18, 0.085, 0.067]} color={pale} />
            <mesh position={[0, -0.014, 0.303]} rotation={[0, 0, -0.04]}>
              <boxGeometry args={[0.12, 0.013, 0.012]} />
              <meshStandardMaterial color="#5c7e73" roughness={1} />
            </mesh>
            <Eye side={-1} />
            <Eye side={1} />
            {[-1, 1].map((side) => (
              <Facet
                key={side}
                position={[side * 0.435, 0.31, -0.045]}
                scale={[0.25, 0.17, 0.095]}
                rotation={[0, side * 0.2, side * 0.3]}
                color={skin}
              />
            ))}
            <group name="antennae">
              {[-1, 1].map((side) => (
                <group key={side}>
                  <Bone
                    from={[side * 0.19, 0.57, -0.06]}
                    to={[side * 0.28, 0.86, -0.11]}
                    radius={0.028}
                    color="#719688"
                  />
                  <Facet
                    position={[side * 0.28, 0.86, -0.11]}
                    scale={[0.065, 0.095, 0.054]}
                    color={pale}
                  />
                </group>
              ))}
            </group>
          </group>
        </group>
      </group>
      <Limb name="rightArm" radius={0.12} />
      <Limb name="leftArm" radius={0.115} />
      <group name="focusGrip" position={focusHand}>
        <Facet scale={[0.12, 0.092, 0.1]} color={skin} detail={1} />
        {[0, 1, 2].map((i) => (
          <Facet
            key={i}
            position={[0.04, (i - 1) * 0.048, 0.073]}
            scale={[0.09, 0.025, 0.037]}
            color={pale}
          />
        ))}
      </group>
      <group name="freeHand" position={supportHand}>
        <Facet scale={[0.12, 0.09, 0.095]} color={skin} detail={1} />
        {[0, 1, 2].map((i) => (
          <Facet
            key={i}
            position={[(i - 1) * 0.054, 0.095, 0.025]}
            scale={[0.027, 0.09, 0.036]}
            color={pale}
          />
        ))}
        <mesh position={[0, -0.047, 0.085]}>
          <boxGeometry args={[0.12, 0.065, 0.035]} />
          <meshStandardMaterial color="#e1cda2" />
        </mesh>
        <mesh position={[0, -0.044, 0.105]}>
          <boxGeometry args={[0.087, 0.04, 0.013]} />
          <meshStandardMaterial color="#73decd" emissive="#3d9dba" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  );
}
