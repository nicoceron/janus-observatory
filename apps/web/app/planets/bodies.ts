import * as THREE from 'three';
import type { SignalBody, WorldSignals } from '../../lib/world-signals';
import { claim, extentOf } from './earth';
import { accent } from './features';
import { coveredFaces, hazeStrength, lightShare, satelliteCount } from './encoding';
import { buildFaces, globeGeometry, type Face } from './globe';
import { local, type Tone } from './kit';
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
import { U } from './props/library';
import { makeRoute } from './scene/collect';
import { setPieces, sprinkle } from './scene/sites';
import { offset } from './scene/surface';
import { buildTown, type Pick, type TownStyle } from './scene/towns';
import { fbm, rng } from './random';
import { eliteSettlement } from './worlds/s1';
import { machineNode } from './worlds/s9';
import { habitat } from './worlds/s10';

export type Companion = Exclude<SignalBody, 'Earth'>;
export type { Feature } from './features';
export { buildFeature } from './features';

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
        if (random() < lit) lamp(world, face, light, face.size * 0.025);
      }
      break;
    case 'resort':
    case 'outpost':
    case 'mining':
      for (const face of built.length ? built : [world.faceAt(20, 15)])
        mark(face, style === 'mining' ? '#8a4a30' : '#b9b8b2');
      break;
    case 'bloom':
      for (const face of built) {
        mark(face, random.pick(['#8fd9c8', '#c9a7e8', '#a9e0a0', '#e8b0d8']));
        if (random() < lit * 0.4)
          lamp(world, face, random.pick(['#b8fff0', '#ffb8f0']), face.size * 0.025);
      }
      break;
    case 'terraform':
      for (const face of built.filter((f) => f.land)) {
        if (random() < lit * 0.25)
          lamp(world, face, random.pick(['#b8fff0', '#ffb8f0', '#e8ffa8']), face.size * 0.025);
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
        if (random() < lit * 0.3) lamp(world, face, light, face.size * 0.025);
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
        if (random() < 0.4) lamp(world, face, light, face.size * 0.025);
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

/** Bases drawn twice Earth's toy scale so their life reads on a small, distant body. */
const BODY = 2;
const suits: Tone[] = ['#eef0f2', '#e0a830', '#c9cdd2', '#d0493a', '#4f7fbf'];

type Kit = {
  layout: TownStyle['layout'];
  radius: number;
  core: Pick[];
  edge: Pick[];
  people?: { kinds: string[]; tints: Tone[] };
  rovers?: { kind: string; tints?: Tone[] };
  sites: number;
};

const kits: Partial<Record<Style, Kit>> = {
  grid: {
    layout: 'grid',
    radius: 0.22,
    core: [
      ['block-tall', 3, [1, 1.1]],
      ['hab-dome', 1, [0.8, 1]],
      ['screen', 0.3, [1, 1.1]],
    ],
    edge: [
      ['block', 4, [1, 1.1]],
      ['landing-pad', 0.4, [0.8, 1]],
      ['dish', 0.5, [0.9, 1]],
    ],
    people: { kinds: ['astronaut'], tints: ['#9aa0a6', '#7d8188'] },
    rovers: { kind: 'rover', tints: ['#8d9096'] },
    sites: 2,
  },
  resort: {
    layout: 'camp',
    radius: 0.12,
    core: [
      ['hab-dome', 4, [1.1, 1.3]],
      ['greenhouse', 1, [1, 1.1]],
    ],
    edge: [
      ['hab-module', 2, [1, 1.1]],
      ['landing-pad', 1, [1, 1.1]],
      ['shuttle', 1, [1, 1.1]],
      ['solar-array', 1, [1, 1.1]],
      ['hologram', 0.5, [1, 1.1]],
    ],
    people: { kinds: ['astronaut', 'astronaut', 'robot'], tints: suits },
    rovers: { kind: 'rover', tints: ['#e6e8ea', '#d0493a'] },
    sites: 2,
  },
  outpost: {
    layout: 'camp',
    radius: 0.09,
    core: [['hab-dome', 3, [1, 1.1]]],
    edge: [
      ['hab-module', 3, [1, 1.1]],
      ['solar-array', 2, [1, 1.1]],
      ['dish', 1, [1, 1.1]],
      ['landing-pad', 1, [1, 1]],
      ['lander', 1, [1, 1.1]],
      ['rocket', 0.6, [1, 1.1]],
    ],
    people: { kinds: ['astronaut', 'robot'], tints: suits },
    rovers: { kind: 'rover' },
    sites: 1,
  },
  mining: {
    layout: 'camp',
    radius: 0.11,
    core: [
      ['hab-dome', 2, [1, 1.1]],
      ['warehouse', 1, [1, 1.1]],
    ],
    edge: [
      ['drill', 3, [1, 1.2]],
      ['robot-arm', 1, [1, 1.1]],
      ['lander', 1, [1, 1.1]],
      ['hab-module', 2, [1, 1.1]],
      ['solar-array', 1, [1, 1.1]],
      ['oil-tank', 1, [0.9, 1]],
    ],
    people: { kinds: ['astronaut', 'spider-bot', 'robot'], tints: ['#e0a830', '#eef0f2'] },
    rovers: { kind: 'haul-truck', tints: ['#e0a830'] },
    sites: 2,
  },
  bloom: {
    layout: 'camp',
    radius: 0.12,
    core: [
      ['bio-tower', 2, [1, 1.2]],
      ['hab-dome', 1, [1, 1.1]],
    ],
    edge: [
      ['bio-pod', 3, [1, 1.2]],
      ['bio-tree', 2, [1.2, 1.5]],
      ['bio-shroom', 1, [1.2, 1.5]],
    ],
    people: { kinds: ['enhanced'], tints: ['#e9e2f5', '#d9f2ec'] },
    rovers: { kind: 'glider', tints: ['#d35fc4', '#3cc9a8'] },
    sites: 3,
  },
  terraform: {
    layout: 'radial',
    radius: 0.12,
    core: [
      ['bio-tower', 3, [1, 1.3]],
      ['spire', 1, [0.9, 1.1]],
      ['bio-pod', 2, [1, 1.2]],
    ],
    edge: [
      ['bio-pod', 3, [1, 1.2]],
      ['pod-house', 2, [0.9, 1.1]],
      ['dome-house', 2, [1, 1.1]],
      ['bio-tree', 2, [1.2, 1.6]],
    ],
    people: { kinds: ['enhanced'], tints: ['#e9e2f5', '#d9f2ec'] },
    rovers: { kind: 'glider', tints: ['#d35fc4', '#3cc9a8'] },
    sites: 4,
  },
  industrial: {
    layout: 'grid',
    radius: 0.2,
    core: [
      ['pressure-tank', 3, [1, 1.1]],
      ['cooling-tower', 2, [0.8, 1]],
      ['reactor', 1, [0.7, 0.8]],
      ['worker-block', 2, [1, 1.1]],
    ],
    edge: [
      ['pipe-rack', 2, [1, 1.1]],
      ['crane', 1, [0.9, 1]],
      ['robot-arm', 1.5, [1, 1.1]],
      ['hab-dome', 1, [0.9, 1]],
      ['solar-array', 1, [1, 1.1]],
    ],
    people: { kinds: ['astronaut', 'robot', 'spider-bot'], tints: ['#e08a2e', '#d0702a'] },
    rovers: { kind: 'haul-truck', tints: ['#e0a830', '#8a949e'] },
    sites: 2,
  },
  works: {
    layout: 'camp',
    radius: 0.07,
    core: [['pressure-tank', 2, [1, 1.1]]],
    edge: [
      ['crane', 1, [0.9, 1]],
      ['hab-module', 2, [1, 1.1]],
      ['pipe-rack', 1, [1, 1.1]],
    ],
    people: { kinds: ['astronaut', 'robot'], tints: ['#e08a2e'] },
    sites: 1,
  },
  hatch: {
    layout: 'camp',
    radius: 0.04,
    core: [['bunker-dark', 1, [1.2, 1.4]]],
    edge: [
      ['fence', 2, [1, 1.1], ['#5a5a60']],
      ['turret', 1, [0.9, 1]],
      ['dish', 1, [0.8, 0.9]],
    ],
    people: { kinds: ['astronaut', 'sentinel'], tints: ['#5a5a60'] },
    sites: 1,
  },
  'machine-dark': {
    layout: 'camp',
    radius: 0.1,
    core: [
      ['crystal', 1, [1.4, 1.8]],
      ['spire', 1, [0.9, 1.1], ['#1f2230']],
    ],
    edge: [
      ['crystal', 1, [1, 1.4]],
      ['reactor', 0.6, [0.7, 0.8], ['#2a2f42']],
      ['beacon', 1, [1, 1.1]],
    ],
    people: { kinds: ['spider-bot', 'mech', 'robot'], tints: ['#1f2230', '#2a2f42'] },
    rovers: { kind: 'machine-walker', tints: ['#1f2230', '#2a2f42'] },
    sites: 4,
  },
  'machine-gold': {
    layout: 'camp',
    radius: 0.1,
    core: [
      ['crystal', 1, [1.4, 1.8]],
      ['spire', 1, [0.9, 1.1], ['#5a4728']],
    ],
    edge: [
      ['crystal', 1, [1, 1.4]],
      ['reactor', 0.6, [0.7, 0.8], ['#5a4728']],
      ['beacon', 1, [1, 1.1]],
    ],
    people: { kinds: ['spider-bot', 'mech', 'robot'], tints: ['#3a2f1c', '#5a4728'] },
    rovers: { kind: 'machine-walker', tints: ['#3a2f1c', '#5a4728'] },
    sites: 4,
  },
  'machine-light': {
    layout: 'camp',
    radius: 0.1,
    core: [
      ['hab-dome', 1, [1, 1.2]],
      ['spire', 0.6, [0.9, 1.1], ['#e8e6df']],
    ],
    edge: [
      ['solar-array', 2, [1, 1.1]],
      ['dish', 1, [1, 1.1]],
      ['lander', 0.8, [1, 1.1]],
    ],
    people: { kinds: ['robot', 'spider-bot'], tints: ['#e8e6df', '#d6b34f'] },
    rovers: { kind: 'machine-walker', tints: ['#e8e6df', '#d6b34f'] },
    sites: 4,
  },
};

const companies = ['#d0493a', '#3a68d0', '#e0a52e', '#2e9e6e'];

/**
 * Each station style's set pieces, drawn landmark-sized near the limb of the story view so a
 * small body still reads from the system view: S1's panopticons, S2's resort arcologies and
 * mining machines, S5's bio-spires, S6's nanoforges, S8's guarded hatch, S9's machine monoliths
 * and S10's arks.
 */
const pieces: Partial<Record<Style, { picks: Pick[]; count: number; escort?: Pick }>> = {
  grid: {
    picks: [
      ['panopticon', 1, [1.2, 1.3]],
      ['enforcer', 1, [1, 1.1], ['#4a4f58']],
    ],
    count: 2,
    escort: ['sentinel', 1, [1, 1], ['#4a4f58']],
  },
  resort: {
    picks: [
      ['arcology', 1, [1, 1.1], companies],
      ['launch-site', 1, [1.1, 1.2]],
    ],
    count: 2,
    escort: ['robot', 1, [1, 1], ['#eef0f2']],
  },
  outpost: {
    picks: [
      ['launch-site', 1, [1.05, 1.15]],
      ['lander', 1, [0.9, 1]],
    ],
    count: 2,
    escort: ['robot', 1, [1, 1], suits],
  },
  mining: {
    picks: [
      ['excavator', 1, [1, 1.1], ['#e0a830']],
      ['mining-rig', 1, [1, 1.1], companies],
      ['titan', 1, [1, 1.1], companies],
    ],
    count: 3,
    escort: ['spider-bot', 1, [1, 1], ['#e0a830']],
  },
  bloom: { picks: [['bio-spire', 1, [1.2, 1.3], ['#cc4fbd', '#2fbf9c']]], count: 2 },
  terraform: {
    picks: [
      ['bio-spire', 1, [1.2, 1.3], ['#cc4fbd', '#7d55d8']],
      ['garden-spire', 1, [1.2, 1.3]],
    ],
    count: 3,
    escort: ['enhanced', 1, [1, 1], ['#e9e2f5']],
  },
  industrial: {
    picks: [
      ['nanoforge', 1, [0.85, 0.95]],
      ['titan', 1, [1, 1.1], ['#e08a2e', '#d0702a']],
    ],
    count: 2,
    escort: ['spider-bot', 1, [1, 1], ['#e0a830']],
  },
  works: {
    picks: [
      ['nanoforge', 1, [0.8, 0.9]],
      ['reactor', 1, [0.8, 0.9]],
    ],
    count: 2,
  },
  hatch: {
    picks: [['enforcer', 1, [1, 1.1], ['#2d2a2f']]],
    count: 1,
    escort: ['sentinel', 1, [1, 1], ['#3a3638']],
  },
  'machine-dark': {
    picks: [
      ['monolith', 1, [1.1, 1.2]],
      ['titan', 1, [1, 1.1], ['#1f2230']],
      ['spire', 1, [1.2, 1.3], ['#1f2230']],
    ],
    count: 3,
    escort: ['spider-bot', 1, [1, 1], ['#1f2230']],
  },
  'machine-gold': {
    picks: [
      ['monolith', 1, [1.1, 1.2], ['#3a2f1c']],
      ['titan', 1, [1, 1.1], ['#5a4728']],
      ['spire', 1, [1.2, 1.3], ['#5a4728']],
    ],
    count: 3,
    escort: ['spider-bot', 1, [1, 1], ['#5a4728']],
  },
  'machine-light': {
    picks: [
      ['seed-ark', 1, [1.2, 1.3]],
      ['launch-site', 1, [1.1, 1.2]],
      ['titan', 1, [1, 1.1], ['#e8e6df']],
    ],
    count: 3,
    escort: ['robot', 1, [1, 1], ['#e8e6df', '#d6b34f']],
  },
};

/** Inhabited and working sites on a companion: buildings, walkers in suits and moving vehicles. */
function stations(world: WorldContext, body: Companion, style: Style) {
  const kit = kits[style];
  if (!kit) return;
  const { random } = world;
  const scale = (picks: Pick[]): Pick[] =>
    picks.map(([k, w, size, t]) => [k, w, [(size?.[0] ?? 1) * BODY, (size?.[1] ?? 1) * BODY], t]);
  const facing = new THREE.Vector3(0.3, 0.4, 0.86).normalize();
  const sites = world.faces
    .filter((f) => f.land && f.up.dot(facing) > 0.2)
    .sort((a, b) => b.up.dot(facing) - a.up.dot(facing));
  // Sites may sit on modified ground, so spacing is checked directly rather than by free faces.
  const chosen: Face[] = [];
  for (const face of sites.slice(0, Math.max(40, sites.length >> 1))) {
    if (chosen.length >= kit.sites) break;
    if (random() < 0.5 && chosen.length) continue;
    if (chosen.every((other) => other.up.angleTo(face.up) > 0.42)) chosen.push(face);
  }
  for (const face of chosen) {
    const town = buildTown(world, face.up, {
      layout: kit.layout,
      // Stations spread wider than their kit radius so a few large buildings fit.
      radius: kit.radius * 2.6,
      block: 9 * U * BODY,
      streets: 4,
      street:
        kit.layout === 'camp'
          ? undefined
          : {
              width: 1.4 * U * BODY,
              tone: style === 'terraform' ? '#b9a8d0' : body === 'Mars' ? '#7a4a30' : '#6c6f76',
            },
      plaza: kit.layout === 'camp' ? undefined : { radius: 2.4 * U * BODY, tone: '#8a8d93' },
      lot: { spacing: 2.6 * U * BODY },
      core: scale(kit.core),
      edge: scale(kit.edge),
      people: kit.people
        ? {
            standing: 6,
            walking: 3,
            kinds: kit.people.kinds,
            walkers: kit.people.kinds,
            tints: kit.people.tints,
          }
        : undefined,
    });
    if (kit.rovers && world.quality.life) {
      const loop: THREE.Vector3[] = [];
      for (let i = 0; i < 16; i++)
        loop.push(
          world.surface.point(
            offset(town.centre, (i / 16) * Math.PI * 2, town.radius * 1.15),
            kit.rovers.kind === 'glider' ? 0.03 : 0.001,
          ),
        );
      world.traffic.add(kit.rovers.kind, makeRoute(loop, true), {
        count: 3,
        speed: 0.01,
        size: BODY,
        tints: kit.rovers.tints,
        pingpong: false,
        random,
      });
    }
    if (style === 'terraform')
      sprinkle(
        world,
        town.centre,
        town.radius * 2.2,
        [
          ['bio-tree', 2, [BODY, BODY * 1.3], ['#4fae6a', '#c46ad0']],
          ['oak', 2, [BODY, BODY * 1.4], ['#3f9a5e']],
          ['flowers', 1, [BODY, BODY]],
        ],
        40,
      );
  }
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
  const tilt = body === 'Mars' ? 0.44 : body === 'Venus' ? 0.05 : 0.12;
  // The camera looks at the body along -z after its pose, as for the Earths.
  world.view = new THREE.Vector3(0, 0, 1).applyQuaternion(
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0, tilt)).invert(),
  );
  if (style) furnish(world, body, style, scenario, signals);
  const set = style && pieces[style];
  if (set)
    setPieces(world, set.picks, set.count, {
      spacing: 55,
      reach: 0.6,
      escort: set.escort && [set.escort[0], 1, [BODY, BODY], set.escort[3]],
      escorts: 1,
    });
  if (style) stations(world, body, style);
  // Bodies worked only from orbit carry a station on their own ring.
  if (style === 'orbit') {
    const ring = world.layer('station', 'orbit', {
      matrix: orbitMatrix(0.35, 0.8),
      motion: { kind: 'spin', speed: 0.04 },
    });
    for (let i = 0; i < 3; i++) {
      const m = onOrbit(1.45, (i / 3) * Math.PI * 2 + 0.5);
      if (scenario === 'S1') eliteSettlement(ring, m, 0.32);
      else if (scenario === 'S9') machineNode(ring, m, 0.32);
      else habitat(ring, m, 0.24);
    }
  }
  if (style === 'aerostat' && world.quality.life) {
    const loop: THREE.Vector3[] = [];
    for (let i = 0; i < 24; i++)
      loop.push(
        offset(
          new THREE.Vector3(0.2, 0.3, 0.93).normalize(),
          (i / 24) * Math.PI * 2,
          0.5,
        ).multiplyScalar(1.1),
      );
    world.traffic.add('airship', makeRoute(loop, true), {
      count: 5,
      speed: 0.02,
      size: BODY * 1.4,
      pingpong: false,
      random: world.random,
    });
  }

  // Venus's aerostat era: cloud cities riding the upper atmosphere.
  if (style === 'aerostat')
    for (let i = 0; i < 4; i++) {
      const up = new THREE.Vector3(
        Math.cos(i * 1.6),
        (i - 1.5) * 0.35,
        Math.sin(i * 1.6) + 0.9,
      ).normalize();
      world.props.add(
        'cloud-city',
        up.clone().multiplyScalar(1.1),
        offset(up, i, 0.01).sub(up),
        2.4 - (i % 2) * 0.5,
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
      size: 0.013,
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
    tilt,
    pitch: 0.15,
    extent: extentOf(layers),
    ...world.population(layers),
  };
}
