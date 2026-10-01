import * as THREE from 'three';
import { claim, type EarthBrief } from '../earth';
import { coveredFaces, hazeStrength, lightShare, satelliteCount } from '../encoding';
import { frame, local } from '../kit';
import { onOrbit, orbitMatrix, satellite, type LayerBuilder } from '../model';
import { orderedSwarm } from '../orbits';
import type { Face } from '../globe';
import type { Tone } from '../kit';
import { U } from '../props/library';
import { citizenKinds, walkerKinds } from '../props/people';
import { makeRoute } from '../scene/collect';
import { flights, roads, seaLanes } from '../scene/network';
import { bareFlora } from '../scene/presets';
import { harbour, queue } from '../scene/sites';
import { offset, tangents } from '../scene/surface';
import { buildTown, type TownStyle } from '../scene/towns';

/**
 * S1 · Big Brother is Watching. "An autocratic ruler enforces strict resource allocation…
 * Earth becomes a highly monitored urban landscape, and elites live in space settlements."
 */
const capital = { lat: 40, lon: 30 };

export function watchtower(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.solid.prism(m, 0.2 * s, 0.17 * s, 0.06 * s, 8, '#4d5158');
  layer.solid.prism(local(m, 0, 0.06 * s, 0), 0.075 * s, 0.045 * s, 0.84 * s, 6, '#80858d');
  layer.solid.prism(local(m, 0, 0.6 * s, 0), 0.17 * s, 0.15 * s, 0.035 * s, 12, '#3a3e45');
  layer.glow.prism(local(m, 0, 0.635 * s, 0), 0.152 * s, 0.152 * s, 0.012 * s, 12, '#ffb357');
  layer.solid.prism(local(m, 0, 0.76 * s, 0), 0.12 * s, 0.1 * s, 0.03 * s, 10, '#3a3e45');
  layer.glow.dome(local(m, 0, 0.84 * s, 0), 0.055 * s, '#ff3b30', 8, 1);
  layer.glow.dome(local(m, 0, 0.84 * s, 0, 0, 1, [Math.PI, 0]), 0.055 * s, '#ff3b30', 8, 1);
  layer.solid.prism(local(m, 0, 0.89 * s, 0), 0.028 * s, 0, 0.3 * s, 6, '#9aa0a8');
}

export function eliteSettlement(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.sheen.torus(m, 0.5 * s, 0.075 * s, '#eef0f2', 24, 5);
  layer.solid.torus(local(m, 0, 0.012 * s, 0), 0.47 * s, 0.05 * s, '#5fcf7a', 24, 4);
  layer.sheen.prism(local(m, 0, -0.16 * s, 0), 0.09 * s, 0.09 * s, 0.32 * s, 8, '#d9dde2');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    layer.sheen.beam(
      new THREE.Vector3().applyMatrix4(m),
      new THREE.Vector3(Math.cos(a) * 0.46 * s, 0, Math.sin(a) * 0.46 * s).applyMatrix4(m),
      0.018 * s,
      '#c9cdd2',
    );
  }
  layer.sheen.panel(local(m, 0, 0.17 * s, 0), 1.1 * s, 0.22 * s, '#294a82', '#c9cdd2');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    layer.glow.box(
      local(m, Math.cos(a) * 0.5 * s, 0.07 * s, Math.sin(a) * 0.5 * s, -a),
      0.05 * s,
      0.018 * s,
      0.03 * s,
      '#fff1c8',
    );
  }
}

/** One block: identical everywhere, taller only where power concentrates. */
export function allocationBlock(
  layer: LayerBuilder,
  m: THREE.Matrix4,
  w: number,
  h: number,
  lit: boolean,
) {
  layer.solid.box(m, w, h, w, '#a2a4a9', '#686b72');
  if (lit) layer.glow.box(local(m, 0, h, 0), w * 0.7, w * 0.08, w * 0.18, '#ffb357');
}

export const s1: EarthBrief = {
  id: 'S1',
  seed: 101,
  facing: capital.lon,
  tilt: 0.3,
  pitch: 0.45,
  relief: 0.05,
  climate: { sea: 0, iceLat: 75, aridity: 0.1, greenery: -0.35 },
  palette: {
    deep: '#1c323c',
    ocean: '#26424b',
    shallows: '#37565a',
    shore: '#6d6a5f',
    lowland: '#6f6b5d',
    forest: '#515a48',
    jungle: '#4d5a45',
    upland: '#7a7466',
    mountain: '#6a655f',
    peak: '#b8b5ae',
    desert: '#8e7f64',
    tundra: '#7c7a70',
    ice: '#c6c9cb',
    seaice: '#a9b2b6',
  },
  clouds: { count: 16, tone: '#9b917f', speed: 0.01, size: 0.05 },
  flora: bareFlora(['#6f7a5a', '#7a7a5a', '#5f6a50']),
  fauna: { flocks: { count: 3, tints: ['#7d8188'] }, whales: 1 },
  atmosphere: (signals) => ({
    rim: '#d3ad79',
    rimStrength: 0.9,
    haze: '#7a6a52',
    hazeOpacity:
      hazeStrength(
        signals.bodies.Earth.industrial_pollution,
        signals.bodies.Earth.contaminated_aerosol,
      ) * 0.3,
    height: 1.035,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const { faces } = world;
    const lit = lightShare(earth.artificial_illumination);
    // The grid spreads from the capital: dry land first, then ice, then the shelf seas.
    const built = claim(faces, coveredFaces(earth.surface_modification, faces.length), (face) => {
      const d = world.distance(face, capital.lat, capital.lon);
      if (face.land) return (face.biome === 'ice' ? 6 : 10) - d;
      return (face.coastal ? 5 : 2) - d;
    });
    const seat = world.faceAt(capital.lat, capital.lon);
    // Detailed districts replace the far-field block texture where the camera can get close.
    const districts = [
      seat.up.clone(),
      ...world
        .scatter(
          built.filter((f) => f.land && f.elevation < 0.4 && f.biome !== 'ice'),
          5,
          26,
        )
        .map((f) => f.up.clone()),
    ];
    const inDistrict = (face: Face) => districts.some((d) => d.angleTo(face.up) < 0.17);
    // The blocks beside the tower are one selectable study; the rest share the ground mesh.
    const study = world.layer('allocation-blocks', 'surface', { landmark: 'allocation-blocks' });
    const studyFace = built.find((f) => f.land && !inDistrict(f));
    // Field blocks are placed after the districts, so the districts keep their buildings when
    // the world's prop budget thins the city evenly.
    const fieldBlocks: (() => void)[] = [];
    for (const face of built) {
      face.used = true;
      face.tone = face.land ? '#8d8f94' : '#56646b';
      if (face === seat || inDistrict(face)) continue;
      // Identical blocks on one street grid, taller only where power concentrates.
      const power = Math.exp(-world.distance(face, capital.lat, capital.lon) / 0.28);
      const { east, north } = tangents(face.up);
      const kind = power > 0.45 && world.random() < power ? 'block-tall' : 'block';
      const variant = world.random() < lit ? kind : `${kind}-dark`;
      const watched = world.random() < 0.05;
      fieldBlocks.push(() => {
        world.props.add(
          variant,
          world.surface.point(face.up, -0.0005),
          north,
          face.land ? 1 : 0.8,
          face.land ? '#9a9ca1' : '#7d868c',
        );
        if (watched)
          world.props.add(
            'surveillance',
            world.surface.point(
              face.up
                .clone()
                .addScaledVector(east, face.size * 0.17)
                .normalize(),
              -0.0003,
            ),
            north,
            1,
          );
      });
      if (face === studyFace) allocationBlock(study, world.aligned(face), 3 * U, 3.4 * U, true);
    }

    seat.used = true;
    const tower = world.layer('watchtower', 'surface', { landmark: 'watchtower' });
    const base = world.on(seat);
    watchtower(tower, base, 0.3);
    const beam = world.layer('searchlight', 'surface', {
      matrix: local(base, 0, 0.3 * 0.84, 0),
      motion: { kind: 'spin', speed: 0.45 },
    });
    beam.beam.prism(
      frame(new THREE.Vector3(), new THREE.Vector3(1, -0.55, 0)),
      0.002,
      0.034,
      0.42,
      7,
      '#7a5a30',
    );

    const grey: Tone[] = ['#7d8188', '#737780', '#858a91', '#6c7078'];
    const district: TownStyle = {
      layout: 'grid',
      radius: 0.16,
      block: 4.5 * U,
      street: { width: 1.3 * U, tone: '#3a3d44' },
      plaza: { radius: 2.6 * U, tone: '#5d6168', centre: [['hologram', 1, [1.3, 1.5]]] },
      lot: { spacing: 2.3 * U },
      core: [
        ['block-tall', 5, [1, 1.15]],
        ['screen', 0.4, [1, 1.2]],
        ['hologram', 0.5, [1, 1.2]],
        ['checkpoint', 0.4, [1, 1]],
      ],
      edge: [
        ['block', 6, [1, 1.1]],
        ['warehouse', 0.7, [1, 1.1], ['#8d9096']],
        ['checkpoint', 0.4, [1, 1]],
        ['turret', 0.25, [1, 1.1]],
      ],
      rise: (r) => (r < 0.3 ? 1.25 : 1),
      people: { standing: 10, walking: 3, kinds: citizenKinds, walkers: walkerKinds, tints: grey },
      cars: {
        count: 2,
        kinds: ['bus', 'van', 'hover-car'],
        tints: ['#5d6168', '#4a4e55', '#6c7078'],
      },
      lamps: 'surveillance',
      // What remains of the biosphere: a few rationed planters and dead street trees.
      trees: {
        count: 6,
        kinds: ['dead-tree', 'shrub', 'bush'],
        tints: ['#6f7a5a', '#5f6a50'],
        size: [0.9, 1.2],
      },
    };
    const towns = districts.map((centre, k) =>
      buildTown(world, centre, district, k === 0 ? 1.15 : 1),
    );
    fieldBlocks.forEach((place) => place());
    for (const town of towns) {
      // Ration lines outside the distribution depots, and drones over every district.
      queue(
        world,
        offset(town.centre, 0.8, 5 * U),
        0.8 + Math.PI / 2,
        4,
        citizenKinds[world.random.int(0, 3)],
        grey,
      );
      queue(
        world,
        offset(town.centre, 2.9, 6 * U),
        2.9 - Math.PI / 2,
        3,
        citizenKinds[world.random.int(0, 3)],
        grey,
      );
      for (const k of [0, 1])
        world.props.add(
          k === 0 ? 'sentinel' : 'guard',
          world.surface.point(offset(town.centre, k * 2.1, 4.4 * U), 0),
          null,
          1,
        );
      if (world.quality.life) {
        const loop: THREE.Vector3[] = [];
        for (let i = 0; i < 20; i++)
          loop.push(
            offset(town.centre, (i / 20) * Math.PI * 2, town.radius * 0.7).multiplyScalar(1.12),
          );
        // Robot enforcers walk the district's ring; drones watch from above.
        const ring = loop.map((p) => world.surface.point(p.clone().normalize(), 0.0004));
        world.traffic.add('sentinel', makeRoute(ring, true), {
          count: 1,
          speed: 0.004,
          pingpong: false,
          random: world.random,
        });
        world.traffic.add('drone', makeRoute(loop, true), {
          count: 2,
          speed: 0.008,
          size: 1.6,
          pingpong: false,
          random: world.random,
        });
      }
    }
    roads(world, towns, {
      width: 1.3 * U,
      tone: '#3a3d44',
      neighbours: 2,
      reach: 0.8,
      pylons: 'pylon',
      traffic: {
        kinds: ['truck', 'bus', 'van'],
        per: 1,
        speed: 0.01,
        tints: ['#5d6168', '#4a4e55', '#8d9096'],
      },
    });
    const ports = towns
      .map((t) => harbour(world, t.centre, { crane: true }))
      .filter((p): p is THREE.Vector3 => !!p);
    seaLanes(world, ports, {
      kinds: ['tanker', 'ship'],
      per: 1,
      speed: 0.005,
      tints: ['#3a3d44', '#5d6168'],
    });
    flights(
      world,
      towns.map((t) => t.centre),
      { kinds: ['plane'], per: 1, speed: 0.02, size: 0.9, tints: ['#e6e8ea'] },
      4,
    );

    const elite = world.layer('elite-settlement', 'orbit', {
      landmark: 'elite-settlement',
      matrix: orbitMatrix(0.42, 1.1),
      motion: { kind: 'spin', speed: 0.06 },
    });
    for (const angle of [0.4, 0.4 + Math.PI]) eliteSettlement(elite, onOrbit(1.42, angle), 0.2);

    // A monitoring lattice: satellites at the nodes of a geodesic net, joined by thin struts.
    const net = world.layer('lattice', 'orbit', { motion: { kind: 'spin', speed: 0.012 } });
    const shell = new THREE.IcosahedronGeometry(1.27, 1);
    const position = shell.getAttribute('position');
    const nodes = new Map<string, THREE.Vector3>();
    const edges = new Set<string>();
    for (let i = 0; i < position.count; i += 3) {
      const corners = [0, 1, 2].map((k) => {
        const v = new THREE.Vector3().fromBufferAttribute(position, i + k);
        const key = v
          .toArray()
          .map((n) => n.toFixed(3))
          .join();
        nodes.set(key, v);
        return key;
      });
      for (const [a, b] of [
        [0, 1],
        [1, 2],
        [2, 0],
      ])
        edges.add([corners[a], corners[b]].sort().join('|'));
    }
    shell.dispose();
    for (const edge of edges) {
      const [a, b] = edge.split('|').map((key) => nodes.get(key)!);
      net.sheen.beam(a, b, 0.0035, '#5b6672');
    }
    for (const node of nodes.values())
      satellite(net, frame(node, node), 0.014, '#8d949c', '#3b4f6b', '#ff4a3d');

    const count = Math.max(0, satelliteCount(earth.satellite_belt) - nodes.size);
    orderedSwarm(
      world,
      count,
      [
        { inclination: 0.15, node: 0, speed: 0.05, radius: 1.14 },
        { inclination: 0.95, node: 0.6, speed: -0.04, radius: 1.17 },
        { inclination: -0.95, node: 1.7, speed: 0.035, radius: 1.2 },
        { inclination: 1.45, node: 2.4, speed: -0.03, radius: 1.16 },
      ],
      { size: 0.009, body: '#9aa0a6', wings: '#34465f' },
    );
  },
};
