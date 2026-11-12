import * as THREE from 'three';

const software = new WeakMap<THREE.WebGLRenderer, boolean>();

/** Renderer names that say outright that a CPU is doing the drawing. */
const NAMED_SOFTWARE = /swiftshader|llvmpipe|software|basic render/i;
/**
 * WebKit reports every renderer as "Apple GPU", and some browsers give no name at all. A software
 * rasterizer behind such a name (a virtual machine, a continuous-integration runner) cannot be
 * recognised, so it is measured instead.
 */
const UNNAMED = /^(apple gpu)?$/i;

/** Fill workload: this many full-target layers of a small lit shader, blended. */
const FILL_SIZE = 512;
const FILL_LAYERS = 96;
/**
 * A renderer that needs longer than this for the fill workload (25 million fragments) is treated
 * as a software rasterizer. Measured in WebKit: 1 ms on an Apple M-series GPU; with llvmpipe,
 * 38–47 ms on eight fast cores, 300–490 ms on two and 600–800 ms on one.
 */
export const SLOW_FILL_MS = 20;
/** A single run this slow settles it: no stall on a GPU lasts this long once the shader is built. */
const CONCLUSIVE_FILL_MS = 10 * SLOW_FILL_MS;

type Timer = () => number;

/**
 * Time the fill workload on a throwaway context: the fastest of up to three runs, in
 * milliseconds, or null where there is no WebGL to measure. It stops at the first run that is
 * fast or conclusively slow, so a GPU and a slow software rasterizer each pay for one run; only
 * a result in between is run again, in case a stall caused it.
 */
export function fillTime(canvas: HTMLCanvasElement, now: Timer = () => performance.now()) {
  canvas.width = canvas.height = FILL_SIZE;
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) return null;
  try {
    const shader = (type: number, source: string) => {
      const made = gl.createShader(type)!;
      gl.shaderSource(made, source);
      gl.compileShader(made);
      return made;
    };
    const program = gl.createProgram()!;
    gl.attachShader(
      program,
      shader(
        gl.VERTEX_SHADER,
        'attribute vec2 p; varying vec2 v; void main() { v = p; gl_Position = vec4(p, 0.0, 1.0); }',
      ),
    );
    gl.attachShader(
      program,
      shader(
        gl.FRAGMENT_SHADER,
        `precision mediump float;
        varying vec2 v;
        void main() {
          vec3 n = normalize(vec3(v, 0.6));
          float d = max(dot(n, normalize(vec3(-0.5, 0.6, 0.6))), 0.0);
          float s = pow(max(dot(reflect(vec3(0.0, 0.0, -1.0), n), vec3(0.3, 0.5, 0.8)), 0.0), 16.0);
          gl_FragColor = vec4(vec3(0.004) + d * 0.006 + s * 0.004, 1.0);
        }`,
      ),
    );
    gl.linkProgram(program);
    gl.useProgram(program);
    const quads = new Float32Array(FILL_LAYERS * 12);
    for (let i = 0; i < FILL_LAYERS; i++)
      quads.set([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1], i * 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, quads, gl.STATIC_DRAW);
    const at = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.viewport(0, 0, FILL_SIZE, FILL_SIZE);
    const pixel = new Uint8Array(4);
    // Reading a pixel back makes the browser finish the drawing before the clock is read.
    const run = (layers: number) => {
      const start = now();
      gl.drawArrays(gl.TRIANGLES, 0, layers * 6);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return now() - start;
    };
    // One layer first, so compiling the shader is not timed.
    run(1);
    let fastest = run(FILL_LAYERS);
    for (let i = 1; i < 3 && fastest >= SLOW_FILL_MS && fastest < CONCLUSIVE_FILL_MS; i++)
      fastest = Math.min(fastest, run(FILL_LAYERS));
    return fastest;
  } catch {
    return null;
  } finally {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

let slow: boolean | undefined;

/** Measured once per page: every canvas of a page shares the same rasterizer. */
function slowFill() {
  if (slow === undefined) {
    const time =
      typeof document === 'undefined' ? null : fillTime(document.createElement('canvas'));
    slow = time !== null && time >= SLOW_FILL_MS;
  }
  return slow;
}

/** Whether a renderer of this name is a software rasterizer; `measure` settles an unnamed one. */
export const softwareRenderer = (name: string, measure: () => boolean) =>
  NAMED_SOFTWARE.test(name) || (UNNAMED.test(name.trim()) && measure());

/**
 * A software rasterizer (SwiftShader, llvmpipe and similar) is the lowest power tier: worlds and
 * bodies draw without instanced props, reflections or idle animation, so scrolling and input
 * stay responsive. Landmark studies are single small models and keep their full detail. The
 * canvas reports the tier as `data-power`.
 */
export function lowPower(gl: THREE.WebGLRenderer) {
  let low = software.get(gl);
  if (low === undefined) {
    const context = gl.getContext();
    const info = context.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    low = softwareRenderer(renderer, slowFill);
    software.set(gl, low);
    gl.domElement.setAttribute?.('data-power', low ? 'low' : 'full');
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
