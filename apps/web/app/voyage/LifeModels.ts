import * as THREE from 'three';
import { Sculpture } from './sculpture';
import { curveTube, loft, membrane, panel } from './modeling';

export type VehicleKind =
  | 'city-car'
  | 'haul-truck'
  | 'community-bus'
  | 'bio-transit'
  | 'service-rover'
  | 'cargo-cycle'
  | 'salvage-rover';
export type AnimalKind = 'deer' | 'ibex' | 'crane' | 'bio-ray';
const m = new THREE.Matrix4();

/** Proportions and construction differ by use: passenger capsule, load bed, cargo trike, pressure rover. */
export function vehicle(s: Sculpture, kind: VehicleKind, wheels = true, equipment = true) {
  const truck = kind === 'haul-truck',
    rover = kind.includes('rover'),
    bus = kind === 'community-bus',
    cycle = kind === 'cargo-cycle';
  const color = truck
    ? '#c88d48'
    : rover
      ? '#b9bdba'
      : kind === 'bio-transit'
        ? '#9abda7'
        : bus
          ? '#d4c798'
          : '#bcc7c2';
  if (cycle) {
    s.bar([-0.04, 0.04, -0.065], [0.035, 0.08, 0.075], 0.006, '#577b77');
    s.bar([0.035, 0.08, 0.075], [0, 0.105, -0.07], 0.006, '#577b77');
    s.box([0.085, 0.055, 0.083], '#b18d58', [0, 0.092, 0.063]);
    for (const x of [-0.043, 0.043]) s.box([0.005, 0.08, 0.087], '#d2b17b', [x, 0.1, 0.063]);
    s.bar([0, 0.09, -0.07], [0, 0.16, -0.045], 0.005, '#a7aaa0');
    s.bar([-0.032, 0.16, -0.045], [0.032, 0.16, -0.045], 0.0035, '#334e4c');
    s.box([0.036, 0.012, 0.039], '#644e3e', [0, 0.136, -0.002]);
    s.ico(0.035, '#557c76', [0, 0.178, -0.006], [0.6, 1.05, 0.65], undefined, 1);
    s.ico(0.017, '#c5a281', [0, 0.228, -0.018], [1, 1.15, 1], undefined, 1);
    s.ico(0.018, '#d3c39c', [0, 0.238, -0.018], [1, 0.55, 1.15]);
    for (const side of [-1, 1]) {
      s.bar([side * 0.018, 0.2, -0.01], [side * 0.022, 0.18, -0.033], 0.0055, '#557c76');
      s.bar([side * 0.022, 0.18, -0.033], [side * 0.026, 0.16, -0.045], 0.004, '#c5a281');
      s.bar([side * 0.016, 0.151, 0.002], [side * 0.023, 0.103, -0.012], 0.006, '#405a62');
    }
  } else {
    s.add(
      loft([
        [-0.133, 0.026, 0.045, 0.062],
        [-0.109, 0.063, 0.034, 0.07],
        [0.07, 0.065, 0.035, 0.068],
        [0.127, 0.044, 0.042, 0.069],
      ]),
      '#304451',
    );
    if (truck) {
      s.box([0.13, 0.045, 0.088], color, [0, 0.088, -0.086]);
      s.add(
        loft([
          [-0.13, 0.042, 0.097, 0.104],
          [-0.109, 0.05, 0.098, 0.147],
          [-0.055, 0.051, 0.095, 0.147],
          [-0.043, 0.048, 0.09, 0.11],
        ]),
        '#dcb575',
      );
      s.box([0.089, 0.033, 0.004], '#244656', [0, 0.124, -0.126]);
      if (equipment) truckBed(s);
      s.bar([-0.062, 0.073, -0.144], [0.062, 0.073, -0.144], 0.006, '#d4bd91');
      s.bar([0.057, 0.087, -0.091], [0.057, 0.199, -0.091], 0.005, '#3b484d');
    } else {
      s.add(
        loft([
          [-0.126, 0.023, 0.069, 0.081],
          [-0.087, 0.058, 0.063, 0.116],
          [-0.051, 0.06, 0.063, bus ? 0.156 : 0.131],
          [0.063, 0.055, 0.062, bus ? 0.153 : 0.126],
          [0.124, 0.029, 0.061, 0.084],
        ]),
        color,
      );
      s.add(
        loft([
          [-0.092, 0.039, 0.091, 0.101],
          [-0.055, 0.055, 0.092, bus ? 0.147 : 0.125],
          [0.056, 0.051, 0.092, bus ? 0.144 : 0.12],
          [0.079, 0.04, 0.088, 0.102],
        ]),
        '#2e5a68',
      );
      for (const z of bus ? [-0.05, -0.015, 0.025, 0.063] : [-0.026, 0.054])
        s.box([0.116, 0.049, 0.005], color, [0, bus ? 0.124 : 0.112, z]);
      s.box([0.102, 0.007, 0.116], color, [0, bus ? 0.153 : 0.132, 0.002]);
      if (rover) {
        s.box([0.1, 0.033, 0.09], '#9d9c87', [0, 0.15, 0.037]);
        panel(s, m, 0.097, 0.079, [0, 0.17, 0.045], 0);
        s.bar([0.034, 0.17, 0.074], [0.034, 0.225, 0.074], 0.003, '#d2bb90');
        s.ico(0.012, '#d8ac76', [0.034, 0.227, 0.074], [1, 0.5, 1]);
        for (const side of [-1, 1])
          s.bar([side * 0.062, 0.073, -0.1], [side * 0.083, 0.055, 0.086], 0.0045, '#b0aea3');
      }
      if (kind === 'bio-transit')
        for (const side of [-1, 1])
          curveTube(
            s,
            [
              [side * 0.06, 0.07, -0.11],
              [side * 0.065, 0.126, -0.06],
              [side * 0.063, 0.123, 0.062],
              [side * 0.032, 0.085, 0.12],
            ],
            0.004,
            '#e4dabc',
          );
    }
    for (const x of [-0.046, 0.046]) {
      s.box([0.024, 0.009, 0.006], '#f0d5a0', [x, 0.074, -0.128]);
      s.box([0.017, 0.007, 0.005], '#b46550', [x, 0.071, 0.122]);
      s.box([0.021, 0.015, 0.022], color, [x * 1.5, 0.111, -0.042]);
    }
  }
  if (wheels) vehicleWheels(s, kind);
}

export function truckBed(s: Sculpture, payload = true) {
  s.box([0.14, 0.023, 0.148], '#9c6b3c', [0, 0.101, 0.046]);
  for (const x of [-0.065, 0.065]) s.box([0.012, 0.061, 0.151], '#d8a557', [x, 0.135, 0.046]);
  for (const z of [-0.025, 0.116]) s.box([0.14, 0.055, 0.012], '#c88d48', [0, 0.132, z]);
  if (payload) truckLoad(s);
}

export function truckLoad(s: Sculpture) {
  for (let i = 0; i < 5; i++)
    s.ico(
      0.031,
      i % 2 ? '#b9a182' : '#7b7161',
      [((i % 2) - 0.5) * 0.061, 0.143, Math.floor(i / 2) * 0.04],
      [1, 0.65, 0.85],
    );
}

export function wheel(s: Sculpture, kind: VehicleKind) {
  const r = kind === 'haul-truck' ? 0.045 : kind === 'cargo-cycle' ? 0.036 : 0.031;
  s.add(
    new THREE.CylinderGeometry(r, r, kind === 'cargo-cycle' ? 0.009 : 0.022, 12),
    '#273840',
    undefined,
    [0, 0, Math.PI / 2],
  );
  for (const side of [-1, 1]) {
    s.add(
      new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.002, 10),
      '#a4adab',
      [side * (kind === 'cargo-cycle' ? 0.005 : 0.012), 0, 0],
      [0, 0, Math.PI / 2],
    );
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      s.bar(
        [side * 0.013, 0, 0],
        [side * 0.013, Math.cos(a) * r * 0.51, Math.sin(a) * r * 0.51],
        0.0023,
        '#546773',
      );
    }
  }
}
export function wheelSites(kind: VehicleKind): [number, number, number][] {
  if (kind === 'cargo-cycle')
    return [
      [0, 0.036, -0.072],
      [-0.054, 0.036, 0.072],
      [0.054, 0.036, 0.072],
    ];
  return [-1, 1].flatMap((side) =>
    (kind === 'haul-truck' || kind === 'service-rover'
      ? [-0.08, 0.029, 0.09]
      : [-0.077, 0.081]
    ).map(
      (z) => [side * 0.064, kind === 'haul-truck' ? 0.045 : 0.031, z] as [number, number, number],
    ),
  );
}
export function vehicleWheels(s: Sculpture, kind: VehicleKind) {
  const part = new Sculpture();
  wheel(part, kind);
  const g = part.finish();
  for (const p of wheelSites(kind)) s.add(g.clone(), null, p);
  g.dispose();
}

/** A small quadruped is articulated at shoulders, hips and knees; the head remains anatomically legible. */
export function animalBody(s: Sculpture, kind: AnimalKind, includeHead = true) {
  if (kind === 'crane' || kind === 'bio-ray') {
    s.add(
      loft([
        [-0.112, 0.008, -0.012, 0.008],
        [-0.066, 0.03, -0.025, 0.027],
        [0.031, 0.032, -0.019, 0.028],
        [0.098, 0.008, -0.005, 0.006],
      ]),
      kind === 'crane' ? '#e4dfcd' : '#8ab7aa',
    );
    if (kind === 'crane') {
      curveTube(
        s,
        [
          [0, 0.005, -0.069],
          [0, 0.033, -0.097],
          [0, 0.053, -0.12],
          [0, 0.042, -0.155],
        ],
        0.01,
        '#eee6ce',
      );
      s.ico(0.016, '#dddac6', [0, 0.044, -0.152], [0.85, 0.95, 1.25], undefined, 1);
      s.add(
        loft([
          [-0.2, 0.0001, 0.039, 0.04],
          [-0.164, 0.006, 0.036, 0.045],
        ]),
        '#ae8f5f',
      );
      for (const side of [-1, 1]) {
        s.ico(0.0038, '#20363d', [side * 0.013, 0.047, -0.16]);
        s.bar([side * 0.01, -0.012, 0.05], [side * 0.012, -0.02, 0.158], 0.0025, '#6e6758');
      }
    } else {
      s.ico(0.025, '#c5d9b4', [0, 0.019, -0.083], [0.8, 0.6, 1.3]);
      curveTube(
        s,
        [
          [0, 0, 0.075],
          [0, 0.018, 0.15],
          [0.026, -0.01, 0.21],
        ],
        0.005,
        '#cbba95',
      );
    }
    for (const side of [-1, 1])
      s.add(
        membrane(
          [
            [0, 0.02, 0],
            [side * 0.05, 0.055, 0],
            [side * 0.08, 0.025, 0.004],
          ],
          0.07,
          0.003,
        ),
        kind === 'crane' ? '#4c6266' : '#c9b1b8',
        [0, -0.001, 0.055],
      );
    return;
  }
  const coat = kind === 'deer' ? '#b89766' : '#8f9485';
  s.add(
    loft([
      [-0.099, 0.027, 0.139, 0.194],
      [-0.045, 0.05, 0.111, 0.192],
      [0.036, 0.047, 0.114, 0.18],
      [0.085, 0.029, 0.138, 0.177],
    ]),
    coat,
  );
  if (includeHead) animalHead(s, kind);
  s.ico(0.019, kind === 'deer' ? '#e6d6ae' : '#c1bb9f', [0, 0.166, 0.092], [0.55, 0.68, 1.3]);
}
export function animalHead(s: Sculpture, kind: AnimalKind) {
  const coat = kind === 'deer' ? '#b89766' : '#8f9485';
  s.ico(
    0.048,
    kind === 'deer' ? '#d5b17c' : '#a5a38b',
    [0, 0.19, -0.087],
    [0.63, 1.48, 0.84],
    undefined,
    1,
  );
  s.add(
    loft([
      [-0.18, 0.01, 0.225, 0.24],
      [-0.146, 0.023, 0.221, 0.254],
      [-0.099, 0.024, 0.218, 0.256],
      [-0.084, 0.008, 0.225, 0.241],
    ]),
    coat,
  );
  s.ico(0.012, '#303c38', [0, 0.232, -0.181], [1, 0.65, 0.45]);
  for (const side of [-1, 1]) {
    s.ico(0.004, '#233938', [side * 0.022, 0.247, -0.132], [0.5, 1, 1], undefined, 1);
    s.add(
      membrane(
        [
          [0, 0.018, 0],
          [side * 0.016, 0.032, 0.026],
          [side * 0.036, 0.001, 0.033],
        ],
        0,
        0.004,
      ),
      '#bda780',
      [side * 0.016, 0.252, -0.095],
      [0, 0, side * -0.15],
    );
    const horn = kind === 'ibex';
    curveTube(
      s,
      [
        [side * 0.014, 0.25, -0.105],
        [side * 0.021, 0.29, -0.09],
        [side * 0.032, 0.325, -0.066],
        [side * 0.043, 0.34, horn ? -0.02 : -0.04],
      ],
      0.0035,
      horn ? '#515d57' : '#ddd0a7',
    );
    if (!horn) {
      s.bar([side * 0.032, 0.325, -0.066], [side * 0.061, 0.358, -0.085], 0.0026, '#ddd0a7');
      s.bar([side * 0.021, 0.29, -0.09], [side * 0.044, 0.326, -0.112], 0.0026, '#ddd0a7');
    }
  }
}

export function animalLeg(s: Sculpture, kind: AnimalKind, lower = false) {
  const coat = kind === 'deer' ? '#ac895d' : '#909482';
  s.add(
    loft(
      lower
        ? [
            [0, 0.007, -0.007, 0.007],
            [0.032, 0.005, -0.005, 0.005],
            [0.071, 0.004, -0.004, 0.004],
          ]
        : [
            [0, 0.011, -0.012, 0.012],
            [0.022, 0.016, -0.014, 0.014],
            [0.058, 0.007, -0.007, 0.007],
            [0.076, 0.006, -0.006, 0.006],
          ],
      8,
    ),
    coat,
    undefined,
    [Math.PI / 2, 0, 0],
  );
  if (lower)
    s.add(
      loft([
        [-0.013, 0.004, -0.008, 0.004],
        [-0.009, 0.008, -0.008, 0.005],
        [0.009, 0.007, -0.008, 0.002],
      ]),
      '#465049',
      [0, -0.073, -0.002],
    );
}
export function wing(s: Sculpture, kind: AnimalKind, side: number) {
  const bio = kind === 'bio-ray';
  s.add(
    membrane(
      [
        [0, 0.055, 0.003],
        [side * 0.055, 0.095, 0.027],
        [side * 0.11, 0.105, 0.013],
        [side * 0.175, 0.075, -0.001],
        [side * 0.24, 0.009, 0.009],
      ],
      bio ? 0.045 : 0.022,
      bio ? 0.016 : 0.008,
    ),
    bio ? '#9bc6be' : '#e4ddc7',
  );
  for (let i = 0; i < 5; i++)
    s.add(
      membrane(
        [
          [side * (0.07 + i * 0.026), 0.023, -0.002],
          [side * (0.115 + i * 0.027), 0.017, -0.007],
          [side * (0.15 + i * 0.022), 0.001, 0],
        ],
        0.071,
        0.003,
      ),
      bio ? (i % 2 ? '#dababb' : '#b7d5b4') : '#506971',
      [0, 0, 0.017 + i * 0.008],
    );
}
