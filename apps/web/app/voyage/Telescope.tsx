'use client';

import * as THREE from 'three';

/** Shared stage coordinates keep the observer, hands, eyepiece and camera aligned at every size. */
export function telescopeLayout(mobile: boolean, framing: number) {
  const station = new THREE.Vector3(mobile ? 0 : 2.8 * framing, mobile ? 2.2 : 0, 0.1);
  const stationScale = mobile ? 0.78 : 1.28 * framing;
  const position = new THREE.Vector3(0.75, 0.38, 0).multiplyScalar(stationScale).add(station);
  const rotation = new THREE.Euler(-0.1, -1.02, 0),
    quaternion = new THREE.Quaternion().setFromEuler(rotation);
  const scale = stationScale * 0.78;
  const observerPosition = new THREE.Vector3(-0.6, 0.08, 0.3)
    .multiplyScalar(stationScale)
    .add(station);
  const observerRotation = 0.62;
  const handTarget = (local: [number, number, number]) =>
    new THREE.Vector3(...local)
      .multiplyScalar(scale)
      .applyQuaternion(quaternion)
      .add(position)
      .sub(observerPosition)
      .divideScalar(stationScale)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -observerRotation)
      .toArray() as [number, number, number];
  const eye = new THREE.Vector3(0, 0, 1.17)
    .multiplyScalar(scale)
    .applyQuaternion(quaternion)
    .add(position);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
  const camera = eye.clone().addScaledVector(forward, -0.34 * scale);
  const target = eye.clone().addScaledVector(forward, 34);
  const orientation = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(camera, target, new THREE.Vector3(0, 1, 0)),
  );
  return {
    position,
    rotation,
    scale,
    eye,
    forward,
    camera,
    target,
    orientation,
    observerPosition,
    observerScale: stationScale,
    observerRotation,
    focusHand: handTarget([0.31, 0, 0.81]),
    supportHand: handTarget([-0.32, -0.24, 0.7]),
  };
}

const ivory = '#dfd4b6',
  brass = '#b8996d',
  dark = '#344b56';
export function Telescope() {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 1.6, 10, 1, true]} />
        <meshStandardMaterial color={ivory} roughness={0.78} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.247, 0.247, 1.6, 10, 1, true]} />
        <meshStandardMaterial color="#14232a" roughness={1} side={THREE.BackSide} flatShading />
      </mesh>
      {[-0.8, 0.55, 0.8].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.291, 0.291, 0.072, 10, 1, true]} />
          <meshStandardMaterial
            color={z === 0.55 ? dark : brass}
            roughness={0.7}
            side={THREE.DoubleSide}
            flatShading
          />
        </mesh>
      ))}
      {[-0.7, -0.25, 0.2, 0.6].map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <ringGeometry args={[0.202, 0.25, 10]} />
          <meshStandardMaterial color="#18272c" side={THREE.DoubleSide} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.86]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.245, 0.16, 10, 1, true]} />
        <meshStandardMaterial color={dark} flatShading roughness={0.86} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 1.035]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.101, 0.12, 0.26, 10, 1, true]} />
        <meshStandardMaterial color={brass} flatShading roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 1.17]}>
        <ringGeometry args={[0.071, 0.122, 10]} />
        <meshStandardMaterial color={dark} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.36, -0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.048, 0.055, 0.59, 8, 1, true]} />
        <meshStandardMaterial color={dark} roughness={0.8} flatShading side={THREE.DoubleSide} />
      </mesh>
      {[-0.34, 0.05].map((z) => (
        <mesh key={z} position={[0, 0.3, z]}>
          <boxGeometry args={[0.042, 0.14, 0.045]} />
          <meshStandardMaterial color={brass} roughness={0.85} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.33, -0.24, 0]}>
            <boxGeometry args={[0.065, 0.48, 0.19]} />
            <meshStandardMaterial color={dark} roughness={0.85} />
          </mesh>
          <mesh position={[side * 0.35, -0.035, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.084, 0.084, 0.11, 8]} />
            <meshStandardMaterial color={brass} roughness={0.8} flatShading />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.48, 0]}>
        <boxGeometry args={[0.73, 0.095, 0.21]} />
        <meshStandardMaterial color={dark} roughness={0.9} />
      </mesh>
      <mesh position={[0.31, 0, 0.81]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.12, 8]} />
        <meshStandardMaterial color={brass} roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, -0.67, 0]}>
        <cylinderGeometry args={[0.075, 0.09, 0.36, 8]} />
        <meshStandardMaterial color={brass} roughness={0.8} flatShading />
      </mesh>
      {[0, 2.094, 4.189].map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <mesh position={[0, -1.78, 0.4]} rotation={[-0.33, 0, 0]}>
            <boxGeometry args={[0.075, 2.13, 0.09]} />
            <meshStandardMaterial color={ivory} roughness={0.94} />
          </mesh>
          <mesh position={[0, -2.77, 0.74]}>
            <boxGeometry args={[0.13, 0.085, 0.2]} />
            <meshStandardMaterial color={dark} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
