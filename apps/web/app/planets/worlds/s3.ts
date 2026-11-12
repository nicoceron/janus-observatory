import * as THREE from 'three';
import { type EarthBrief } from '../earth';
import { coveredFaces, hazeStrength, satelliteCount } from '../encoding';
import { frame } from '../kit';
import type { LayerBuilder } from '../model';
import { orderedSwarm } from '../orbits';
import type { Tone } from '../kit';
import { propHeight, U } from '../props/library';
import { flights, harbourLoops, rails, roads, seaLanes } from '../scene/network';
import { citizens, earthFlora } from '../scene/presets';
import { farmland, harbour, setPieces } from '../scene/sites';
import { offset, tangents } from '../scene/surface';
import { buildTown, type TownStyle } from '../scene/towns';

/**
 * S3 · Golden Age. "A post-scarcity economy with abundant vital resources. Power is
 * decentralized, Earth remains civilization's hub, and small settlements reach the Moon, Mars,
 * and outer Solar System."
 */
export function gardenTown(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.kit('lm-garden-town', m, s / 10);
}

export function tetherHub(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.kit('lm-tether-hub', m, s / 10);
}

export const s3: EarthBrief = {
  id: 'S3',
  seed: 303,
  facing: -50,
  tilt: 0.3,
  pitch: 0.12,
  relief: 0.055,
  climate: { sea: 0, iceLat: 70, aridity: -0.15, greenery: 0.2 },
  palette: {
    deep: '#155f8f',
    ocean: '#1f7fb0',
    shallows: '#46b7c8',
    shore: '#ecdcae',
    lowland: '#86c35f',
    forest: '#3f9a4d',
    jungle: '#2f8a45',
    upland: '#b4cf78',
    mountain: '#a99f8b',
    peak: '#fbfbf7',
    desert: '#e3cc8e',
    tundra: '#a9b98d',
    ice: '#f4f8fb',
    seaice: '#dcebf2',
  },
  clouds: { count: 34, tone: '#ffffff', speed: 0.014 },
  flora: earthFlora(
    {
      broad: ['#3f9a4d', '#4fa84f', '#5ab04a', '#368f45'],
      conifer: ['#2f7f45', '#2a7040'],
      scrub: ['#7fbf5a', '#8fc86a'],
      flowers: ['#f0a8c8', '#f6d36a', '#ffffff', '#c46ad0', '#ff8a5a'],
    },
    1.2,
  ),
  fauna: {
    herds: [
      { kind: 'deer', biomes: ['forest', 'upland'], count: 16, size: [3, 6] },
      {
        kind: 'horse',
        biomes: ['lowland'],
        count: 8,
        size: [3, 5],
        tints: ['#7a4a2a', '#efe8dc', '#3a2a20'],
      },
      { kind: 'bison', biomes: ['lowland', 'tundra'], count: 5, size: [5, 9], roam: true },
    ],
    flocks: { count: 18 },
    whales: 6,
    fish: { count: 14, tints: ['#f2a03a', '#4fc0d0'] },
  },
  atmosphere: (signals) => ({
    rim: '#8fd0ff',
    rimStrength: 1.05,
    haze: '#dfe9d6',
    hazeOpacity:
      hazeStrength(
        signals.bodies.Earth.industrial_pollution,
        signals.bodies.Earth.contaminated_aerosol,
      ) * 0.12,
    height: 1.035,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const { faces, random } = world;
    // Set pieces: garden spires and a launch site, tended by gardener robots.
    setPieces(
      world,
      [
        ['garden-spire', 1, [1.25, 1.35]],
        ['launch-site', 1, [1.15, 1.2]],
        ['garden-spire', 1, [1.15, 1.25]],
      ],
      4,
      { spacing: 40, escort: ['gardener-bot', 1, [1, 1], ['#7fbf5a', '#e0a830']], escorts: 2 },
    );
    const land = faces.filter((f) => f.land && !['ice', 'peak', 'mountain'].includes(f.biome));
    const bright: Tone[] = [
      '#f2efe6',
      '#e0a830',
      '#4f9fd0',
      '#7fbf5a',
      '#e07aa0',
      '#f6d36a',
      '#ffffff',
    ];

    // Decentralized: every town is the same size and towns keep an even spacing everywhere.
    const garden: TownStyle = {
      layout: 'radial',
      radius: 0.11,
      streets: 4,
      street: { width: 1.3 * U, tone: '#d8cfb4' },
      plaza: {
        radius: 3 * U,
        tone: '#e8e0c8',
        centre: [
          ['fountain', 2, [1.3, 1.6]],
          ['statue', 1, [1.4, 1.6], ['#e3b84b']],
        ],
      },
      lot: { spacing: 2.4 * U },
      core: [
        ['hall', 1, [1, 1.1], ['#f6f4ee']],
        ['solar-house', 3, [1, 1.1]],
        ['greenhouse', 1.2, [0.9, 1.1]],
        ['dome-house', 1, [1, 1.1]],
        ['market', 0.6, [1, 1.1], ['#e0a830', '#7fbf5a', '#4f9fd0']],
        ['spire', 0.7, [0.55, 0.7], ['#f6f4ee', '#e3b84b']],
      ],
      edge: [
        ['solar-house', 3, [1, 1.1]],
        ['house-flat', 2, [1, 1.1], ['#f6f4ee', '#eef2e8']],
        ['dome-house', 1.5, [1, 1.1]],
        ['greenhouse', 1, [0.9, 1.1]],
        ['pod-house', 1.2, [0.9, 1.1], ['#f6f4ee', '#eef2e8']],
        ['bench', 0.6, [1, 1.1]],
      ],
      // Post-scarcity: service robots walk among the citizens.
      people: {
        standing: 6,
        walking: 2,
        kinds: [...citizens.kinds, 'robot', 'gardener-bot'],
        walkers: [...citizens.walkers, 'robot-walk'],
        tints: bright,
      },
      cars: {
        count: 1,
        kinds: ['hover-car', 'bicycle', 'hover-bus'],
        tints: ['#3d6fb5', '#e0a830', '#2e9e6e'],
        speed: 0.003,
      },
      trees: {
        count: 10,
        kinds: ['oak', 'cypress', 'birch', 'flowers', 'bush'],
        tints: ['#4f9a4a', '#3f8f44', '#6aa84f'],
        size: [1, 1.4],
      },
      lamps: 'lamp',
    };
    const sites = world.scatter(
      land.filter((f) => f.elevation < 0.42),
      coveredFaces(earth.surface_modification, faces.length),
      21,
    );
    const towns = sites.map((face) => buildTown(world, face.up, garden));
    if (sites[0])
      gardenTown(
        world.layer('garden-town', 'surface', { landmark: 'garden-town' }),
        world.on(sites[0], random() * 6, 1, -0.001),
        0.12,
      );

    // Orchards and fields close to every town.
    for (const town of towns)
      farmland(
        world,
        town.centre,
        town.radius * 1.9,
        ['#c7d77a', '#a6c86a', '#d8d48a'],
        [
          ['vine', 1, [1.4, 1.4], ['#6aa04a']],
          ['crop', 1, [1.3, 1.3], ['#c9d77a']],
        ],
        0.4,
      );

    const windy = land.filter((f) => ['upland', 'shore', 'tundra'].includes(f.biome) && !f.used);
    world.scatter(windy, Math.round(8 * world.quality.density), 24).forEach((face, i) => {
      face.used = true;
      const layer =
        i === 0 ? world.layer('wind-commons', 'surface', { landmark: 'wind-commons' }) : null;
      const count = 3;
      for (let k = 0; k < count; k++) {
        const dir = offset(face.up, (k / count) * Math.PI * 2, 2.6 * U);
        if (layer)
          layer.kit(
            'turbine',
            frame(world.surface.point(dir, -0.0004), dir, 0.3),
            0.3 / propHeight('turbine'),
          );
        else
          world.props.add(
            'turbine',
            world.surface.point(dir, -0.0004),
            offset(dir, 0.3, 0.01).sub(dir),
            0.8,
          );
      }
    });

    // Shared transit: maglev between neighbouring towns, quiet lanes and the sea.
    const links = roads(world, towns, {
      width: 1.2 * U,
      tone: '#d8cfb4',
      neighbours: 2,
      reach: 0.6,
      traffic: {
        kinds: ['hover-bus', 'hover-car'],
        per: 1,
        speed: 0.008,
        tints: ['#2e9e6e', '#f2efe6', '#e0a830'],
      },
    });
    rails(
      world,
      links.filter((_, i) => i % 2 === 0),
      { tone: '#e3b84b', pylon: 'lamp', train: 'maglev' },
    );
    const ports = towns
      .map((t) => harbour(world, t.centre, { light: random() < 0.3, boats: ['sailboat'] }))
      .filter((p): p is THREE.Vector3 => !!p);
    seaLanes(world, ports, { kinds: ['ferry', 'sailboat'], per: 1, speed: 0.004 });
    harbourLoops(world, ports, { kinds: ['sailboat', 'fishing'], per: 1, speed: 0.004 });
    flights(
      world,
      towns.map((t) => t.centre),
      { kinds: ['airship', 'cargo-drone'], per: 1, speed: 0.01, size: 1.4 },
      3,
      0.1,
    );

    // One tether from the equator to a transfer hub: Earth stays the hub.
    const hub = world.faceAt(0, 8);
    hub.used = true;
    const tether = world.layer('tether', 'surface', { landmark: 'tether' });
    const top = hub.up.clone().multiplyScalar(1.5);
    tether.kit('lm-tether-anchor', world.on(hub), 0.1, { metal: '#e3b84b' });
    tether.sheen.beam(hub.centre, top, 0.009, '#f2d27a', 6);
    tetherHub(tether, frame(top, hub.up), 0.22);
    // Beside the tether: fusion power and a spaceport for the Moon, Mars and the outer system.
    const yard = world
      .around(hub, 14)
      .filter((f) => f.land && !f.used && f.up.angleTo(hub.up) > 0.16);
    if (yard[0]) {
      yard[0].used = true;
      world.props.add('reactor', world.surface.point(yard[0].up, -0.0004), null, 0.9);
    }
    if (yard[1]) {
      yard[1].used = true;
      const east = tangents(yard[1].up).east;
      world.props.add('landing-pad', world.surface.point(yard[1].up, -0.0004), east, 1.6);
      world.props.add('shuttle', world.surface.point(yard[1].up, 0.0006), east, 1, '#f6f4ee');
    }

    orderedSwarm(
      world,
      satelliteCount(earth.satellite_belt),
      [
        { inclination: 0, node: 0, speed: 0.04, radius: 1.2 },
        { inclination: 1.1, node: 0.8, speed: -0.03, radius: 1.26 },
        { inclination: -1.1, node: 2.2, speed: 0.03, radius: 1.32 },
      ],
      { size: 0.009, body: '#f1ede2', wings: '#c89b2e' },
    );
  },
};
