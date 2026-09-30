import * as THREE from 'three';
import { claim, type EarthBrief } from '../earth';
import { coveredFaces, hazeStrength, lightShare, satelliteCount } from '../encoding';
import { frame, local } from '../kit';
import { onOrbit, orbitMatrix, satellite, type LayerBuilder } from '../model';
import { orderedSwarm } from '../orbits';

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
  clouds: { count: 16, tone: '#9b917f', speed: 0.01, size: 0.06 },
  forest: { count: 30, tones: { forest: '#4b5642', jungle: '#475540' } },
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
    // The blocks beside the tower are one selectable study; the rest share the ground mesh.
    const study = world.layer('allocation-blocks', 'surface', { landmark: 'allocation-blocks' });
    const beside = new Set(seat.neighbours);
    for (const face of built) {
      face.used = true;
      face.tone = face.land ? '#8d8f94' : '#56646b';
      if (face === seat) continue;
      const power = Math.exp(-world.distance(face, capital.lat, capital.lon) / 0.28);
      const grid = world.aligned(face);
      const w = face.size * 0.24,
        h = face.size * (0.1 + 0.55 * power) * (face.land ? 1 : 0.6);
      const offsets =
        world.quality.density < 0.6
          ? [[0, 0]]
          : [
              [-1, -1],
              [1, 1],
            ];
      for (const [x, z] of offsets)
        allocationBlock(
          beside.has(face.index) ? study : world.ground,
          local(grid, x * face.size * 0.12, 0, z * face.size * 0.12),
          w,
          h,
          world.random() < lit,
        );
      if (world.random() < 0.07) {
        const pole = local(grid, face.size * 0.22, 0, 0);
        world.ground.solid.prism(
          pole,
          face.size * 0.018,
          face.size * 0.012,
          face.size * 0.7,
          4,
          '#5d6168',
        );
        world.ground.glow.box(
          local(pole, 0, face.size * 0.7, 0),
          face.size * 0.04,
          face.size * 0.04,
          face.size * 0.04,
          '#ff3b30',
        );
      }
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
