'use client';

import { useLoader } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  BackSide,
  Color,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from 'three';
import type { ScenarioProfile } from '../../../lib/canonical-core';
import { worldArtProfiles } from '../world-art';

export type EarthTexturePaths = [day: string, night: string, surface: string];

// One program shared by all eleven globes. Scenario variation is uniform data,
// not eleven generated node graphs. Channels follow the admitted source map.
const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal, vPosition;
void main() {
  vUv = uv;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPosition, 1.0);
}`;
const globeFragment = /* glsl */ `
uniform sampler2D dayMap, nightMap, surfaceMap;
uniform vec3 pigment;
uniform float landMix, lightStrength;
varying vec2 vUv;
varying vec3 vNormal, vPosition;
void main() {
  vec3 n = normalize(vNormal);
  vec3 sun = normalize(vec3(-4.0, 1.4, 1.8));
  vec3 view = normalize(cameraPosition - vPosition);
  float incidence = dot(n, sun);
  vec3 terrain = texture2D(surfaceMap, vUv).rgb;
  float clouds = smoothstep(0.2, 0.95, terrain.b) * 0.88;
  float land = smoothstep(0.22, 0.72, terrain.g);
  vec3 ground = texture2D(dayMap, vUv).rgb;
  float luminance = dot(ground, vec3(0.2126, 0.7152, 0.0722));
  vec3 albedo = mix(ground, pigment * luminance * 1.5, land * landMix);
  albedo = mix(albedo, vec3(0.94, 0.97, 1.0), clouds);
  float daylight = smoothstep(-0.13, 0.2, incidence);
  vec3 lit = albedo * (0.012 + max(incidence, 0.0) * 1.85);
  float specular = pow(max(dot(n, normalize(sun + view)), 0.0), 65.0);
  lit += vec3(1.0, 0.89, 0.72) * specular * (1.0-land) * (1.0-clouds) * daylight * 0.42;
  lit += texture2D(nightMap, vUv).rgb * (1.0-daylight) * (1.0-clouds) * lightStrength;
  float rim = pow(1.0-max(dot(n, view), 0.0), 4.0);
  lit += vec3(0.075, 0.22, 0.39) * rim * daylight * 0.45;
  gl_FragColor = vec4(lit, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const haloFragment = /* glsl */ `
varying vec3 vNormal, vPosition;
void main() {
  vec3 n = normalize(vNormal);
  float facing = abs(dot(n, normalize(cameraPosition-vPosition)));
  float sun = smoothstep(-0.35, 0.65, dot(n, normalize(vec3(-4.0,1.4,1.8))));
  gl_FragColor = vec4(0.19, 0.42, 0.68, pow(1.0-facing, 5.0) * sun * 0.24);
  #include <colorspace_fragment>
}`;

class PlanetTextureLoader extends TextureLoader {
  override load(
    url: string,
    onLoad?: (texture: Texture<HTMLImageElement>) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ) {
    return super.load(
      url,
      (loaded) => {
        if (url.includes('earth-day') || url.includes('earth-night'))
          loaded.colorSpace = SRGBColorSpace;
        onLoad?.(loaded);
      },
      onProgress,
      onError,
    );
  }
}

export function Planet({
  profile,
  texturePaths,
  anisotropy,
  evidenceView = false,
}: {
  profile?: ScenarioProfile;
  texturePaths: EarthTexturePaths;
  anisotropy: number;
  evidenceView?: boolean;
}) {
  const [day, night, surface] = useLoader(PlanetTextureLoader, texturePaths);
  useEffect(() => {
    for (const map of [day, night, surface]) {
      if (map.anisotropy !== anisotropy) {
        map.anisotropy = anisotropy;
        map.needsUpdate = true;
      }
    }
  }, [anisotropy, day, night, surface]);
  const art = profile ? worldArtProfiles[profile.id] : undefined;
  const illumination = profile?.planetary.find(
    ({ body, signatureId }) => body === 'Earth' && signatureId === 'artificial_illumination',
  )?.value;
  // Editorial display transfer, not future geography or a detectability calculation.
  const lightStrength = evidenceView
    ? 0
    : profile
      ? illumination == null || illumination <= 0
        ? 0
        : Math.min(1.4, Math.log10(1 + illumination) * 0.65)
      : 0.65;
  const materials = useMemo(
    () => ({
      globe: new ShaderMaterial({
        vertexShader,
        fragmentShader: globeFragment,
        uniforms: {
          dayMap: { value: day },
          nightMap: { value: night },
          surfaceMap: { value: surface },
          pigment: { value: new Color(art?.surfaceTint ?? '#ffffff') },
          landMix: { value: art?.landMix ?? 0 },
          lightStrength: { value: lightStrength },
        },
      }),
      halo: new ShaderMaterial({
        vertexShader,
        fragmentShader: haloFragment,
        side: BackSide,
        transparent: true,
        depthWrite: false,
      }),
    }),
    [art, day, lightStrength, night, surface],
  );
  useEffect(
    () => () => {
      materials.globe.dispose();
      materials.halo.dispose();
    },
    [materials],
  );
  return (
    <group rotation={[0.08, -0.6, -0.12]}>
      <mesh>
        <sphereGeometry args={[1, 48, 32]} />
        <primitive attach="material" object={materials.globe} />
      </mesh>
      <mesh scale={1.014}>
        <sphereGeometry args={[1, 48, 32]} />
        <primitive attach="material" object={materials.halo} />
      </mesh>
    </group>
  );
}
