import * as THREE from 'three';
import { claim, type EarthBrief } from '../earth';
import { coveredFaces, decades, hazeStrength, satelliteCount } from '../encoding';
import type { Biome, Face } from '../globe';
import type { Tone } from '../kit';
import type { LayerBuilder, WorldContext } from '../model';
import { chaoticSwarm } from '../orbits';
import { living, U } from '../props/library';
import { makeRoute, ribbon, road } from '../scene/collect';
import { flights, harbourLoops, roads, seaLanes } from '../scene/network';
import { citizens, earthFlora, earthy } from '../scene/presets';
import { furrows } from '../scene/sites';
import { offset, tangents } from '../scene/surface';
import type { Town } from '../scene/towns';

/**
 * S2 · Wild West. "Competition for scarce resources is entrenched. The technosphere and
 * biosphere remain in fragile dependency amid climate stress, inequality, and unrest."
 *
 * The busiest future, staged as districts rather than a scatter: each rival company holds one
 * territory on the shared continents, and extraction, farming, launch and shipping each have one
 * place with one hero piece and a small cast lined up on that place's own grid. Where things
 * stand is interpretive staging; how much ground is dug and ploughed, the satellites and the
 * haze still come from the published values.
 */
export const companies: {
  colour: string;
  lat: number;
  lon: number;
  /** The side of the wall its shanties are pressed against (1 left of the gate, -1 right). */
  flank: 1 | -1;
  shanties: number;
}[] = [
  // The selectable enclave: the steppe, at the head of the road to its spaceport and terminal.
  { colour: '#d0493a', lat: 59.5, lon: 60, flank: -1, shanties: 2 },
  // Africa, at the far end of the haul road from the great pit.
  { colour: '#e0a52e', lat: -14, lon: 30, flank: 1, shanties: 2 },
  // South America.
  { colour: '#2e9e6e', lat: -15.5, lon: -51.5, flank: 1, shanties: 2 },
  // North America.
  { colour: '#3a68d0', lat: 43, lon: -93, flank: -1, shanties: 2 },
  // East Asia.
  { colour: '#9a4ad0', lat: 32.5, lon: 110, flank: 1, shanties: 2 },
  // Australia, on a coast with no room outside the wall.
  { colour: '#e0689a', lat: -26, lon: 143, flank: 1, shanties: 0 },
];
const colours = companies.map((company) => company.colour);

/** Where the published modified fraction is dug. A stronger pull digs a wider scar. */
const diggings = [
  { lat: 17, lon: 12, pull: 1 }, // the Sahara: the great pit
  { lat: 24.4, lon: 49.2, pull: 0.74 }, // Arabia: the oil field
  { lat: -21, lon: 126, pull: 1.1 }, // Australia
  { lat: 37, lon: -114, pull: 1 }, // the American south-west
  { lat: 43, lon: 92, pull: 0.9 }, // the Gobi, worked out and left
  { lat: -25, lon: 28, pull: 0.62 }, // the Kalahari, worked out and left
];
/** Where the published farm pollution is ploughed: one crop and one furrow heading per estate. */
const estates = [
  { lat: 0, lon: 30, pull: 1, turn: 0.3, crop: '#d8c25c' }, // central Africa
  { lat: 51, lon: 28, pull: 0.92, turn: -0.25, crop: '#b9b04a' }, // the northern plain
  { lat: -8, lon: -52, pull: 0.86, turn: 0.9, crop: '#b9b04a' }, // Brazil
  { lat: 46, lon: -94, pull: 0.86, turn: 0, crop: '#d8c25c' }, // the American plains
  { lat: 27, lon: 108, pull: 0.74, turn: 0.5, crop: '#d8c25c' }, // China
];
const mineable: Biome[] = ['desert', 'upland', 'mountain', 'lowland'];
const arable: Biome[] = ['lowland', 'forest', 'jungle', 'shore'];
/** Benches of worked ground, stepping outward from each pit. */
export const cuts: Tone[] = ['#8d5b39', '#a26b43', '#7c4f36', '#a26b43'];
/** The crops of the estates. */
export const crops: Tone[] = [...new Set(estates.map((estate) => estate.crop))];
/** Radians of ground one unit of pull reaches. */
const SPREAD = 0.5;

export function enclave(layer: LayerBuilder, m: THREE.Matrix4, s: number, colour: string) {
  layer.kit('lm-enclave', m, s / 10, { tint: colour });
}

export function pitMine(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.kit('lm-pit-mine', m, s / 10);
}

export function offshoreRig(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.kit('lm-offshore-rig', m, s / 10);
}

/** A district's own grid: `x` runs forward along its axis and `y` to its left, in person units. */
export type Plot = { centre: THREE.Vector3; turn: number };

/** One prop on a plot's grid: kind, place, the grid angle it faces, size and colour. */
type Piece = [
  kind: string,
  x: number,
  y: number,
  a: number,
  size: number,
  tint?: Tone,
  free?: boolean,
];

/** A place on a plot's grid. */
export function at(plot: Plot, x: number, y: number) {
  const d = Math.hypot(x, y) * U;
  return d < 1e-9 ? plot.centre.clone() : offset(plot.centre, plot.turn + Math.atan2(y, x), d);
}

/** The direction of grid angle `a` (0 forward, π/2 left) at a place on a plot. */
function facing(plot: Plot, x: number, y: number, a: number) {
  return at(plot, x + Math.cos(a) * 0.5, y + Math.sin(a) * 0.5).sub(at(plot, x, y));
}

/** Stand a prop on a plot's grid facing grid angle `a`; left out where the grid meets the sea. */
function put(world: WorldContext, plot: Plot, ...[kind, x, y, a, size, tint, free]: Piece) {
  const dir = at(plot, x, y);
  if (!world.surface.land(dir)) return false;
  world.props.add(
    kind,
    world.surface.point(dir, living.test(kind) ? 0 : -0.0004),
    facing(plot, x, y, a),
    size,
    tint,
    free,
  );
  return true;
}

/**
 * A row of one kind of prop: evenly pitched from a place along grid angle `along`, every piece
 * facing the same way. Repeated pieces are always placed like this, never at headings of their
 * own.
 */
export function row(
  kind: string,
  count: number,
  from: [x: number, y: number],
  along: number,
  pitch: number,
  a: number,
  size: number,
  tint?: Tone,
): Piece[] {
  return Array.from({ length: count }, (_, i) => [
    kind,
    from[0] + Math.cos(along) * pitch * i,
    from[1] + Math.sin(along) * pitch * i,
    a,
    size,
    tint,
  ]);
}

/** Whether a prop of half-width `r` person units stands wholly on land at a place on a plot. */
function dry(world: WorldContext, plot: Plot, x: number, y: number, r = 0) {
  return [
    [0, 0],
    [r, 0],
    [-r, 0],
    [0, r],
    [0, -r],
  ].every(([dx, dy]) => world.surface.land(at(plot, x + dx, y + dy)));
}

/**
 * Turn a district so its whole cast stands on land. The preferred heading and flank are tried
 * first, then the other flank and headings swung further to either side; the first that keeps
 * every place dry wins, so one layout serves every coast and every quality tier's coastline.
 * A single swing fixes the heading and the flank (a district on a road).
 */
export function settle(
  world: WorldContext,
  centre: THREE.Vector3,
  preferred: number,
  flank: 1 | -1,
  swings: number[],
  places: (flank: 1 | -1) => [x: number, y: number][],
) {
  let best = { turn: preferred, flank, score: -1 };
  for (const swing of swings)
    for (const side of (swings.length > 1 ? [flank, -flank] : [flank]) as (1 | -1)[]) {
      const plot = { centre, turn: preferred + swing };
      const spots = places(side);
      const score = spots.filter(([x, y]) => dry(world, plot, x, y, 0.5)).length;
      if (score === spots.length) return { turn: plot.turn, flank: side };
      if (score > best.score) best = { turn: plot.turn, flank: side, score };
    }
  return { turn: best.turn, flank: best.flank };
}
const anyway = [0, 0.5, -0.5, 1, -1, Math.PI / 2, -Math.PI / 2, 2.2, -2.2, Math.PI];

/** A way along a plot's grid, kept clear of props: a shanty lane. */
function way(
  world: WorldContext,
  plot: Plot,
  from: [x: number, y: number],
  to: [x: number, y: number],
  width: number,
  tone: Tone,
) {
  const steps = Math.max(2, Math.ceil((Math.hypot(to[0] - from[0], to[1] - from[1]) * U) / 0.004));
  const dirs: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const dir = at(plot, from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
    if (!world.surface.land(dir)) break;
    dirs.push(dir);
  }
  if (dirs.length < 3) return;
  const points = dirs.map((dir) => world.surface.point(dir, 0.0016));
  road(world.ground.solid, points, width, tone, false, world.ground.lean);
  world.lanes.push({ points: dirs, half: width / 2 });
}

/** A pipe or belt laid on the ground along a plot's grid. */
function line(
  world: WorldContext,
  plot: Plot,
  from: [x: number, y: number],
  to: [x: number, y: number],
  width: number,
  tone: Tone,
) {
  const steps = Math.max(2, Math.ceil((Math.hypot(to[0] - from[0], to[1] - from[1]) * U) / 0.012));
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const dir = at(plot, from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
    if (world.surface.land(dir)) points.push(world.surface.point(dir, 0.0022));
  }
  ribbon(world.ground.solid, points, width, tone);
}

/** Compass heading (0 east, π/2 north) from one place toward another. */
export function bearing(from: THREE.Vector3, to: THREE.Vector3) {
  const { east, north } = tangents(from);
  const d = to.clone().sub(from);
  return Math.atan2(d.dot(north), d.dot(east));
}

/** Low open ground nearest a place on the shared continents. */
function seatAt(world: WorldContext, lat: number, lon: number, biomes?: Biome[]) {
  const open = (face: Face) =>
    face.land &&
    !face.used &&
    face.elevation < 0.45 &&
    (biomes ? biomes.includes(face.biome) : !['ice', 'peak', 'mountain'].includes(face.biome));
  return world.around(world.faceAt(lat, lon), 18).find(open) ?? world.faces.find(open)!;
}

/** The water face on the coast nearest a place. */
function coastAt(world: WorldContext, lat: number, lon: number) {
  return world.around(world.faceAt(lat, lon), 14).find((face) => !face.land && face.coastal);
}

/** How far along a plot's axis the sea begins, in person units, searching between two reaches. */
function shoreline(world: WorldContext, plot: Plot, from: number, to: number) {
  for (let x = from; x < to; x += 0.1) if (!world.surface.land(at(plot, x, 0))) return x;
  return null;
}

/** A dock on a plot's axis with its landward end on the shore at `x`, piles in the water. */
function dock(world: WorldContext, plot: Plot, shore: number, x: number) {
  const level = world.surface.point(at(plot, shore - 0.15, 0)).length();
  world.props.add(
    'dock',
    at(plot, x, 0).multiplyScalar(level - 0.0015),
    facing(plot, x, 0, 0),
    0.55,
    undefined,
    true,
  );
}

/** A road's end: `roads` stops a road at seven tenths of a node's radius. */
function node(centre: THREE.Vector3, stop: number): Town {
  const radius = (stop * U) / 0.7;
  return {
    centre,
    radius,
    lots: [],
    style: { layout: 'camp', radius, lot: { spacing: 0 }, core: [], edge: [] },
  };
}

/**
 * Rank faces by how strongly the nearest seed pulls them and take the leading `count`: ground
 * gathered into a few contiguous regions instead of scattered face by face. The total is the
 * caller's; only where it falls is staged.
 */
export function gather(
  faces: Face[],
  count: number,
  seeds: { up: THREE.Vector3; pull: number }[],
  eligible: (face: Face) => number | null,
) {
  return claim(faces, count, (face) => {
    const bonus = eligible(face);
    return bonus === null ? null : owner(face, seeds).pull + bonus;
  });
}

/** The seed that pulls a face hardest, and how hard. */
export function owner(face: Face, seeds: { up: THREE.Vector3; pull: number }[]) {
  let pull = -Infinity,
    index = 0;
  seeds.forEach((seed, i) => {
    const value = seed.pull - face.up.angleTo(seed.up) / SPREAD;
    if (value > pull) [pull, index] = [value, i];
  });
  return { pull, index };
}

/** A pit with its spoil heap toward compass heading `heap`, on ground props then keep off. */
function dig(world: WorldContext, layer: LayerBuilder, face: Face, heap: number, size: number) {
  pitMine(layer, world.on(face, heap), size);
  world.occupy(face.up, size * 0.9);
  // A landmark layer clears its own footprint; a pit on the shared ground is cleared here.
  if (!layer.options.landmark)
    world.keepOut.push({ centre: face.centre.clone(), radius: size * 0.75 });
}

type Yard = {
  corner: number;
  gate: number;
  back: number;
  lane: number;
  front: number;
  flank: 1 | -1;
};

/**
 * A walled company compound. Every company's is laid out the same way: the gate on the plot's
 * axis, a guard mech on one side of it and the company's sign on the other, and a lane of
 * `stalls` pressed against the wall on one flank (1 left of the gate, -1 right), the first of
 * them nearest the gate. `extras` adds a company's own pieces on the same grid. Unless the
 * heading is `fixed` by a road, the compound turns until its whole cast stands on land.
 */
function compound(
  world: WorldContext,
  layer: LayerBuilder,
  face: Face,
  options: {
    aim: number;
    fixed?: boolean;
    size: number;
    colour: string;
    flank: 1 | -1;
    stalls: string[];
    /** The sign stands by the lane, or out beyond the guard where there is room. */
    sign: 'lane' | 'guard';
    extras?: (yard: Yard) => Piece[];
  },
) {
  const { size, colour, stalls } = options;
  const corner = (5.32 * Math.SQRT2 * size) / 10 / U;
  const wall = corner / Math.SQRT2;
  const measure = (flank: 1 | -1): Yard => {
    const back = flank * (corner + 0.45);
    return {
      corner,
      gate: corner + 0.9,
      back,
      lane: back + flank * 1.45,
      front: options.sign === 'guard' ? corner + 0.3 : corner - 1.05,
      flank,
    };
  };
  const cast = (yard: Yard): Piece[] => [
    ['mech', yard.gate, -yard.flank * 1.55, 0, 0.75, colour],
    options.sign === 'guard'
      ? ['billboard', yard.gate + 0.5, -yard.flank * 3.5, 0, 0.8, colour]
      : ['billboard', yard.gate + 0.3, yard.flank * 1.9, 0, 0.8, colour],
    ...stalls.map((kind, i): Piece => [
      kind,
      yard.front - i * 2.7,
      yard.back,
      (yard.flank * Math.PI) / 2,
      kind === 'market' ? 0.8 : 0.85,
      kind === 'market' ? colour : '#a89a84',
    ]),
    ...(options.extras?.(yard) ?? []),
  ];
  const ends = (yard: Yard): [number, number][] =>
    stalls.length
      ? [
          [yard.front + 1.5, yard.lane],
          [yard.front - (stalls.length - 1) * 2.7 - 1.5, yard.lane],
        ]
      : [];
  const { turn, flank } = settle(
    world,
    face.up,
    options.aim,
    options.flank,
    options.fixed ? [0] : anyway,
    (side) => {
      const yard = measure(side);
      return [
        [wall, wall],
        [wall, -wall],
        [-wall, wall],
        [-wall, -wall],
        ...ends(yard),
        ...cast(yard).map(([, x, y]): [number, number] => [x, y]),
      ];
    },
  );
  const plot: Plot = { centre: face.up.clone(), turn };
  const yard = measure(flank);
  // The model's gate is its +z side.
  enclave(layer, world.on(face, turn + Math.PI / 2, 1, -0.002), size, colour);
  // The whole district is its own ground: no forest, herd or hill wanders in.
  world.occupy(plot.centre, (corner + 3.6) * U);
  if (!layer.options.landmark)
    world.keepOut.push({ centre: face.centre.clone(), radius: corner * U });
  // At the light tiers the shared ground carries no repeat of the landmark, so a rival whose
  // fortress is not drawn brings none of its cast either.
  if (layer.lean && !layer.options.landmark) return { plot, ...yard, drawn: false };
  // Outside the wall: stalls with their backs to it, a dirt lane along their fronts.
  const [near, far] = ends(yard);
  if (near) way(world, plot, near, far, U, '#9a8466');
  for (const piece of cast(yard)) put(world, plot, ...piece);
  return { plot, ...yard, drawn: true };
}

export const s2: EarthBrief = {
  id: 'S2',
  seed: 202,
  facing: 29,
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
    const life = world.quality.life;
    const land = faces.filter((f) => f.land && f.biome !== 'ice');

    // Each company's seat. Its walls take no part in the digging or the ploughing.
    const homes = companies.map((company) => seatAt(world, company.lat, company.lon));
    const walled = (face: Face) =>
      homes.some((home, i) => home.up.angleTo(face.up) < (i ? 0.115 : 0.16));

    // Surface modification: the published fraction is dug ground, gathered into mining districts.
    const pits = diggings.map((d) => {
      const seat = seatAt(world, d.lat, d.lon, mineable);
      return { seat, up: seat.up, pull: d.pull };
    });
    const target = coveredFaces(earth.surface_modification, faces.length);
    const worked = gather(faces, target, pits, (f) =>
      f.land && mineable.includes(f.biome) && !walled(f)
        ? (f.biome === 'desert' ? 0.1 : 0) + random() * 0.03
        : null,
    );
    for (const face of worked) {
      face.used = true;
      const seam = face.up.angleTo(pits[owner(face, pits).index].up);
      face.tone = cuts[Math.floor(seam / 0.075) % cuts.length];
    }
    const dug = new Set(worked);

    // Monoculture: the agricultural-pollution decade sets how much land is ploughed flat, in
    // estates of one crop each, every furrow of an estate running the same way.
    const farms = estates.map((e) => {
      const seat = seatAt(world, e.lat, e.lon, arable);
      return { ...e, up: seat.up };
    });
    const plough = Math.round(land.length * decades(earth.agricultural_pollution, 0.1, 100) * 0.35);
    const fields = gather(faces, plough, farms, (f) =>
      f.land && arable.includes(f.biome) && !walled(f) ? random() * 0.03 : null,
    );
    for (const face of fields) {
      const estate = farms[owner(face, farms).index];
      const { east, north } = tangents(face.up);
      furrows(
        world,
        face,
        estate.crop,
        east.multiplyScalar(Math.cos(estate.turn)).addScaledVector(north, Math.sin(estate.turn)),
      );
    }

    // The great pit, the selectable mine: the Sahara, its axis running north to the sea.
    const great = dug.has(pits[0].seat) ? pits[0].seat : worked[0];
    let oreQuay: THREE.Vector3 | null = null;
    if (great) {
      const north = coastAt(world, 35, 8);
      const plot: Plot = {
        centre: great.up.clone(),
        turn: north ? bearing(great.up, north.up) : Math.PI / 2,
      };
      world.occupy(plot.centre, 8.5 * U);
      // The spoil heap lies west, the excavator works the east rim, the yard is north.
      dig(
        world,
        world.layer('pit-mine', 'surface', { landmark: 'pit-mine' }),
        great,
        plot.turn + Math.PI / 2,
        0.15,
      );
      put(world, plot, 'excavator', 0.2, -5, Math.PI / 2, 0.6, '#e0a830');
      // Ore goes north by belt to a row of silos on the quay, as near the shore as all three fit.
      const shore = shoreline(world, plot, 5, 12);
      let yard = Math.min((shore ?? 8) - 1.4, 6.6);
      while (yard > 4.8 && ![-1.7, 0, 1.7].every((y) => dry(world, plot, yard, y, 0.5)))
        yard -= 0.2;
      line(world, plot, [1.9, 0], [yard - 0.6, 0], 0.34 * U, '#4a4038');
      put(world, plot, 'pipe-rack', yard - 1.62, 0, 0, 0.45);
      for (const silo of row('silo', 3, [yard, -1.7], Math.PI / 2, 1.7, 0, 0.8))
        put(world, plot, ...silo);
      put(world, plot, 'haul-truck', yard - 1.9, 3.1, 0, 0.5);
      put(world, plot, 'worker', yard - 0.9, -3.3, Math.PI, 1);
      if (shore) {
        dock(world, plot, shore, Math.max(shore + 1.25, yard + 2.1));
        oreQuay = at(plot, shore + 4, 0);
      }
    }

    // The red company's line runs south from the selectable enclave: its gate, the road, the
    // spaceport that ships to the Moon and Mars, the fuel yard, the terminal, the rigs.
    const hq = homes[0];
    const padSeat = seatAt(world, 37, 63.5);
    const reach = hq.up.angleTo(padSeat.up) / U;
    // The spaceport first: where a light tier thins the cast, the rocket outranks the gate.
    let terminal: THREE.Vector3 | null = null;
    let jetty: THREE.Vector3 | null = null;
    {
      const coast = coastAt(world, 25, 66);
      const plot: Plot = {
        centre: padSeat.up.clone(),
        turn: coast ? bearing(padSeat.up, coast.up) : -Math.PI / 2,
      };
      padSeat.used = true;
      world.occupy(plot.centre, 6.5 * U);
      put(world, plot, 'launch-site', 0, 0, 0, 0.75);
      // The fuel yard: tanks in a row across the axis, one pipe on to the terminal dock.
      const shore = shoreline(world, plot, 3, 10);
      const yard = Math.max(2.65, Math.min(3.25, (shore ?? 5) - 0.85));
      for (const tank of row('oil-tank', 3, [yard, -1.9], Math.PI / 2, 1.9, 0, 0.55))
        put(world, plot, ...tank);
      line(world, plot, [yard, -1.9], [yard, 1.9], 0.16 * U, '#6f757c');
      put(world, plot, 'dish', 0.3, 3.5, 0.4, 0.8);
      put(world, plot, 'worker', 1.9, -2.7, 0, 1);
      if (shore) {
        line(world, plot, [yard, 0], [shore, 0], 0.16 * U, '#6f757c');
        dock(world, plot, shore, Math.max(shore + 1.3, yard + 2.3));
        jetty = at(plot, shore, 0);
        terminal = at(plot, shore + 4, 0);
      }
    }

    const red = compound(world, world.layer('enclave', 'surface', { landmark: 'enclave' }), hq, {
      aim: bearing(hq.up, padSeat.up),
      fixed: true,
      size: 0.16,
      colour: colours[0],
      flank: companies[0].flank,
      stalls: ['market', 'shanty-dark', 'shanty-dark'],
      sign: 'guard',
      extras: ({ corner, gate, lane, front, flank }) => [
        // The company titan stands beside the wall, facing the way the gate does.
        ['titan', 0.2, -flank * (corner + 2.3), 0, 1.15, colours[0]],
        // A checkpoint on the road, where there is road enough between gate and launch pad.
        ...(reach - 2.75 >= gate + 1.85
          ? ([
              [
                'checkpoint',
                Math.min(gate + 1.9, reach - 2.75),
                -flank * 1.35,
                0,
                0.6,
                colours[0],
                true,
              ],
              ['guard', Math.min(gate + 1.9, reach - 2.75), flank * 1.2, 0, 1, colours[0]],
            ] satisfies Piece[])
          : []),
        // Tents across the lane from the shanties.
        ...row('tent', 2, [front - 1.35, lane + flank * 1.4], Math.PI, 2.7, 0, 0.9, '#8a8f96'),
      ],
    });
    if (life) {
      put(world, red.plot, citizens.kinds[1], red.front - 1.4, red.lane, Math.PI, 1, earthy[2]);
      world.traffic.add(
        citizens.walkers[2],
        makeRoute(
          [0, 1, 2, 3, 4, 5, 6].map((k) =>
            world.surface.point(
              at(red.plot, red.front + 1.2 - k * 1.1, red.lane - red.flank * 0.25),
              0.0002,
            ),
          ),
        ),
        { count: 2, speed: 0.0012, tints: earthy, random },
      );
    }
    // Rival enclaves: the same fortress in five other colours, each on its own ground and laid
    // out the same way.
    const toward: (THREE.Vector3 | undefined)[] = [
      undefined,
      great?.up,
      coastAt(world, -14, -36)?.up,
      pits[3].seat.up,
      coastAt(world, 33, 122)?.up,
      pits[2].seat.up,
    ];
    companies.forEach((company, i) => {
      if (!i) return;
      const home = homes[i];
      const aim = toward[i];
      const yard = compound(world, world.ground, home, {
        aim: aim ? bearing(home.up, aim) : 0,
        size: 0.115,
        colour: company.colour,
        flank: company.flank,
        stalls: Array.from({ length: company.shanties }, () => 'shanty-dark'),
        sign: 'lane',
        // One rival fields a titan of its own, at its back wall.
        extras: ({ corner, flank }) =>
          i === 2 ? [['titan', -(corner + 2.2), -flank * 0.6, 0, 1.15, company.colour]] : [],
      });
      if (life && yard.drawn && company.shanties)
        put(world, yard.plot, citizens.kinds[i % 4], yard.front - 1.35, yard.lane, 0, 1, earthy[i]);
    });

    // The oil field: a row of derricks on one pipe that runs down to the sea.
    if (dug.has(pits[1].seat)) {
      const seat = pits[1].seat;
      const coast = coastAt(world, 23, 58.5);
      const derricks = row('derrick', 3, [-0.4, -1.5], Math.PI / 2, 2.7, 0, 0.7);
      const { turn } = settle(
        world,
        seat.up,
        coast ? bearing(seat.up, coast.up) : 0,
        1,
        anyway,
        () => derricks.map(([, x, y]): [number, number] => [x, y]),
      );
      const plot: Plot = { centre: seat.up.clone(), turn };
      world.occupy(plot.centre, 6 * U);
      for (const derrick of derricks) put(world, plot, ...derrick);
      line(world, plot, [-1.1, 4.6], [-1.1, -3.4], 0.16 * U, '#6f757c');
      put(world, plot, 'worker', -2.2, 1.2, 0, 1);
    }

    // Lesser workings, one pit and its headframe each, and a road to the company that owns
    // them where there is room for one. The Gobi and the Kalahari are worked out and left bare.
    const fleet = (tint: Tone, kinds: string[]) => ({
      width: 1.3 * U,
      tone: '#6a5a48',
      neighbours: 1,
      reach: 4,
      traffic: { kinds, per: 1, speed: 0.009, size: 0.5, tints: [tint] },
    });
    (
      [
        [2, 5],
        [3, 3],
      ] as const
    ).forEach(([i, company]) => {
      const seat = pits[i].seat;
      if (!dug.has(seat) || seat === great) return;
      const plot: Plot = { centre: seat.up.clone(), turn: bearing(seat.up, homes[company].up) };
      world.occupy(plot.centre, 4.5 * U);
      dig(world, world.ground, seat, plot.turn + Math.PI, 0.1);
      const side = dry(world, plot, 0.3, 3.5, 1.6) ? 1 : -1;
      put(world, plot, 'mining-rig', 0.3, side * 3.5, (-side * Math.PI) / 2, 0.8);
      put(world, plot, 'worker', 0.9, -side * 2.6, 0, 1);
      if (seat.up.angleTo(homes[company].up) > 6.6 * U)
        roads(
          world,
          [node(seat.up, 3), node(homes[company].up, 2.2)],
          fleet(colours[company], ['haul-truck']),
        );
      if (!life) return;
      const loop: THREE.Vector3[] = [];
      for (let k = 0; k < 14; k++)
        loop.push(world.surface.point(offset(seat.up, (k / 14) * Math.PI * 2, 0.105), 0.001));
      world.traffic.add('spider-bot', makeRoute(loop, true), {
        count: 1,
        speed: 0.003,
        size: 0.8,
        pingpong: false,
        random,
      });
    });

    // The haul road from the great pit to the yellow enclave, the crew's camp beside it, and
    // the red company's road from its gate to its spaceport.
    if (great) {
      const south = bearing(great.up, homes[1].up);
      const camp: Plot = { centre: offset(great.up, south, 6 * U), turn: south };
      for (const tent of row('tent', 2, [0, -1.8], 0, 1.9, Math.PI / 2, 0.9, '#c4955f'))
        put(world, camp, ...tent);
      put(world, camp, 'campfire', 0.95, -3.1, 0, 1);
      roads(
        world,
        [node(great.up, 2.5), node(homes[1].up, 2.2)],
        fleet(colours[1], ['haul-truck']),
      );
    }
    roads(world, [node(hq.up, 2.3), node(padSeat.up, 2.6)], fleet(colours[0], ['truck']));

    // The rig field: the selectable platform and two more off the red company's terminal, and
    // one rig each in two other seas.
    const shelf = faces.filter((f) => !f.land && f.biome === 'shallows' && !f.used);
    const rigs: Face[] = [];
    const rigAt = (lat: number, lon: number, apart: number) => {
      const here = world.faceAt(lat, lon).up;
      const rank = (f: Face) => f.up.angleTo(here) + (f.coastal ? 0.05 : 0);
      const face = shelf
        .filter(
          (f) =>
            rigs.every((r) => r.up.angleTo(f.up) > apart) && (!jetty || jetty.angleTo(f.up) > 0.2),
        )
        .sort((a, b) => rank(a) - rank(b))[0];
      if (face) rigs.push(face);
    };
    rigAt(20, 64, 0);
    rigAt(16, 57, 0.2);
    rigAt(22, 72, 0.2);
    rigAt(57, 14, 0.5);
    rigAt(27, -92, 0.5);
    rigs.forEach((face, i) => {
      face.used = true;
      const layer =
        i === 0 ? world.layer('platform', 'surface', { landmark: 'platform' }) : world.ground;
      offshoreRig(layer, world.on(face, 0.6, 1, 0), i === 0 ? 0.13 : 0.085);
    });

    // Shipping: ore across the inland sea, oil between the rigs and the terminal.
    const roadstead = coastAt(world, 44, 16);
    const ports = [terminal, ...rigs.slice(0, 3).map((r) => r.up.clone())].filter(
      (p): p is THREE.Vector3 => !!p,
    );
    seaLanes(world, ports, { kinds: ['tanker'], per: 1, speed: 0.007, tints: ['#2a2d33'] });
    if (oreQuay && roadstead)
      seaLanes(
        world,
        [oreQuay, roadstead.up.clone()],
        { kinds: ['ship'], per: 1, speed: 0.007, tints: ['#c4452f'] },
        1,
      );
    harbourLoops(
      world,
      [oreQuay, terminal].filter((p): p is THREE.Vector3 => !!p),
      { kinds: ['fishing', 'ferry'], per: 1, speed: 0.003 },
    );
    flights(
      world,
      homes.map((home) => home.up.clone()),
      { kinds: ['plane', 'cargo-drone'], per: 1, speed: 0.03, size: 0.9, tints: colours },
      3,
    );

    chaoticSwarm(world, satelliteCount(earth.satellite_belt), [1.1, 1.3], {
      size: 0.009,
      body: '#a7a39d',
      wings: colours,
      light: '#ffd28a',
      lightShare: 0.2,
      broken: 0.08,
    });
  },
};
