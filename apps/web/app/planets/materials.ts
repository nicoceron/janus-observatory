import * as THREE from 'three';
import type { Atmosphere, Layer } from './model';

export type Surface = 'solid' | 'sheen' | 'glow' | 'cloud' | 'beam';
export const surfaces: Surface[] = ['solid', 'sheen', 'glow', 'cloud', 'beam'];

/** Materials for every world. Colour lives in vertex colours, so a handful of programs serve all. */
export function createMaterials(): Record<Surface, THREE.Material> {
  return {
    solid: new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.88,
      metalness: 0.02,
    }),
    sheen: new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.42,
      metalness: 0.18,
    }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    cloud: new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.94,
    }),
    beam: new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  };
}

export function atmosphereMaterial(atmosphere: Atmosphere) {
  return new THREE.ShaderMaterial({
    uniforms: {
      rim: { value: new THREE.Color(atmosphere.rim) },
      haze: { value: new THREE.Color(atmosphere.haze) },
      rimStrength: { value: atmosphere.rimStrength },
      hazeOpacity: { value: atmosphere.hazeOpacity },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-view.xyz);
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 rim;
      uniform vec3 haze;
      uniform float rimStrength;
      uniform float hazeOpacity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
        float edge = pow(1.0 - facing, 2.2) * rimStrength;
        vec3 limb = mix(rim, haze, clamp(hazeOpacity * 2.2, 0.0, 0.85));
        vec3 colour = mix(haze, limb, clamp(edge * 2.0, 0.0, 1.0));
        gl_FragColor = vec4(colour, clamp(hazeOpacity * 0.45 + edge * (0.75 + hazeOpacity), 0.0, 0.92));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

export function disposeLayers(layers: Layer[]) {
  for (const layer of layers) for (const surface of surfaces) layer[surface]?.dispose();
}
