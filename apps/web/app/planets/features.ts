import * as THREE from 'three';
import { extentOf } from './earth';
import { local, type Tone } from './kit';
import {
  LayerBuilder,
  onOrbit,
  orbitMatrix,
  qualities,
  type Layer,
  type Quality,
  type WorldModel,
} from './model';
import { propFootprint, propHeight, propScale, U } from './props/library';
import { rng } from './random';
import { makeRoute, Props, Traffic } from './scene/collect';
import type { Pick } from './scene/towns';
import { eliteSettlement } from './worlds/s1';
import { machineNode } from './worlds/s9';
import { habitat } from './worlds/s10';

export type Feature = 'asteroids' | 'outer' | 'kuiper' | 'solar';

/** Each scenario's light colour, for station lamps and engines off Earth. */
export const accent: Record<string, Tone> = {
  S1: '#ffb357',
  S2: '#ffd28a',
  S3: '#ffe6a8',
  S5: '#b8fff0',
  S6: '#ffb03a',
  S8: '#ffcf7a',
  S9: '#6ff6ff',
  S10: '#fff1c4',
};

const companies = ['#d0493a', '#3a68d0', '#e0a52e', '#2e9e6e', '#9a4ad0'];
const cells = ['#cc4fbd', '#7d55d8', '#2fbf9c', '#eab846', '#4aa8e8'];

/**
 * How a scenario works the outer system, read from its narrative: the set piece on the main
 * body, the rigs or buildings around it, who stands beside them and what ships carry the work.
 * Table 8 decides only whether a feature appears.
 */
type Kit = {
  /** Mining (asteroids, Kuiper belt). */
  mine: { piece: Pick; rigs: Pick[] };
  /** Settlement (outer planets). */
  settle: { piece: Pick; homes: Pick[] };
  crew: Pick;
  ships: { kinds: string[]; tints: Tone[] };
};

const kits: Record<string, Kit> = {
  S1: {
    mine: {
      piece: ['enforcer', 1, [1, 1], ['#4a4f58']],
      rigs: [
        ['mining-rig', 2, [1, 1], ['#8d9096']],
        ['hab-module', 1, [1, 1]],
        ['surveillance', 1, [1, 1]],
      ],
    },
    settle: {
      piece: ['panopticon', 1, [1.2, 1.2]],
      homes: [
        ['block-tall', 2, [1, 1], ['#9a9ca1']],
        ['hab-dome', 1, [1, 1]],
      ],
    },
    crew: ['sentinel', 1, [1, 1], ['#4a4f58']],
    ships: { kinds: ['ore-hauler', 'shuttle'], tints: ['#8d9096', '#5d6168'] },
  },
  S2: {
    mine: {
      piece: ['excavator', 1, [1, 1], ['#e0a830']],
      rigs: [
        ['mining-rig', 2, [1, 1], companies],
        ['oil-tank', 1, [1, 1]],
        ['hologram', 1, [1, 1]],
      ],
    },
    settle: {
      piece: ['arcology', 1, [1, 1], companies],
      homes: [['hab-dome', 1, [1, 1]]],
    },
    crew: ['mech', 1, [1, 1], companies],
    ships: { kinds: ['ore-hauler', 'cargo-drone'], tints: companies },
  },
  S3: {
    mine: {
      piece: ['lander', 1, [1, 1]],
      rigs: [
        ['mining-rig', 1, [1, 1], ['#e3b84b']],
        ['solar-array', 2, [1, 1]],
        ['hab-dome', 1, [1, 1]],
      ],
    },
    settle: {
      piece: ['garden-spire', 1, [1.15, 1.15]],
      homes: [
        ['pod-house', 2, [1, 1], ['#f6f4ee']],
        ['greenhouse', 1, [1, 1]],
      ],
    },
    crew: ['robot', 1, [1, 1], ['#f2efe6', '#e3b84b']],
    ships: { kinds: ['ore-hauler', 'cargo-drone'], tints: ['#f2efe6', '#e3b84b'] },
  },
  S5: {
    mine: {
      piece: ['bio-spire', 1, [1.1, 1.1], cells],
      rigs: [
        ['bio-pod', 2, [1, 1], cells],
        ['crystal', 1, [1, 1.2]],
        ['bio-tree', 1, [1.2, 1.4]],
      ],
    },
    settle: {
      piece: ['bio-spire', 1, [1.2, 1.2], cells],
      homes: [
        ['bio-pod', 2, [1, 1], cells],
        ['pod-house', 1, [1, 1], ['#efe6f5']],
      ],
    },
    crew: ['enhanced', 1, [1, 1], ['#e9e2f5', '#d9f2ec']],
    ships: { kinds: ['glider'], tints: cells },
  },
  S6: {
    mine: {
      piece: ['nanoforge', 1, [0.6, 0.6]],
      rigs: [
        ['mining-rig', 2, [1, 1], ['#e08a2e']],
        ['robot-arm', 2, [1, 1]],
        ['pressure-tank', 1, [1, 1]],
      ],
    },
    settle: {
      piece: ['reactor', 1, [0.9, 0.9]],
      homes: [['worker-block', 2, [1, 1]]],
    },
    crew: ['spider-bot', 1, [1, 1], ['#e0a830']],
    ships: { kinds: ['ore-hauler', 'cargo-drone'], tints: ['#e0a830', '#8a949e'] },
  },
  S9: {
    mine: {
      piece: ['monolith', 1, [1.1, 1.1]],
      rigs: [
        ['crystal', 2, [1.2, 1.5]],
        ['spire', 1, [0.6, 0.7], ['#1f2230']],
        ['beacon', 1, [1, 1]],
      ],
    },
    settle: {
      piece: ['monolith', 1, [1.2, 1.2]],
      homes: [
        ['spire', 1, [0.7, 0.8], ['#1f2230']],
        ['crystal', 1, [1.2, 1.4]],
      ],
    },
    crew: ['spider-bot', 1, [1, 1], ['#1f2230', '#2a2f42']],
    ships: { kinds: ['cargo-drone'], tints: ['#1f2230', '#2a2f42'] },
  },
  S10: {
    mine: {
      piece: ['seed-ark', 1, [1.1, 1.1]],
      rigs: [
        ['mining-rig', 1, [1, 1], ['#e8e6df']],
        ['solar-array', 2, [1, 1]],
        ['hab-dome', 1, [1, 1]],
      ],
    },
    settle: {
      piece: ['seed-ark', 1, [1.2, 1.2]],
      homes: [
        ['hab-dome', 2, [1, 1]],
        ['greenhouse', 1, [1, 1]],
      ],
    },
    crew: ['robot', 1, [1, 1], ['#e8e6df', '#d6b34f']],
    ships: { kinds: ['ore-hauler', 'cargo-drone'], tints: ['#eef1f4', '#7fbf5a'] },
  },
};

/** Stand a prop on a sphere (centre, radius) along `dir`, sunk a little into the ground. */
function standOn(
  props: Props,
  pick: Pick,
  centre: THREE.Vector3,
  radius: number,
  dir: THREE.Vector3,
  random: () => number,
  size?: number,
) {
  const up = dir.clone().normalize();
  const z = new THREE.Vector3(0, 1, 0).cross(up);
  if (z.lengthSq() < 1e-6) z.set(1, 0, 0);
  z.normalize().applyAxisAngle(up, random() * Math.PI * 2);
  const x = new THREE.Vector3().crossVectors(up, z);
  const [lo, hi] = pick[2] ?? [1, 1];
  // Off Earth, props are drawn at twice the toy scale so they read on a small, distant body.
  const s = (size ?? 2 * (lo + (hi - lo) * random())) * U * propScale(pick[0]);
  const m = new THREE.Matrix4()
    .makeBasis(x, up, z)
    .scale(new THREE.Vector3(s, s, s))
    .setPosition(centre.clone().addScaledVector(up, radius * 0.92));
  const tints = pick[3];
  props.addMatrix(
    pick[0],
    m,
    tints?.length ? tints[Math.floor(random() * tints.length)] : undefined,
  );
}

/** The size, in person units, that makes a set piece's larger extent `reach` model units. */
function pieceSize(pick: Pick, reach: number) {
  const extent = Math.max(propHeight(pick[0]), propFootprint(pick[0]));
  return (reach / U / extent) * (pick[2]?.[0] ?? 1);
}

function choose(picks: Pick[], random: () => number) {
  const total = picks.reduce((n, p) => n + p[1], 0);
  let r = random() * total;
  for (const p of picks) if ((r -= p[1]) <= 0) return p;
  return picks[picks.length - 1];
}

/** Directions over the camera-facing cap of a body, spread so props do not stack. */
function cap(count: number, random: () => number, tilt = 0.75) {
  const dirs: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + random() * 0.5;
    const r = tilt * (0.45 + random() * 0.55);
    dirs.push(new THREE.Vector3(Math.cos(a) * r, 1, Math.sin(a) * r * 0.6 + 0.55).normalize());
  }
  return dirs;
}

/** Ships circling the feature on an inclined loop. */
function shipping(traffic: Traffic, kit: Kit, random: () => number, radius: number, loops = 2) {
  for (let k = 0; k < loops; k++) {
    const tilt = orbitMatrix(0.35 + k * 0.5, k * 1.7);
    const loop: THREE.Vector3[] = [];
    const r = radius + k * 0.08;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      loop.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r).applyMatrix4(tilt));
    }
    traffic.add(kit.ships.kinds[k % kit.ships.kinds.length], makeRoute(loop, true), {
      count: 2,
      speed: 0.05,
      size: 2,
      tints: kit.ships.tints,
      pingpong: false,
      random,
    });
  }
}

/** A worked body: its set piece, rigs or homes and crew on the camera-facing cap. */
function settle(
  props: Props,
  kit: Kit,
  mode: 'mine' | 'settle',
  centre: THREE.Vector3,
  radius: number,
  random: () => number,
  reach: number,
  extras: number,
  spread = 0.75,
) {
  const piece = kit[mode].piece;
  const around = mode === 'mine' ? kit.mine.rigs : kit.settle.homes;
  standOn(
    props,
    piece,
    centre,
    radius,
    new THREE.Vector3(0.25, 1, 0.55),
    random,
    pieceSize(piece, reach),
  );
  cap(extras, random, spread).forEach((dir, i) =>
    standOn(props, i % 3 === 2 ? kit.crew : choose(around, random), centre, radius, dir, random),
  );
}

export function buildFeature(feature: Feature, scenario: string, quality: Quality): WorldModel {
  const layers: Layer[] = [];
  const light = accent[scenario] ?? '#ffe6a8';
  const random = rng(feature.length * 31 + scenario.length * 7 + 3);
  // The feature's own bodies are kit models, authored ten times this scale.
  const body = new LayerBuilder('feature', 'surface', 7);
  const { glow } = body;
  const at = (v: THREE.Vector3, rotate?: THREE.Matrix4) => {
    const m = new THREE.Matrix4().makeTranslation(v.x, v.y, v.z);
    return rotate ? m.multiply(rotate) : m;
  };
  const props = new Props(quality.life, quality.furnish !== false);
  const traffic = new Traffic();
  const kit = kits[scenario] ?? kits.S3;
  const life = quality.life;
  if (feature === 'asteroids') {
    // A worked cluster: the main rock carries the set piece; the others carry rigs.
    const rocks: [number, number, number, number][] = [
      [0, -0.05, 0, 0.6],
      [0.95, 0.25, -0.25, 0.32],
      [-0.9, -0.2, 0.05, 0.36],
      [0.35, -0.85, 0.35, 0.24],
      [-0.4, 0.75, -0.35, 0.2],
      [1.05, -0.55, 0.2, 0.15],
    ];
    const models = ['a', 'c', 'b', 'd', 'e', 'f'];
    rocks.forEach(([x, y, z, r], i) => {
      const centre = new THREE.Vector3(x, y, z);
      // Each rock carries its own ore veins.
      body.kit(`sys-asteroid-${models[i]}`, at(centre), 0.1, {
        tint: i % 2 ? '#8a7f72' : '#77706a',
      });
      if (i === 0) settle(props, kit, 'mine', centre, r, random, 0.75, 4, 1.4);
      else if (i < 4)
        standOn(
          props,
          choose(kit.mine.rigs, random),
          centre,
          r,
          new THREE.Vector3(0.2, 1, 0.5),
          random,
        );
    });
    if (life) shipping(traffic, kit, random, 1.15);
  } else if (feature === 'outer') {
    const ring = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.45, 0, 0.2));
    body.kit('sys-gas-giant', new THREE.Matrix4(), 0.1);
    body.kit('sys-rings', ring, 0.1);
    // The settled moon, brought forward so its town faces the reader.
    const moon = new THREE.Vector3(0.95, 0.6, 0.85);
    body.kit('sys-ice-moon', at(moon), 0.1);
    settle(props, kit, 'settle', moon, 0.36, random, 0.45, 3, 1.8);
    glow.box(
      local(new THREE.Matrix4().makeTranslation(moon.x, moon.y, moon.z), 0, 0.3, 0.12),
      0.04,
      0.04,
      0.04,
      light,
    );
    // Orbital settlements ride their own ring around the giant.
    const orbit = new LayerBuilder('settlements', 'orbit', 77, {
      matrix: orbitMatrix(0.3, 0.6),
      motion: { kind: 'spin', speed: 0.03 },
    });
    for (let i = 0; i < 3; i++) {
      const m = onOrbit(1.7, (i / 3) * Math.PI * 2 + 0.4);
      if (scenario === 'S1') eliteSettlement(orbit, m, 0.3);
      else if (scenario === 'S9') machineNode(orbit, m, 0.3);
      else habitat(orbit, m, 0.22);
    }
    layers.push(orbit.finish());
    if (life) shipping(traffic, kit, random, 1.6, 1);
  } else if (feature === 'kuiper') {
    const centre = new THREE.Vector3(0, 0, 0);
    // The body carries its own glowing ice spires.
    body.kit('sys-kuiper-body', new THREE.Matrix4(), 0.1);
    settle(props, kit, 'mine', centre, 0.6, random, 0.7, 4, 1.7);
    if (life) shipping(traffic, kit, random, 1.1, 1);
  } else {
    body.kit('sys-sun', new THREE.Matrix4(), 0.1);
  }
  layers.unshift(body.finish());
  if (feature === 'solar') {
    // Collector swarm: panels with lit seams on several inclined rings, and collector stations.
    for (let r = 0; r < 5; r++) {
      const swarm = new LayerBuilder(`swarm-${r}`, 'orbit', 20 + r, {
        matrix: orbitMatrix(-1.0 + r * 0.5, r * 1.3),
        motion: { kind: 'spin', speed: 0.04 + r * 0.015 },
      });
      const panels = Math.round(22 * quality.density) + 8;
      for (let i = 0; i < panels; i++) {
        const angle = (i / panels) * Math.PI * 2 + random() * 0.1;
        // Collectors face the Sun; their frame's +y points away from it.
        swarm.kit('sys-collector', onOrbit(0.85 + r * 0.13, angle), 0.1);
      }
      for (let k = 0; k < 2; k++)
        machineNode(swarm, onOrbit(0.85 + r * 0.13, k * Math.PI + r), 0.05, true);
      layers.push(swarm.finish());
    }
  }
  const density = quality.density / qualities.story.density;
  return {
    id: `${scenario}:${feature}`,
    layers,
    atmosphere: null,
    facing: 0,
    tilt: 0,
    pitch: 0,
    extent: Math.max(extentOf(layers), 1.25),
    instances: props.finish('surface', { density }),
    movers: traffic.finish(density),
  };
}
