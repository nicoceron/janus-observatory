import * as THREE from 'three';
import type { WorldSignals } from '../../lib/world-signals';
import { buildEarthWorld, extentOf, type EarthBrief } from './earth';
import { local, type Tone } from './kit';
import { LayerBuilder, type Quality, type WorldModel } from './model';
import { turbine, windmill } from './parts';
import { rng, type Random } from './random';
import { present } from './worlds/present';
import { allocationBlock, eliteSettlement, s1, watchtower } from './worlds/s1';
import { enclave, offshoreRig, pitMine, s2 } from './worlds/s2';
import { gardenTown, s3, tetherHub } from './worlds/s3';
import { camp, relicTower, s4, stoneCircle } from './worlds/s4';
import { bloomSpire, gardenCell, s5, seedPods } from './worlds/s5';
import { hangingRegulator, regulator, s6, thermalStack } from './worlds/s6';
import { radioMast, s7, terraces } from './worlds/s7';
import { bunker, ruin, s8, silentCore } from './worlds/s8';
import { gift, machineNode, s9 } from './worlds/s9';
import { grove, habitat, lightSail, s10 } from './worlds/s10';

export const earthBriefs: Record<string, EarthBrief> = {
  present,
  S1: s1,
  S2: s2,
  S3: s3,
  S4: s4,
  S5: s5,
  S6: s6,
  S7: s7,
  S8: s8,
  S9: s9,
  S10: s10,
};

export function buildWorld(id: string, signals: WorldSignals, quality: Quality): WorldModel {
  const brief = earthBriefs[id];
  if (!brief) throw new Error(`No low-poly world is authored for ${id}.`);
  return buildEarthWorld(brief, signals, quality);
}

export const worldIds = Object.keys(earthBriefs);

type Study = { build: (layer: LayerBuilder, random: Random) => void; base?: Tone };
const at = () => new THREE.Matrix4();
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Standalone studies for the explorer: each landmark on a small plinth of its own ground. */
const studies: Record<string, Record<string, Study>> = {
  S1: {
    watchtower: { build: (l) => watchtower(l, at(), 1), base: '#8d8f94' },
    'allocation-blocks': {
      build: (l, random) => {
        for (let x = -1; x <= 1; x++)
          for (let z = -1; z <= 1; z++)
            allocationBlock(
              l,
              local(at(), x * 0.34, 0, z * 0.34),
              0.24,
              0.26 + (x === 0 && z === 0 ? 0.2 : 0),
              random() < 0.8,
            );
      },
      base: '#8d8f94',
    },
    'elite-settlement': { build: (l) => eliteSettlement(l, at(), 1) },
  },
  S2: {
    enclave: { build: (l, random) => enclave(l, at(), 1, '#d0493a', 0.8, random), base: '#b39a5c' },
    'pit-mine': { build: (l) => pitMine(l, at(), 1), base: '#d4975a' },
    platform: { build: (l) => offshoreRig(l, at(), 1), base: '#2c5c6a' },
  },
  S3: {
    'garden-town': {
      build: (l, random) => gardenTown(l, at(), 1, 0.8, random, true),
      base: '#86c35f',
    },
    tether: {
      build: (l) => {
        l.sheen.beam(v(0, -1.1, 0), v(0, -0.12, 0), 0.012, '#f2d27a', 6);
        tetherHub(l, at(), 1);
      },
    },
    'wind-commons': {
      build: (l) => {
        for (let k = 0; k < 5; k++)
          turbine(l.solid, local(at(), (k - 2) * 0.32, 0, (k % 2) * 0.22), 0.75);
      },
      base: '#b4cf78',
    },
  },
  S4: {
    camp: { build: (l, random) => camp(l, at(), 1, random, true), base: '#a8b45c' },
    'relic-tower': { build: (l) => relicTower(l, at(), 1), base: '#356f37' },
    'stone-circle': { build: (l) => stoneCircle(l, at(), 1), base: '#a8b45c' },
  },
  S5: {
    'bloom-spire': { build: (l) => bloomSpire(l, at(), 1, '#cc4fbd'), base: '#2fbf9c' },
    'garden-cell': { build: (l) => gardenCell(l, at(), 1, '#96d64a'), base: '#7d55d8' },
    'seed-pods': { build: (l) => seedPods(l, at(), 1), base: '#2fbf9c' },
  },
  S6: {
    regulator: { build: (l) => regulator(l, at(), 1), base: '#4b525b' },
    'thermal-stack': { build: (l) => thermalStack(l, at(), 1), base: '#4b525b' },
    'hanging-regulator': { build: (l) => hangingRegulator(l, at(), 1) },
  },
  S7: {
    windmill: { build: (l) => windmill(l.solid, at(), 1, '#efe6d2', '#8a5a3a'), base: '#95c56c' },
    'radio-mast': { build: (l) => radioMast(l, at(), 1), base: '#95c56c' },
    terraces: { build: (l) => terraces(l, at(), 1), base: '#95c56c' },
  },
  S8: {
    'silent-core': { build: (l) => silentCore(l, at(), 1), base: '#3f3638' },
    bunker: { build: (l) => bunker(l, at(), 1), base: '#6f6560' },
    ruin: { build: (l, random) => ruin(l, at(), 1, random), base: '#6a6560' },
  },
  S9: {
    gift: { build: (l) => gift(l, at(), 1), base: '#86be62' },
    'machine-node': { build: (l) => machineNode(l, at(), 1) },
  },
  S10: {
    'habitat-ring': { build: (l) => habitat(l, at(), 1) },
    departure: { build: (l) => lightSail(l, at(), 1) },
    grove: { build: (l, random) => grove(l, at(), 1, random), base: '#8fd062' },
  },
};

export function landmarkIds(scenario: string) {
  return Object.keys(studies[scenario] ?? {});
}

export function buildLandmark(scenario: string, id: string): WorldModel {
  const study = studies[scenario]?.[id];
  if (!study) throw new Error(`No landmark study ${scenario}:${id}.`);
  const layer = new LayerBuilder(id, 'surface', 17, { landmark: id });
  study.build(layer, rng(id.length * 7 + scenario.length));
  if (study.base) {
    layer.solid.prism(local(at(), 0, -0.07, 0), 0.72, 0.8, 0.07, 7, '#5d5347', study.base);
  }
  const layers = [layer.finish()];
  const box = new THREE.Box3();
  for (const geometry of [
    layers[0].solid,
    layers[0].sheen,
    layers[0].glow,
    layers[0].cloud,
    layers[0].beam,
  ]) {
    if (!geometry) continue;
    geometry.computeBoundingBox();
    box.union(geometry.boundingBox!);
  }
  const size = box.getSize(new THREE.Vector3());
  return {
    id: `${scenario}:${id}`,
    layers,
    atmosphere: null,
    facing: 0,
    tilt: 0,
    pitch: 0,
    extent: extentOf(layers),
    bounds: { centre: box.getCenter(new THREE.Vector3()), size: Math.max(size.x, size.y, size.z) },
    instances: [],
    movers: [],
  };
}
