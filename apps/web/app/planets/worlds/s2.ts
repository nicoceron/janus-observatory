import * as THREE from 'three';
import { claim, type EarthBrief } from '../earth';
import { coveredFaces, decades, hazeStrength, satelliteCount } from '../encoding';
import type { LayerBuilder } from '../model';
import { chaoticSwarm } from '../orbits';
import { U } from '../props/library';
import { makeRoute } from '../scene/collect';
import { flights, harbourLoops, roads, seaLanes } from '../scene/network';
import { citizens, earthFlora, earthy } from '../scene/presets';
import { furrows, harbour, setPieces, settleable } from '../scene/sites';
import { offset, tangents } from '../scene/surface';
import { buildTown } from '../scene/towns';

/**
 * S2 · Wild West. "Competition for scarce resources is entrenched. The technosphere and
 * biosphere remain in fragile dependency amid climate stress, inequality, and unrest."
 */
const companies = ['#d0493a', '#3a68d0', '#e0a52e', '#2e9e6e', '#9a4ad0', '#e0689a'];

export function enclave(layer: LayerBuilder, m: THREE.Matrix4, s: number, colour: string) {
  layer.kit('lm-enclave', m, s / 10, { tint: colour });
}

export function pitMine(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.kit('lm-pit-mine', m, s / 10);
}

export function offshoreRig(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.kit('lm-offshore-rig', m, s / 10);
}

export const s2: EarthBrief = {
  id: 'S2',
  seed: 202,
  facing: 22,
  tilt: -0.28,
  pitch: 0.25,
  relief: 0.06,
  climate: { sea: 0.08, iceLat: 81, aridity: 0.36, greenery: -0.3 },
  palette: {
    deep: '#22475a',
    ocean: '#2c5c6a',
    shallows: '#4a7f78',
    shore: '#c9a370',
    lowland: '#b39a5c',
    forest: '#6a7a3e',
    jungle: '#58733a',
    upland: '#b88857',
    mountain: '#976746',
    peak: '#d6c1a3',
    desert: '#d4975a',
    tundra: '#a4987a',
    ice: '#e6eaea',
    seaice: '#cdd9dc',
  },
  clouds: { count: 18, tone: '#d9b683', speed: 0.02, size: 0.07, flat: 0.28 },
  flora: earthFlora(
    {
      broad: ['#6a7a3e', '#5e6f36'],
      conifer: ['#4f6a3a'],
      scrub: ['#9a8f5a', '#a89a5c'],
      flowers: ['#e0a830'],
    },
    0.45,
  ),
  fauna: {
    herds: [
      {
        kind: 'cow',
        biomes: ['lowland', 'desert'],
        count: 10,
        size: [6, 10],
        tints: ['#5a3f2c', '#efe8dc'],
      },
    ],
    flocks: { count: 5, tints: ['#3a3d44'] },
    whales: 2,
  },
  atmosphere: (signals) => ({
    rim: '#e7b27a',
    rimStrength: 1,
    haze: '#a57a4c',
    hazeOpacity:
      hazeStrength(
        signals.bodies.Earth.industrial_pollution,
        signals.bodies.Earth.contaminated_aerosol,
      ) * 0.2,
    height: 1.035,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const { faces, random } = world;
    // Set pieces: company titans, a giant excavator and a launch site for the Moon and Mars.
    setPieces(
      world,
      [
        ['titan', 1, [1, 1.1], companies],
        ['excavator', 1, [1, 1.1], ['#e0a830']],
        ['launch-site', 1, [1.15, 1.2]],
        ['titan', 1, [1, 1.1], companies],
      ],
      4,
      { spacing: 40, escort: ['mech', 1, [1, 1], companies], escorts: 1 },
    );
    const land = faces.filter((f) => f.land && f.biome !== 'ice');

    // Rival enclaves first: walled company towns, each in its own colour.
    const seats = world.scatter(
      settleable(world, ['lowland', 'shore', 'desert', 'forest']),
      companies.length,
      26,
    );
    const enclaves = seats.map((seat, i) => {
      const colour = companies[i];
      const town = buildTown(
        world,
        seat.up,
        {
          layout: 'radial',
          radius: 0.15,
          streets: 4,
          street: { width: 1.7 * U, tone: '#55504a' },
          plaza: { radius: 3 * U, tone: '#b9b2a6', centre: [['statue', 1, [1.4, 1.6], [colour]]] },
          lot: { spacing: 2.6 * U },
          core: [
            ['skyscraper', 3, [0.6, 0.75]],
            ['tower', 2, [0.65, 0.8], [colour, '#d9dde2']],
            ['arcology', 1.2, [0.6, 0.7], [colour, '#d9dde2']],
          ],
          edge: [
            ['apartment', 3, [1, 1.1], [colour, '#d9d4c8']],
            ['warehouse', 1, [1, 1.1], ['#a7b0b8']],
            ['hologram', 0.6, [1, 1.1]],
            ['oil-tank', 0.6, [0.8, 1]],
          ],
          rise: (r) => (r < 0.3 ? 1.1 : 1),
          people: { standing: 6, walking: 2, ...citizens, tints: [colour, '#2a2d33', '#e6e8ea'] },
          cars: {
            count: 3,
            kinds: ['hover-car', 'car', 'hover-car', 'van'],
            tints: [colour, '#2a2d33', '#e6e8ea'],
          },
          lamps: 'lamp',
          perimeter: { kind: 'wall', size: 1.1 },
        },
        i === 0 ? 1.15 : 1,
      );
      // Company security at the gates: a mech and an armed guard.
      for (let k = 0; k < 2; k++)
        world.props.add(
          k === 0 ? 'mech' : 'sentinel',
          world.surface.point(offset(seat.up, k * 1.6, town.radius * 1.02), 0),
          null,
          1,
          colour,
        );
      return town;
    });
    const hq = seats[0];
    // The spaceport that ships industry and tourists to the Moon and Mars.
    const port =
      hq && world.around(hq, 16).find((f) => f.land && !f.used && f.up.angleTo(hq.up) > 0.2);
    if (port) {
      port.used = true;
      const east = tangents(port.up).east;
      world.props.add('landing-pad', world.surface.point(port.up, -0.0004), east, 1.6);
      world.props.add('shuttle', world.surface.point(port.up, 0.0006), east, 1);
      world.props.add('lander', world.surface.point(offset(port.up, 2, 3.4 * U), -0.0004), east, 1);
      world.props.add('beacon', world.surface.point(offset(port.up, 4, 3.2 * U), -0.0004), null, 1);
    }
    if (hq)
      enclave(
        world.layer('enclave', 'surface', { landmark: 'enclave' }),
        world.on(hq, random() * 6, 1, -0.002),
        0.14,
        companies[0],
      );

    // Outside the walls: shanty towns, markets and tent lines.
    const shanties = world
      .scatter(settleable(world, ['lowland', 'desert', 'shore', 'forest']), 6, 22)
      .map((face) =>
        buildTown(world, face.up, {
          layout: 'radial',
          radius: 0.1,
          streets: 3,
          street: { width: 1.3 * U, tone: '#9a8466' },
          plaza: { radius: 2.6 * U, tone: '#b39a72', centre: [['market', 1, [1, 1.2], companies]] },
          lot: { spacing: 2 * U },
          core: [
            ['shanty-dark', 4, [1, 1.2], ['#a89a84', '#8a7a64', '#b9a68a']],
            ['market', 1, [1, 1.1], companies],
          ],
          edge: [
            ['shanty-dark', 4, [0.9, 1.1], ['#a89a84', '#8a7a64']],
            ['tent', 2, [0.9, 1.1], ['#c4955f', '#8a8f96']],
            ['billboard', 0.3, [1, 1.1], companies],
          ],
          people: { standing: 6, walking: 2, ...citizens, tints: earthy },
          cars: { count: 1, kinds: ['car', 'van'], tints: ['#8a4a32', '#6a6a70', '#a89a84'] },
        }),
      );

    // Monoculture: the agricultural-pollution decade sets how much green land is ploughed flat.
    const plough = Math.round(land.length * decades(earth.agricultural_pollution, 0.1, 100) * 0.35);
    const fields = claim(faces, plough, (f) =>
      f.land && ['lowland', 'forest', 'jungle', 'shore'].includes(f.biome) ? random() : null,
    );
    for (const face of fields) {
      furrows(world, face, random() < 0.5 ? '#d8c25c' : '#b9b04a', tangents(face.up).east);
      if (random() < 0.05)
        world.props.add('silo', world.surface.point(face.up, -0.0004), null, 1.2);
      else if (random() < 0.04)
        world.props.add('barn', world.surface.point(face.up, -0.0004), tangents(face.up).east, 1);
    }

    // Surface modification: the published fraction becomes mines, rigs and oil fields.
    const target = coveredFaces(earth.surface_modification, faces.length);
    const mines = claim(faces, target, (f) =>
      f.land && ['desert', 'upland', 'mountain', 'lowland'].includes(f.biome)
        ? random() + (f.biome === 'desert' ? 0.4 : 0)
        : null,
    );
    mines.forEach((face, i) => {
      face.used = true;
      face.tone = '#8d5b39';
      const layer =
        i === 0 ? world.layer('pit-mine', 'surface', { landmark: 'pit-mine' }) : world.ground;
      if (i === 0 || world.thin(0.15)) {
        pitMine(layer, world.on(face, random() * 6), i === 0 ? 0.15 : 0.09);
        if (world.quality.life && (i === 0 || random() < 0.35)) {
          const loop: THREE.Vector3[] = [];
          for (let k = 0; k < 14; k++)
            loop.push(
              world.surface.point(
                offset(face.up, (k / 14) * Math.PI * 2, i === 0 ? 0.1 : 0.06),
                0.001,
              ),
            );
          world.props.add(
            i === 0 ? 'robot-arm' : 'spider-bot',
            world.surface.point(offset(face.up, 0.7, i === 0 ? 0.13 : 0.08), -0.0004),
            face.up.clone().sub(offset(face.up, 0.7, 0.1)),
            1.1,
          );
          world.traffic.add(i % 2 ? 'spider-bot' : 'haul-truck', makeRoute(loop, true), {
            count: 1,
            speed: 0.003,
            size: 1.1,
            pingpong: false,
            random,
          });
        }
      } else if (random() < 0.2) {
        world.props.add(
          'derrick',
          world.surface.point(face.up, -0.0004),
          tangents(face.up).east,
          1.1,
        );
        world.props.add(
          'oil-tank',
          world.surface.point(offset(face.up, 1, 2.2 * U), -0.0004),
          null,
          1,
        );
        world.props.add('worker', world.surface.point(offset(face.up, 2, 1.4 * U), 0), null, 1);
      }
    });

    const shelf = faces.filter((f) => !f.land && f.biome === 'shallows' && !f.used);
    const rigs = world.scatter(shelf, 5, 24);
    rigs.forEach((face, i) => {
      face.used = true;
      const layer =
        i === 0 ? world.layer('platform', 'surface', { landmark: 'platform' }) : world.ground;
      offshoreRig(layer, world.on(face, random() * 6, 1, 0), i === 0 ? 0.12 : 0.08);
    });

    const towns = [...enclaves, ...shanties];
    roads(world, towns, {
      width: 1.3 * U,
      tone: '#6a5a48',
      neighbours: 2,
      reach: 0.8,
      pylons: 'pylon',
      traffic: {
        kinds: ['haul-truck', 'truck', 'car', 'van'],
        per: 1,
        speed: 0.009,
        tints: [...companies, '#8a8f96'],
      },
    });
    for (const town of shanties)
      world.props.add(
        'billboard',
        world.surface.point(offset(town.centre, random() * 6, town.radius * 1.3), -0.0004),
        offset(town.centre, 0, 0.01).sub(town.centre),
        1.2,
        world.random.pick(companies),
      );
    const ports = enclaves
      .map((t) => harbour(world, t.centre, { crane: true, light: true }))
      .filter((p): p is THREE.Vector3 => !!p);
    seaLanes(world, [...ports, ...rigs.map((r) => r.up.clone())], {
      kinds: ['tanker', 'ship'],
      per: 1,
      speed: 0.007,
      tints: ['#2a2d33', '#c4452f'],
    });
    harbourLoops(world, ports, { kinds: ['fishing', 'ferry'], per: 1, speed: 0.003 });
    flights(
      world,
      enclaves.map((t) => t.centre),
      { kinds: ['plane', 'cargo-drone'], per: 1, speed: 0.03, size: 0.9, tints: companies },
      3,
    );

    chaoticSwarm(world, satelliteCount(earth.satellite_belt), [1.1, 1.3], {
      size: 0.009,
      body: '#a7a39d',
      wings: companies,
      light: '#ffd28a',
      lightShare: 0.2,
      broken: 0.08,
    });
  },
};
