import type { EarthBrief } from '../earth';
import { satelliteCount } from '../encoding';
import { onOrbit, orbitMatrix, satellite } from '../model';
import { flights, harbourLoops, roads, seaLanes } from '../scene/network';
import { cityStyle, earthFlora, villageStyle } from '../scene/presets';
import { farmland, harbour, landNear, settleable } from '../scene/sites';
import { buildTown, type Town } from '../scene/towns';

/** Today's largest cities: real places, drawn as illustrative clusters rather than footprints. */
const cities: [number, number][] = [
  [35.7, 139.7],
  [28.6, 77.2],
  [31.2, 121.5],
  [-23.5, -46.6],
  [19.4, -99.1],
  [30, 31.2],
  [19, 72.8],
  [39.9, 116.4],
  [23.8, 90.4],
  [40.7, -74],
  [24.9, 67],
  [-34.6, -58.4],
  [41, 29],
  [6.5, 3.4],
  [14.6, 121],
  [34, -118.2],
  [55.8, 37.6],
  [48.9, 2.35],
  [51.5, -0.1],
  [-6.2, 106.8],
  [37.6, 127],
  [-26.2, 28],
  [41.9, -87.6],
  [-12, -77],
  [13.8, 100.5],
  [35.7, 51.4],
  [-4.3, 15.3],
  [-33.9, 151.2],
];

export const present: EarthBrief = {
  id: 'present',
  seed: 11,
  facing: 12,
  tilt: 0.36,
  relief: 0.055,
  climate: { sea: 0, iceLat: 71, aridity: 0, greenery: 0 },
  palette: {
    deep: '#1a4f86',
    ocean: '#2468a8',
    shallows: '#3a97c4',
    shore: '#d8c796',
    lowland: '#78a94f',
    forest: '#3f7a3c',
    jungle: '#2f6e37',
    upland: '#9aa162',
    mountain: '#8b7f6d',
    peak: '#f3f4f2',
    desert: '#d9b26a',
    tundra: '#98a283',
    ice: '#eef4f8',
    seaice: '#d5e6ef',
  },
  clouds: { count: 30, tone: '#ffffff', speed: 0.012 },
  flora: earthFlora({
    broad: ['#3f7f3a', '#4f8f3e', '#5a9a44', '#356f34'],
    conifer: ['#2f5f36', '#2a5a33'],
    scrub: ['#6f9a45', '#8aa850'],
    flowers: ['#f0a8c8', '#f6d36a', '#ffffff', '#c46ad0'],
  }),
  fauna: {
    herds: [
      { kind: 'deer', biomes: ['forest', 'upland'], count: 14, size: [3, 6] },
      {
        kind: 'cow',
        biomes: ['lowland'],
        count: 12,
        size: [3, 6],
        tints: ['#efe8dc', '#5a3f2c', '#2a2420'],
      },
      { kind: 'bison', biomes: ['lowland', 'tundra'], count: 4, size: [4, 7], roam: true },
    ],
    flocks: { count: 14 },
    whales: 5,
    fish: { count: 10, tints: ['#f2a03a', '#e6e8ea'] },
  },
  atmosphere: () => ({
    rim: '#8cc8ff',
    rimStrength: 1,
    haze: '#ffffff',
    hazeOpacity: 0,
    height: 1.05,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const towns: Town[] = [];
    const ports = [];
    for (const [lat, lon] of cities) {
      const site = landNear(world, lat, lon);
      if (!site) continue;
      const crowded = towns.some((t) => t.centre.angleTo(site.up) < 0.12);
      const town = buildTown(world, site.up, cityStyle(0.095), crowded ? 0.65 : 1);
      towns.push(town);
      const port = harbour(world, site.up, {
        crane: true,
        light: world.random() < 0.5,
        boats: ['fishing', 'sailboat'],
      });
      if (port) ports.push(port);
    }
    for (const face of world.scatter(settleable(world, ['lowland', 'forest', 'shore']), 40, 7)) {
      const town = buildTown(world, face.up, villageStyle(0.036), 1);
      towns.push(town);
      farmland(
        world,
        face.up,
        0.045,
        ['#c9b65a', '#a8b64a', '#d8c878', '#8fa84a'],
        [
          ['crop', 1, [1.4, 1.4], ['#d8c35a']],
          ['crop', 1, [1.4, 1.4], ['#8fb04a']],
        ],
      );
    }
    roads(world, towns, {
      width: 0.0024,
      tone: '#55585f',
      neighbours: 2,
      reach: 0.45,
      pylons: 'pylon',
      traffic: { kinds: ['truck', 'car', 'van', 'bus'], per: 1, speed: 0.01, size: 1 },
    });
    seaLanes(world, ports, { kinds: ['ship', 'tanker', 'ship'], per: 2, speed: 0.006, size: 1 });
    harbourLoops(world, ports, {
      kinds: ['fishing', 'sailboat', 'ferry'],
      per: 2,
      speed: 0.003,
      size: 1,
    });
    flights(
      world,
      towns.slice(0, 28).map((t) => t.centre),
      { kinds: ['plane'], per: 2, speed: 0.02, size: 0.9 },
      10,
    );

    const orbit = world.layer('satellites', 'orbit', {
      matrix: orbitMatrix(0.9, 0.4),
      motion: { kind: 'spin', speed: 0.05 },
    });
    const count = satelliteCount(earth.satellite_belt);
    for (let i = 0; i < count; i++)
      satellite(
        orbit,
        onOrbit(1.16 + (i % 3) * 0.03, (i / count) * Math.PI * 2, (i % 2) * 0.04),
        0.012,
        '#d6d9de',
        '#2f5d9a',
      );
  },
};
