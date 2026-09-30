import * as THREE from 'three';
import type { SignalBody, WorldSignals } from '../../lib/world-signals';
import { claim, extentOf } from './earth';
import { coveredFaces, hazeStrength, lightShare, satelliteCount } from './encoding';
import { buildFaces, globeGeometry, type Face } from './globe';
import { frame, local, Mesher, type Tone } from './kit';
import {
  onOrbit,
  orbitMatrix,
  WorldContext,
  type Atmosphere,
  type Layer,
  type Quality,
  type WorldModel,
} from './model';
import { orderedSwarm } from './orbits';
import { fbm, rng } from './random';

export type Companion = Exclude<SignalBody, 'Earth'>;
export type Feature = 'asteroids' | 'outer' | 'kuiper' | 'solar';

/**
 * How each scenario's published off-world values are drawn. Styles interpret narrative summaries;
 * extents, light and traffic still come from each body's Table 6 cells.
 */
type Style =
  | 'grid'
  | 'resort'
  | 'outpost'
  | 'mining'
  | 'bloom'
  | 'terraform'
  | 'industrial'
  | 'works'
  | 'hatch'
  | 'machine-dark'
  | 'machine-gold'
  | 'machine-light'
  | 'aerostat'
  | 'orbit';

const styles: Record<string, Partial<Record<Companion, Style>>> = {
  S1: { Moon: 'grid', Mars: 'outpost', Venus: 'orbit' },
  S2: { Moon: 'resort', Mars: 'mining' },
  S3: { Moon: 'outpost', Mars: 'outpost' },
  S5: { Moon: 'bloom', Mars: 'terraform', Venus: 'orbit' },
  S6: { Moon: 'industrial', Mars: 'industrial', Venus: 'works' },
  S8: { Moon: 'hatch' },
  S9: { Moon: 'orbit', Mars: 'machine-dark', Venus: 'machine-gold' },
  S10: { Moon: 'machine-light', Mars: 'machine-light', Venus: 'aerostat' },
};

const accent: Record<string, Tone> = {
  S1: '#ffb357',
  S2: '#ffd28a',
  S3: '#ffe6a8',
  S5: '#b8fff0',
  S6: '#ffb03a',
  S8: '#ffcf7a',
  S9: '#6ff6ff',
  S10: '#fff1c4',
};

function craters(seed: number, count: number) {
  const random = rng(seed);
  return Array.from({ length: count }, () => ({
    centre: new THREE.Vector3(
      random.range(-1, 1),
      random.range(-1, 1),
      random.range(-1, 1),
    ).normalize(),
    radius: random.range(0.08, 0.32),
    depth: random.range(0.25, 0.6),
  }));
}

function crater(v: THREE.Vector3, list: ReturnType<typeof craters>) {
  let h = 0;
  for (const c of list) {
    const d = Math.acos(THREE.MathUtils.clamp(v.dot(c.centre), -1, 1)) / c.radius;
    if (d < 1) h -= c.depth * (1 - d * d);
    else if (d < 1.35) h += c.depth * 0.35 * (1 - (d - 1) / 0.35);
  }
  return h;
}

function surface(body: Companion, style: Style | undefined, detail: number): Face[] {
  if (body === 'Moon') {
    const list = craters(71, 26);
    const faces = buildFaces({
      detail,
      relief: 0.05,
      steps: 5,
      flatten: false,
      height: (v) => 0.35 + crater(v, list) * 0.6 + fbm(v.x, v.y, v.z, 72, 3, 2.5) * 0.25,
    });
    for (const f of faces) {
      const mare = fbm(f.up.x, f.up.y, f.up.z, 73, 2, 1.4) > 0.12;
      f.tone = mare
        ? f.elevation < 0.25
          ? '#6d6f74'
          : '#7b7d82'
        : f.elevation < 0.25
          ? '#9a9b9f'
          : f.elevation > 0.55
            ? '#c3c4c6'
            : '#aeafb2';
    }
    return faces;
  }
  if (body === 'Mars') {
    const terraformed = style === 'terraform';
    const list = craters(91, 14);
    const faces = buildFaces({
      detail,
      relief: 0.06,
      steps: 6,
      flatten: terraformed,
      height: (v) => {
        const olympus =
          Math.max(0, 1 - v.distanceTo(new THREE.Vector3(-0.75, 0.3, 0.58)) / 0.3) * 0.8;
        const canyon = -Math.max(0, 1 - Math.abs(v.y + 0.12) / 0.06) * Math.max(0, v.z) * 0.6;
        const e =
          0.15 -
          v.y * 0.3 +
          fbm(v.x, v.y, v.z, 92, 4, 2) * 0.55 +
          olympus +
          canyon +
          crater(v, list) * 0.3;
        return terraformed ? e - 0.08 : e + 0.3;
      },
    });
    for (const f of faces) {
      const polar = Math.abs(f.lat) > 72;
      if (terraformed) {
        f.tone = polar
          ? '#f2f5f7'
          : !f.land
            ? f.coastal
              ? '#3fa6c4'
              : '#246f9e'
            : f.elevation < 0.3
              ? f.coastal
                ? '#8fc86a'
                : '#4fae6a'
              : f.elevation < 0.55
                ? '#7cb55a'
                : '#b8603f';
      } else
        f.tone = polar
          ? '#f0ece6'
          : f.elevation < 0.35
            ? '#9a4630'
            : f.elevation < 0.6
              ? '#b8583a'
              : f.elevation < 0.85
                ? '#c97a4c'
                : '#d69866';
    }
    return faces;
  }
  const faces = buildFaces({
    detail,
    relief: 0.03,
    steps: 4,
    flatten: true,
    height: (v) => 0.2 + fbm(v.x * 0.5, v.y * 3, v.z * 0.5, 111, 3, 2) * 0.4,
  });
  const bands: Tone[] = ['#ecd8a6', '#dcc08a', '#f2e4c0', '#d2b37a', '#e6cd96'];
  for (const f of faces) {
    const swirl = fbm(f.up.x, f.up.y, f.up.z, 112, 3, 2.2);
    f.tone = bands[Math.abs(Math.floor(f.lat / 11 + swirl * 2.4)) % bands.length];
  }
  return faces;
}

function lamp(world: WorldContext, face: Face, tone: Tone, size = 0.02) {
  world.ground.glow.box(world.within(face), size, size, size, tone);
}

/** Paint and furnish a body's modified faces in a scenario style. */
function furnish(
  world: WorldContext,
  body: Companion,
  style: Style,
  scenario: string,
  signals: WorldSignals,
) {
  const cells = signals.bodies[body];
  const { faces, random } = world;
  const light = accent[scenario] ?? '#ffe6a8';
  const lit = lightShare(cells.artificial_illumination);
  const built = claim(
    faces,
    coveredFaces(cells.surface_modification, faces.length),
    (f) => 2 - f.up.distanceTo(new THREE.Vector3(0.3, 0.4, 0.86).normalize()) + random() * 0.4,
  );
  const mark = (face: Face, tone: Tone) => {
    face.used = true;
    face.tone = tone;
  };
  switch (style) {
    case 'grid':
      for (const face of built) {
        mark(face, '#8a8d93');
        const grid = world.aligned(face);
        for (const [x, z] of [
          [-1, 0],
          [1, 0],
        ])
          world.ground.solid.box(
            local(grid, x * face.size * 0.14, 0, z),
            face.size * 0.2,
            face.size * 0.14,
            face.size * 0.2,
            '#a2a4a9',
            '#686b72',
          );
        if (random() < lit) lamp(world, face, light, face.size * 0.08);
      }
      break;
    case 'resort':
    case 'outpost':
    case 'mining': {
      const sites = built.length ? built : [world.faceAt(20, 15)];
      sites.forEach((face, i) => {
        mark(face, style === 'mining' ? '#8a4a30' : '#b9b8b2');
        const m = world.on(face, random() * 6);
        const s = style === 'resort' ? 0.16 : 0.1;
        world.ground.sheen.dome(m, s * 0.5, '#bfe8f0', 8, 2);
        world.ground.solid.box(local(m, s * 0.7, 0, 0), s * 0.35, s * 0.2, s * 0.25, '#d9d6cc');
        world.ground.sheen.panel(
          local(m, -s * 0.8, s * 0.25, 0, 0, 1, [0.5, 0]),
          s * 0.5,
          s * 0.25,
          '#2f5d9a',
          '#c9cdd2',
        );
        if (style === 'mining' && i === 0)
          world.ground.solid.prism(
            local(m, 0, 0, s * 0.9),
            s * 0.4,
            s * 0.32,
            s * 0.04,
            8,
            '#6a3a26',
            '#4e2a1c',
          );
        if (i === 0 || random() < lit)
          world.ground.glow.dome(local(m, 0, s * 0.02, 0), s * 0.18, light, 6, 1);
      });
      break;
    }
    case 'bloom':
      for (const face of built) {
        mark(face, random.pick(['#8fd9c8', '#c9a7e8', '#a9e0a0', '#e8b0d8']));
        if (world.thin(0.1))
          world.ground.sheen.dome(world.within(face), face.size * 0.25, '#efe6f5', 6, 1, 1.4);
        if (random() < lit * 0.4)
          lamp(world, face, random.pick(['#b8fff0', '#ffb8f0']), face.size * 0.08);
      }
      break;
    case 'terraform':
      for (const face of built.filter((f) => f.land)) {
        if (world.thin(0.08))
          world.ground.sheen.dome(world.within(face), face.size * 0.22, '#efe6f5', 6, 1, 1.5);
        if (random() < lit * 0.25)
          lamp(world, face, random.pick(['#b8fff0', '#ffb8f0', '#e8ffa8']), face.size * 0.08);
      }
      break;
    case 'industrial':
      for (const face of built) {
        mark(
          face,
          random.pick(
            body === 'Mars'
              ? ['#8a6a5c', '#76584c', '#946f5e', '#6b5a55']
              : ['#6f7a86', '#5f6874', '#7d8894'],
          ),
        );
        if (world.thin(0.12))
          world.ground.sheen.prism(
            world.within(face),
            face.size * 0.1,
            face.size * 0.1,
            face.size * 0.2,
            6,
            '#9aa6b1',
          );
        if (random() < lit * 0.3) lamp(world, face, light, face.size * 0.07);
      }
      break;
    case 'works':
      for (const face of built) {
        mark(face, '#5a4034');
        world.ground.solid.box(
          world.aligned(face),
          face.size * 0.4,
          face.size * 0.08,
          face.size * 0.4,
          '#6f7a86',
          '#8a949e',
        );
        if (random() < 0.4) lamp(world, face, light, face.size * 0.08);
      }
      break;
    case 'hatch': {
      const face = built[0] ?? world.faceAt(10, 10);
      mark(face, '#6f6560');
      const m = world.on(face);
      world.ground.solid.prism(m, 0.07, 0.05, 0.02, 6, '#5f5652');
      world.ground.glow.box(local(m, 0, 0.02, 0), 0.04, 0.002, 0.008, light);
      break;
    }
    case 'machine-dark':
    case 'machine-gold':
    case 'machine-light': {
      const palette: Record<string, Tone[]> = {
        'machine-dark': ['#1d2130', '#262b3d', '#303650', '#20263a'],
        'machine-gold': ['#3a2f1c', '#4a3b22', '#2e2618', '#5a4728'],
        'machine-light': ['#e8e6df', '#d6d3ca', '#c7c3b8', '#efece4'],
      };
      const seam: Tone =
        style === 'machine-dark'
          ? random() < 0.5
            ? '#6ff6ff'
            : '#a78bff'
          : style === 'machine-gold'
            ? '#ffc85a'
            : '#fff0c0';
      for (const face of built) {
        mark(face, random.pick(palette[style]));
        if (random() < (style === 'machine-light' ? 0.08 : 0.22)) {
          const [a, b, c] = face.corners.map((p) =>
            p.clone().lerp(face.centre, 0.55).addScaledVector(face.up, 0.002),
          );
          world.ground.glow.tri(a, b, c, seam);
        }
        if (world.thin(0.05))
          world.ground.sheen.gem(
            world.within(face),
            face.size * 0.12,
            face.size * 0.5,
            palette[style][2],
            3,
          );
      }
      break;
    }
    case 'aerostat':
    case 'orbit':
      break;
  }
}

function atmosphereFor(
  body: Companion,
  style: Style | undefined,
  cells: WorldSignals['bodies'][Companion],
): Atmosphere | null {
  const haze = hazeStrength(cells.industrial_pollution, cells.contaminated_aerosol);
  if (body === 'Moon')
    return haze > 0
      ? {
          rim: '#b9b0a0',
          rimStrength: 0.3,
          haze: '#8a8070',
          hazeOpacity: haze * 0.08,
          height: 1.03,
        }
      : null;
  if (body === 'Mars')
    return style === 'terraform'
      ? { rim: '#9fd8ff', rimStrength: 1, haze: '#ffffff', hazeOpacity: 0, height: 1.04 }
      : {
          rim: '#e6a07a',
          rimStrength: 0.55,
          haze: '#a07a5a',
          hazeOpacity: haze * 0.25,
          height: 1.04,
        };
  return {
    rim: '#f3dfae',
    rimStrength: 1.1,
    haze: '#e8d2a0',
    hazeOpacity: 0.04 + haze * 0.1,
    height: 1.04,
  };
}

export function buildCompanion(
  body: Companion,
  scenario: string,
  signals: WorldSignals,
  quality: Quality,
): WorldModel {
  const style = styles[scenario]?.[body];
  const faces = surface(body, style, quality.detail);
  const world = new WorldContext(faces, quality, body.length * 97 + scenario.length * 13);
  const cells = signals.bodies[body];
  if (style) furnish(world, body, style, scenario, signals);

  if (style === 'aerostat')
    for (let i = 0; i < 5; i++) {
      const up = new THREE.Vector3(
        Math.cos(i * 1.3),
        (i - 2) * 0.25,
        Math.sin(i * 1.3) + 0.8,
      ).normalize();
      const m = frame(up.clone().multiplyScalar(1.12), up, i);
      world.ground.sheen.prism(
        local(m, -0.08, 0.04, 0, 0, 1, [0, Math.PI / 2]),
        0.035,
        0.035,
        0.16,
        8,
        '#f1efe7',
      );
      world.ground.solid.box(m, 0.05, 0.02, 0.03, '#c9cdd2');
      world.ground.glow.box(
        local(m, 0, 0.01, 0.016),
        0.03,
        0.006,
        0.002,
        accent[scenario] ?? '#fff1c4',
      );
    }

  const count = satelliteCount(cells.satellite_belt, 0.55);
  const heavy = count > 60;
  orderedSwarm(
    world,
    count,
    heavy
      ? [
          { inclination: 0.1, node: 0, speed: 0.06, radius: 1.3 },
          { inclination: 0.12, node: 1, speed: 0.05, radius: 1.38 },
          { inclination: 0.08, node: 2, speed: 0.045, radius: 1.46 },
        ]
      : [
          { inclination: 0.5, node: 0.5, speed: 0.06, radius: 1.3 },
          { inclination: -0.7, node: 2, speed: -0.05, radius: 1.36 },
        ],
    {
      size: 0.028,
      body: scenario === 'S9' ? '#1f2230' : '#c9cdd2',
      wings: scenario === 'S9' ? '#6ff6ff' : '#34465f',
      light: accent[scenario],
    },
  );

  const layers: Layer[] = [
    { name: 'globe', frame: 'surface', solid: globeGeometry(faces, 5) },
    ...world.finish(),
  ];
  return {
    id: `${scenario}:${body}`,
    layers,
    atmosphere: atmosphereFor(body, style, cells),
    facing: 0,
    tilt: body === 'Mars' ? 0.44 : body === 'Venus' ? 0.05 : 0.12,
    pitch: 0.15,
    extent: extentOf(layers),
  };
}

export function buildFeature(feature: Feature, scenario: string, quality: Quality): WorldModel {
  const layers: Layer[] = [];
  const light = accent[scenario] ?? '#ffe6a8';
  const random = rng(feature.length * 31 + scenario.length);
  const mesh = new Mesher(7);
  const glow = new Mesher(8, 0);
  const sheen = new Mesher(9, 0.02);
  const detail = Math.max(2, Math.round(quality.detail / 4));
  if (feature === 'asteroids') {
    const rocks: [number, number, number, number][] = [
      [0, 0, 0, 0.55],
      [0.8, 0.3, -0.2, 0.3],
      [-0.75, -0.25, 0.1, 0.34],
      [0.3, -0.7, 0.3, 0.22],
      [-0.35, 0.65, -0.3, 0.2],
      [0.95, -0.45, 0.2, 0.14],
    ];
    rocks.forEach(([x, y, z, r], i) => {
      const m = new THREE.Matrix4()
        .makeTranslation(x, y, z)
        .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(i, i * 2, 0)));
      mesh.blob(
        m.clone().scale(new THREE.Vector3(1, 0.75, 0.85)),
        r,
        i % 2 ? '#8a7f72' : '#77706a',
        0.35,
        i + 41,
      );
      if (i < 3) {
        const top = local(m, 0, r * 0.62, 0);
        mesh.prism(top, r * 0.12, r * 0.06, r * 0.5, 4, '#c9b27a');
        mesh.box(local(top, r * 0.15, 0, 0), r * 0.25, r * 0.15, r * 0.2, '#d9d6cc');
        glow.box(local(top, 0, r * 0.5, 0), r * 0.08, r * 0.08, r * 0.08, light);
      }
    });
  } else if (feature === 'outer') {
    const giant = new THREE.IcosahedronGeometry(0.8, detail + 1);
    const p = giant.getAttribute('position');
    const bands: Tone[] = ['#d9b98a', '#c9956a', '#e8d6b0', '#b98a62', '#e2c79a'];
    for (let i = 0; i < p.count; i += 3) {
      const c = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(p, i + k));
      const y = (c[0].y + c[1].y + c[2].y) / 3;
      mesh.tri(
        c[0],
        c[1],
        c[2],
        bands[
          Math.floor((y + 0.8) * 5 + fbm(c[0].x, c[0].y, c[0].z, 5, 2, 3) * 0.8) % bands.length
        ],
      );
    }
    giant.dispose();
    const ring = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.45, 0, 0.2));
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2,
        b = ((i + 1) / 40) * Math.PI * 2;
      const q = (r: number, t: number) =>
        new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r).applyMatrix4(ring);
      mesh.quad(q(1.05, a), q(1.05, b), q(1.45, b), q(1.45, a), i % 2 ? '#cbb59a' : '#b9a488');
      mesh.quad(q(1.45, a), q(1.45, b), q(1.05, b), q(1.05, a), '#a8937a');
    }
    const moon = new THREE.Matrix4().makeTranslation(1.25, 0.55, 0.4);
    mesh.blob(moon, 0.16, '#c9c6bf', 0.15, 3);
    sheen.dome(local(moon, 0, 0.14, 0), 0.06, '#bfe8f0', 6, 1);
    glow.box(local(moon, 0.05, 0.15, 0), 0.03, 0.03, 0.03, light);
  } else if (feature === 'kuiper') {
    mesh.blob(new THREE.Matrix4().scale(new THREE.Vector3(1, 0.85, 0.9)), 0.7, '#cfe0ea', 0.18, 12);
    mesh.blob(
      new THREE.Matrix4().makeTranslation(0.35, 0.25, 0.3).scale(new THREE.Vector3(1, 0.8, 1)),
      0.35,
      '#b9cfdc',
      0.2,
      13,
    );
    const top = frame(new THREE.Vector3(0.08, 0.5, 0.2), new THREE.Vector3(0.1, 1, 0.3));
    sheen.dome(top, 0.14, '#e8edf2', 8, 2);
    mesh.prism(local(top, 0.2, 0, 0), 0.015, 0.01, 0.4, 4, '#9aa0a6');
    mesh.dome(local(top, 0.2, 0.4, 0, 0, 1, [0.6, 0]), 0.08, '#e8edf2', 6, 1, 0.4);
    glow.box(local(top, 0, 0.02, 0.13), 0.06, 0.02, 0.01, light);
  } else {
    const sun = new THREE.IcosahedronGeometry(0.55, 2);
    const p = sun.getAttribute('position');
    const tones: Tone[] = ['#ffd36a', '#ffc24a', '#ffe08a', '#ffb43a'];
    for (let i = 0; i < p.count; i += 3) {
      const c = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(p, i + k));
      glow.tri(c[0], c[1], c[2], tones[(i / 3) % tones.length]);
    }
    sun.dispose();
  }
  layers.push({
    name: 'feature',
    frame: 'surface',
    solid: mesh.triangles ? mesh.geometry() : undefined,
    glow: glow.triangles ? glow.geometry() : undefined,
    sheen: sheen.triangles ? sheen.geometry() : undefined,
  });
  if (feature === 'solar') {
    // Collector swarm: panels on several inclined rings, each turning at its own pace.
    for (let r = 0; r < 4; r++) {
      const swarm = new Mesher(20 + r, 0.02);
      const panels = Math.round(28 * quality.density) + 8;
      for (let i = 0; i < panels; i++) {
        const m = onOrbit(0.9 + r * 0.14, (i / panels) * Math.PI * 2 + random() * 0.1);
        swarm.panel(
          m.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)),
          0.07,
          0.1,
          '#1f2230',
          '#3a3f55',
        );
      }
      layers.push({
        name: `swarm-${r}`,
        frame: 'orbit',
        matrix: orbitMatrix(-0.9 + r * 0.6, r * 1.3),
        motion: { kind: 'spin', speed: 0.05 + r * 0.02 },
        sheen: swarm.geometry(),
      });
    }
  }
  return {
    id: `${scenario}:${feature}`,
    layers,
    atmosphere: null,
    facing: 0,
    tilt: 0,
    pitch: 0,
    extent: extentOf(layers),
  };
}
