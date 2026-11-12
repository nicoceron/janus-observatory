import * as THREE from 'three';
import type { Atmosphere, Layer } from './model';
import { lowPower, studioEnvironment } from './renderer';

export type Surface = 'solid' | 'sheen' | 'glass' | 'glow' | 'cloud' | 'beam';
export type MaterialSet = Record<Surface, THREE.Material>;
export const surfaces: Surface[] = ['solid', 'sheen', 'glass', 'glow', 'cloud', 'beam'];

/**
 * Materials for every world. Colour lives in vertex colours, so a handful of programs serve all.
 * Geometry carries its own normals: flat for drawn primitives, as authored for kit models.
 */
export function createMaterials(): MaterialSet {
  return {
    glass: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.18,
      metalness: 0.3,
    }),
    solid: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.02,
    }),
    sheen: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.42,
      metalness: 0.18,
      envMapIntensity: 0.55,
    }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    cloud: new THREE.MeshStandardMaterial({
      vertexColors: true,
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

/**
 * Materials for kit props. Models carry their own bevelled normals and baked colour, so these
 * are smooth-shaded; glass and metal pick up the scene's environment.
 */
export function createPropMaterials(): PropMaterialSet {
  const matte = () =>
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
  const light = () => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  return {
    base: matte(),
    tint: matte(),
    glass: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.12,
      metalness: 0.35,
      envMapIntensity: 1.2,
    }),
    metal: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.34,
      metalness: 0.72,
      envMapIntensity: 1.1,
    }),
    glow: light(),
    lit: light(),
    pane: new THREE.MeshStandardMaterial({
      color: '#1b2733',
      roughness: 0.12,
      metalness: 0.35,
      envMapIntensity: 1.2,
    }),
  };
}

/**
 * Give glass, metal and water something to reflect. Software renderers skip it: they draw no
 * props, and an extra texture lookup per pixel is CPU work there.
 */
export function reflect(gl: THREE.WebGLRenderer, world?: MaterialSet, props?: PropMaterialSet) {
  if (lowPower(gl)) return;
  const environment = studioEnvironment(gl);
  const lit = [world?.glass, world?.sheen, props?.glass, props?.metal, props?.pane];
  for (const material of lit) {
    if (!material) continue;
    (material as THREE.MeshStandardMaterial).envMap = environment;
    material.needsUpdate = true;
  }
}

export type PropMaterialSet = Record<
  'base' | 'tint' | 'glass' | 'metal' | 'glow' | 'lit' | 'pane',
  THREE.Material
>;

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
