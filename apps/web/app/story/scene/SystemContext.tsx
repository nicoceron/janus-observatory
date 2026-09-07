'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { ShaderMaterial } from 'three';

// Original editorial cutaway, not a physical simulation or observing result.
export function SystemContext() {
  const { scene } = useGLTF('/assets/models/s9-system-cutaway-v1.glb');
  const instance = useMemo(() => scene.clone(true), [scene]);
  const star = useMemo(
    () =>
      new ShaderMaterial({
        toneMapped: false,
        vertexShader: `
          varying vec3 n, p;
          void main() {
            n = normalize(mat3(modelMatrix) * normal);
            p = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 n, p;
          void main() {
            float facing = abs(dot(normalize(n), normalize(cameraPosition - p)));
            vec3 pigment = mix(vec3(0.54, 0.12, 0.025), vec3(1.0, 0.88, 0.64), pow(facing, 0.45));
            gl_FragColor = vec4(pigment, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );
  useEffect(() => () => star.dispose(), [star]);
  return (
    <group rotation={[0.22, -0.55, -0.18]}>
      <primitive object={instance} dispose={null} />
      <mesh>
        <sphereGeometry args={[0.22, 32, 24]} />
        <primitive object={star} attach="material" />
      </mesh>
      <pointLight color="#ffd6a0" intensity={3} distance={3} decay={2} />
    </group>
  );
}
