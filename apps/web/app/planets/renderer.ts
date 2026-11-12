import * as THREE from 'three';

const software = new WeakMap<THREE.WebGLRenderer, boolean>();

/**
 * A software rasterizer (SwiftShader, llvmpipe and similar) is the lowest power tier: worlds and
 * bodies draw without instanced props, reflections or idle animation, so scrolling and input
 * stay responsive. Landmark studies are single small models and keep their full detail.
 */
export function lowPower(gl: THREE.WebGLRenderer) {
  let low = software.get(gl);
  if (low === undefined) {
    const context = gl.getContext();
    const info = context.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    low = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
    software.set(gl, low);
  }
  return low;
}

const environments = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();

/**
 * A small studio environment for reflections on glass and metal: a dark sky with a warm key
 * card, a cool rim card and a pale ground bounce, matching the scene's lights. It is drawn once
 * per renderer and prefiltered; nothing is downloaded.
 */
export function studioEnvironment(gl: THREE.WebGLRenderer) {
  let texture = environments.get(gl);
  if (texture) return texture;
  const scene = new THREE.Scene();
  const geometry = new THREE.SphereGeometry(10, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      key: { value: new THREE.Vector3(-6, 7, 4).normalize() },
      rim: { value: new THREE.Vector3(4, 2, -2).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 key;
      uniform vec3 rim;
      varying vec3 vDirection;
      void main() {
        vec3 d = normalize(vDirection);
        float up = d.y * 0.5 + 0.5;
        vec3 colour = mix(vec3(0.05, 0.07, 0.12), vec3(0.34, 0.5, 0.68), smoothstep(0.25, 1.0, up));
        colour += vec3(0.1, 0.11, 0.12) * smoothstep(0.55, 0.0, up);
        colour += vec3(1.0, 0.92, 0.8) * 3.2 * smoothstep(0.86, 0.985, dot(d, key));
        colour += vec3(0.45, 0.85, 0.95) * 1.6 * smoothstep(0.9, 0.99, dot(d, rim));
        gl_FragColor = vec4(colour, 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(geometry, material));
  const generator = new THREE.PMREMGenerator(gl);
  texture = generator.fromScene(scene, 0.03).texture;
  generator.dispose();
  geometry.dispose();
  material.dispose();
  environments.set(gl, texture);
  return texture;
}
