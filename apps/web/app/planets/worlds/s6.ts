import * as THREE from 'three';
import { claim, type EarthBrief } from '../earth';
import { coveredFaces, hazeStrength, lightShare, satelliteCount } from '../encoding';
import { frame, local } from '../kit';
import type { Face } from '../globe';
import type { LayerBuilder, WorldContext } from '../model';
import { orderedSwarm } from '../orbits';
import { stack, tank } from '../parts';
import type { Tone } from '../kit';
import { U } from '../props/library';
import { makeRoute } from '../scene/collect';
import { roads, seaLanes } from '../scene/network';
import { bareFlora, citizens } from '../scene/presets';
import { harbour } from '../scene/sites';
import { offset } from '../scene/surface';
import { buildTown, type TownStyle } from '../scene/towns';

/**
 * S6 · Sword of Damocles. "Nanoscale engineering regulates biological processes inside a
 * technosphere… The system faces existential risk from fragile, precisely calibrated life support
 * managed by laboring populations."
 */
const steel = ['#6f7a86', '#5f6874', '#7d8894', '#687380'];

/** Raise a face into an inset plate: the building block of the life-support shell. */
function plate(world: WorldContext, face: Face, tone: string) {
  const lift = face.size * 0.08;
  const [a, b, c] = face.corners.map((p) => p.clone().lerp(face.centre, 0.1));
  const [a2, b2, c2] = [a, b, c].map((p) => p.clone().addScaledVector(face.up, lift));
  const mesh = world.ground.solid;
  mesh.tri(a2, b2, c2, tone);
  mesh.quad(a, b, b2, a2, '#454c55');
  mesh.quad(b, c, c2, b2, '#454c55');
  mesh.quad(c, a, a2, c2, '#454c55');
  return lift;
}

export function regulator(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.solid.prism(m, 0.55 * s, 0.52 * s, 0.05 * s, 8, '#5f6874', '#7d8894');
  layer.sheen.dome(local(m, 0, 0.05 * s, 0), 0.22 * s, '#b9c6d1', 10, 2);
  layer.glow.prism(local(m, 0, 0.05 * s, 0), 0.23 * s, 0.23 * s, 0.015 * s, 10, '#ffb03a');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const t = local(m, Math.cos(a) * 0.38 * s, 0.05 * s, Math.sin(a) * 0.38 * s);
    tank(layer.sheen, t, 0.09 * s, 0.22 * s, '#9aa6b1');
    layer.solid.beam(
      new THREE.Vector3(0, 0.12 * s, 0).applyMatrix4(m),
      new THREE.Vector3(0, 0.12 * s, 0).applyMatrix4(t),
      0.02 * s,
      '#b48a4a',
    );
    layer.glow.box(local(t, 0, 0.3 * s, 0), 0.03 * s, 0.03 * s, 0.03 * s, '#ff5a3a');
  }
}

export function thermalStack(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.solid.prism(m, 0.5 * s, 0.5 * s, 0.03 * s, 6, '#5f6874');
  for (const [x, z, h] of [
    [-0.2, 0, 0.8],
    [0.22, 0.12, 0.65],
    [0.05, -0.28, 0.55],
  ]) {
    stack(layer.solid, local(m, x * s, 0.03 * s, z * s), 0.14 * s, h * s, '#a3a9ad');
    layer.cloud.blob(
      local(m, x * s, (h + 0.12) * s, z * s),
      0.12 * s,
      '#d4d69a',
      0.3,
      Math.round(h * 100),
    );
    layer.cloud.blob(
      local(m, (x + 0.05) * s, (h + 0.26) * s, z * s),
      0.09 * s,
      '#c9cb8a',
      0.3,
      Math.round(h * 200),
    );
  }
}

/** A blade-shaped regulator hanging point-down from a single thread. */
export function hangingRegulator(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.sheen.gem(local(m, 0, 0, 0), 0.06 * s, 0.62 * s, '#d9e2ea', 4, 0.9);
  layer.glow.gem(local(m, 0, 0.3 * s, 0), 0.02 * s, 0.34 * s, '#ffcf6a', 4, 0.7);
  layer.sheen.box(local(m, 0, 0.56 * s, 0), 0.34 * s, 0.035 * s, 0.07 * s, '#aeb8c2');
  layer.sheen.prism(local(m, 0, 0.6 * s, 0), 0.03 * s, 0.03 * s, 0.14 * s, 6, '#8d97a1');
  layer.sheen.dome(local(m, 0, 0.74 * s, 0), 0.045 * s, '#aeb8c2', 6, 1);
  layer.glow.beam(
    new THREE.Vector3(0, 0.78 * s, 0).applyMatrix4(m),
    new THREE.Vector3(0, 1.08 * s, 0).applyMatrix4(m),
    0.004 * s,
    '#fff2c8',
    4,
  );
  layer.sheen.torus(local(m, 0, 1.08 * s, 0), 0.12 * s, 0.022 * s, '#c9d1d8', 16, 4);
}

export const s6: EarthBrief = {
  id: 'S6',
  seed: 606,
  facing: 78,
  tilt: 0.3,
  pitch: 0.28,
  relief: 0.05,
  climate: { sea: 0, iceLat: 80, aridity: 0.2, greenery: -0.4 },
  palette: {
    deep: '#1c3a3a',
    ocean: '#244a47',
    shallows: '#35635a',
    shore: '#7c7a64',
    lowland: '#7d7b62',
    forest: '#5d6b4c',
    jungle: '#566a48',
    upland: '#8c8670',
    mountain: '#76726a',
    peak: '#bdb9ae',
    desert: '#9c8a62',
    tundra: '#8a8a78',
    ice: '#d5d8d0',
    seaice: '#b8c2bc',
  },
  clouds: { count: 20, tone: '#c9c98a', speed: 0.018, size: 0.06 },
  flora: bareFlora(['#6f7a50', '#7d7b62'], 0.5),
  fauna: { flocks: { count: 2, tints: ['#5f6874'] } },
  atmosphere: (signals) => ({
    rim: '#d6d77a',
    rimStrength: 1,
    haze: '#9fa556',
    hazeOpacity:
      hazeStrength(
        signals.bodies.Earth.industrial_pollution,
        signals.bodies.Earth.contaminated_aerosol,
      ) * 0.22,
    height: 1.04,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const { faces, random } = world;
    const lit = lightShare(earth.artificial_illumination);
    const heart = { lat: 30, lon: 80 };
    const shell = claim(
      faces,
      coveredFaces(earth.surface_modification, faces.length),
      (f) => 4 - world.distance(f, heart.lat, heart.lon) + (f.land ? 1 : 0),
    );

    // Worker districts sit in clearings of the shell, beside the machinery they maintain.
    const overalls: Tone[] = ['#e08a2e', '#d0702a', '#c4a030', '#8a949e'];
    const works: TownStyle = {
      layout: 'grid',
      radius: 0.06,
      block: 8 * U,
      street: { width: 1.6 * U, tone: '#3d434a' },
      plaza: { radius: 2.6 * U, tone: '#5f6874', centre: [['pressure-tank', 1, [1, 1.2]]] },
      lot: { spacing: 2.2 * U },
      core: [
        ['worker-block', 4, [1, 1.1]],
        ['hab-dome', 1, [0.7, 0.8]],
        ['warehouse', 1, [1, 1.1], ['#7d8894']],
      ],
      edge: [
        ['worker-block', 4, [1, 1.1]],
        ['pipe-rack', 1, [1, 1.1]],
        ['greenhouse-dark', 1, [1, 1.1]],
      ],
      people: {
        standing: 18,
        walking: 7,
        kinds: ['worker', 'worker', ...citizens.kinds],
        walkers: ['worker-walk'],
        tints: overalls,
      },
      cars: { count: 2, kinds: ['van', 'haul-truck'], tints: ['#e0a830', '#8a949e'] },
      lamps: 'lamp',
      // The regulated biosphere: planters and trees tended inside the works.
      trees: {
        count: 8,
        kinds: ['bush', 'oak-small'],
        tints: ['#5f8a4a', '#6f9a50'],
        size: [0.9, 1.2],
      },
    };
    const landShell = shell.filter((f) => f.land && f.elevation < 0.4);
    const sites = world.scatter(landShell, 12, 13);
    const clearing = (face: Face) => sites.some((s) => s.up.angleTo(face.up) < 0.07);
    const towns = sites.map((face) => buildTown(world, face.up, works));

    const warnings = world.layer('warnings', 'surface', {
      motion: { kind: 'pulse', period: 3.2, floor: 0.2 },
    });
    const machines: [string, number, number][] = [
      ['pressure-tank', 4, 1.1],
      ['cooling-tower', 2, 1],
      ['pipe-rack', 3, 1.1],
      ['crane', 0.6, 1],
      ['solar-array', 1, 1.1],
      ['hab-dome', 0.8, 0.8],
    ];
    const total = machines.reduce((sum, m) => sum + m[1], 0);
    for (const face of shell) {
      face.used = true;
      face.tone = face.land ? '#4b525b' : '#3a4a4f';
      if (clearing(face)) continue;
      const lift = plate(world, face, random.pick(steel));
      const count = Math.round((face.land ? 3 : 1.5) * world.quality.density * random());
      for (let k = 0; k < count; k++) {
        const dir = offset(face.up, random() * 6, random() * face.size * 0.3);
        if (world.surface.face(dir) !== face) continue;
        let r = random() * total,
          pick = machines[0];
        for (const m of machines)
          if ((r -= m[1]) <= 0) {
            pick = m;
            break;
          }
        world.props.add(
          pick[0],
          world.surface.point(dir, lift - 0.0003),
          offset(dir, random() * 6, 0.01).sub(dir),
          pick[2],
        );
      }
      if (random() < lit * 0.25)
        warnings.glow.box(
          world.on(face, random() * 6, 1, -lift),
          0.002,
          0.0012,
          0.002,
          random() < 0.8 ? '#ffb03a' : '#ff4a3a',
        );
    }
    // Pipes between neighbouring plates carry the planet's regulated flows.
    for (const face of shell)
      if (world.thin(0.06) && !clearing(face)) {
        const next = faces[face.neighbours[0]];
        if (next.used && !clearing(next))
          world.ground.solid.beam(
            face.centre.clone().addScaledVector(face.up, face.size * 0.12),
            next.centre.clone().addScaledVector(next.up, face.size * 0.12),
            face.size * 0.018,
            '#b48a4a',
          );
      }

    roads(world, towns, {
      width: 2 * U,
      tone: '#3d434a',
      neighbours: 2,
      reach: 0.5,
      traffic: {
        kinds: ['haul-truck', 'truck', 'van'],
        per: 2,
        speed: 0.008,
        tints: ['#e0a830', '#8a949e', '#5f6874'],
      },
    });
    const ports = towns
      .map((t) => harbour(world, t.centre, { crane: true }))
      .filter((p): p is THREE.Vector3 => !!p);
    seaLanes(world, ports, {
      kinds: ['tanker', 'ship'],
      per: 2,
      speed: 0.005,
      tints: ['#3a3d44', '#5f6874'],
    });
    if (world.quality.life)
      for (const town of towns) {
        const loop: THREE.Vector3[] = [];
        for (let i = 0; i < 16; i++)
          loop.push(offset(town.centre, (i / 16) * Math.PI * 2, town.radius).multiplyScalar(1.02));
        world.traffic.add('drone', makeRoute(loop, true), {
          count: 3,
          speed: 0.006,
          size: 1.4,
          tints: ['#e0a830'],
          pingpong: false,
          random,
        });
      }

    const core = world.faceAt(heart.lat, heart.lon);
    regulator(
      world.layer('regulator', 'surface', { landmark: 'regulator' }),
      world.on(core, 0, 1, -core.size * 0.08),
      0.05,
    );
    const vent = world.around(core, 12).find((f) => f !== core && f.land) ?? core;
    thermalStack(
      world.layer('thermal-stack', 'surface', { landmark: 'thermal-stack' }),
      world.on(vent, 0, 1, -vent.size * 0.08),
      0.05,
    );

    // Hangs over the heart of the machine, turning with it: the suspended regulator.
    const sword = world.layer('hanging-regulator', 'surface', { landmark: 'hanging-regulator' });
    const over = world.faceAt(heart.lat - 10, heart.lon - 52);
    hangingRegulator(sword, frame(over.up.clone().multiplyScalar(1.1), over.up), 0.32);

    orderedSwarm(
      world,
      satelliteCount(earth.satellite_belt),
      [
        { inclination: 0.2, node: 0, speed: 0.045, radius: 1.12 },
        { inclination: 0.7, node: 1, speed: 0.045, radius: 1.14 },
        { inclination: -0.7, node: 2, speed: 0.045, radius: 1.16 },
      ],
      { size: 0.008, body: '#8d98a3', wings: '#4a5663', light: '#ffb03a' },
    );
  },
};
