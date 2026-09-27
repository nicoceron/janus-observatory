import * as THREE from 'three';
import { Sculpture } from './sculpture';
import { loft, membrane } from './modeling';
export type AircraftKind = 'regional-plane' | 'survey-drone';
export type MachineKind = 'maintenance-walker' | 'salvage-crane';
const cream = '#dfddc9',
  steel = '#586f77',
  dark = '#253f4c',
  gold = '#b9a16c';
export function flyingMachine(s: Sculpture, kind: AircraftKind) {
  if (kind === 'survey-drone') {
    s.add(
      loft([
        [-0.13, 0.014, 0.005, 0.041],
        [-0.075, 0.045, -0.016, 0.051],
        [0.062, 0.034, -0.01, 0.039],
        [0.119, 0.012, 0.008, 0.025],
      ]),
      steel,
    );
    for (const x of [-0.105, 0.105]) {
      s.bar([0, 0.012, 0], [x, 0.012, 0], 0.009, cream);
      s.add(
        new THREE.TorusGeometry(0.062, 0.009, 6, 20),
        cream,
        [x, 0.015, 0],
        [Math.PI / 2, 0, 0],
      );
      s.bar([x, -0.01, -0.052], [x, 0.01, 0.052], 0.003, steel);
    }
    s.ico(0.027, dark, [0, -0.037, -0.06], [1, 0.85, 1.15], undefined, 1);
    s.ico(0.018, '#68afab', [0, -0.042, -0.08], [0.8, 0.8, 0.2], undefined, 1);
    for (const x of [-0.025, 0.025]) s.bar([x, -0.014, 0.03], [x, -0.05, 0.04], 0.0035, cream);
    return;
  }
  s.add(
    loft([
      [-0.267, 0.006, 0.004, 0.017],
      [-0.225, 0.026, -0.017, 0.047],
      [-0.12, 0.037, -0.025, 0.055],
      [0.125, 0.029, -0.013, 0.043],
      [0.224, 0.01, 0.002, 0.029],
      [0.249, 0.003, 0.011, 0.018],
    ]),
    cream,
  );
  s.add(
    loft([
      [-0.22, 0.019, 0.024, 0.036],
      [-0.185, 0.029, 0.033, 0.052],
      [-0.132, 0.031, 0.038, 0.053],
    ]),
    '#31596a',
  );
  for (const side of [-1, 1]) {
    s.add(
      membrane(
        [
          [0, 0.16, 0.038],
          [side * 0.13, 0.152, 0.046],
          [side * 0.27, 0.095, 0.064],
          [side * 0.35, 0.037, 0.082],
        ],
        0.03,
        0.011,
      ),
      '#d4c8a7',
    );
    s.add(
      membrane(
        [
          [0, 0.073, 0.025],
          [side * 0.07, 0.055, 0.033],
          [side * 0.13, 0.035, 0.055],
        ],
        0.012,
        0.003,
      ),
      '#688c94',
      [0, 0, 0.18],
    );
    s.add(
      loft([
        [-0.14, 0.019, 0.005, 0.031],
        [-0.115, 0.027, -0.003, 0.041],
        [-0.017, 0.02, 0.007, 0.036],
        [0.002, 0.005, 0.015, 0.03],
      ]),
      '#598992',
      [side * 0.155, 0.014, 0],
    );
    for (let i = 0; i < 5; i++)
      s.ico(0.009, dark, [side * 0.033, 0.026, -0.07 + i * 0.037], [0.17, 0.77, 1], undefined, 1);
    s.bar([side * 0.049, -0.014, 0.025], [side * 0.055, -0.056, 0.026], 0.0035, steel);
    s.add(
      new THREE.CylinderGeometry(0.014, 0.014, 0.009, 10),
      dark,
      [side * 0.055, -0.056, 0.026],
      [0, 0, Math.PI / 2],
    );
  }
  const fin = new THREE.Shape();
  fin.moveTo(0, 0);
  fin.lineTo(0.079, 0.005);
  fin.lineTo(0.022, 0.09);
  fin.lineTo(-0.013, 0.076);
  fin.closePath();
  s.add(
    new THREE.ExtrudeGeometry(fin, { depth: 0.006, bevelEnabled: false }),
    '#688c94',
    [-0.003, 0.025, 0.148],
    [0, Math.PI / 2, 0],
  );
  s.bar([0, -0.015, -0.18], [0, -0.051, -0.18], 0.0035, steel);
  s.add(
    new THREE.CylinderGeometry(0.011, 0.011, 0.008, 10),
    dark,
    [0, -0.052, -0.18],
    [0, 0, Math.PI / 2],
  );
}
export function propeller(s: Sculpture, kind: AircraftKind) {
  const drone = kind === 'survey-drone';
  for (let i = 0; i < (drone ? 4 : 3); i++) {
    const a = (i * Math.PI * 2) / (drone ? 4 : 3);
    s.add(
      loft([
        [0, 0.004, -0.002, 0.002],
        [0.025, 0.009, -0.002, 0.002],
        [0.051, 0.004, -0.001, 0.002],
      ]),
      dark,
      undefined,
      undefined,
      undefined,
      drone
        ? new THREE.Matrix4().makeRotationY(a)
        : new THREE.Matrix4()
            .makeRotationZ(a)
            .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)),
    );
  }
  s.ico(0.009, gold, [0, 0, 0], [1, 1, 1], undefined, 1);
}
export function machineBody(s: Sculpture, kind: MachineKind) {
  if (kind === 'maintenance-walker') {
    s.add(
      loft([
        [-0.115, 0.02, 0.085, 0.109],
        [-0.073, 0.058, 0.075, 0.135],
        [0.066, 0.057, 0.08, 0.13],
        [0.109, 0.023, 0.091, 0.112],
      ]),
      '#c2c4b5',
    );
    s.box([0.045, 0.021, 0.08], dark, [0, 0.134, 0.004]);
    for (const z of [-0.03, 0, 0.03]) s.box([0.073, 0.005, 0.006], gold, [0, 0.147, z]);
    for (const side of [-1, 1]) {
      s.cylinder(0.014, 0.014, 0.066, '#91ada7', [side * 0.033, 0.151, 0.03], undefined, 8);
      s.ico(0.012, '#72bbb5', [side * 0.031, 0.11, -0.102], [1, 0.8, 0.4], undefined, 1);
    }
    return;
  }
  for (const side of [-1, 1]) {
    s.box([0.045, 0.062, 0.235], dark, [side * 0.076, 0.039, 0.018]);
    for (let j = 0; j < 12; j++)
      for (const y of [0.009, 0.073])
        s.box([0.049, 0.01, 0.012], steel, [side * 0.076, y, -0.08 + j * 0.018]);
    for (const z of [-0.073, 0.014, 0.102])
      s.add(
        new THREE.CylinderGeometry(0.027, 0.027, 0.006, 10),
        gold,
        [side * 0.101, 0.04, z],
        [0, 0, Math.PI / 2],
      );
  }
  s.box([0.133, 0.035, 0.166], '#947759', [0, 0.087, 0.026]);
  s.box([0.059, 0.078, 0.084], '#b9aa89', [-0.039, 0.139, -0.045]);
  s.box([0.051, 0.034, 0.004], dark, [-0.039, 0.154, -0.089]);
  s.box([0.004, 0.033, 0.058], dark, [-0.07, 0.153, -0.05]);
  s.box([0.065, 0.007, 0.092], '#7c9a91', [-0.039, 0.181, -0.045]);
  s.cylinder(0.041, 0.047, 0.026, steel, [0.025, 0.12, 0.038], undefined, 10);
  for (let j = 0; j < 3; j++) s.box([0.006, 0.035, 0.052], dark, [0.016 + j * 0.021, 0.12, 0.086]);
}
export function walkerLeg(s: Sculpture, side: number) {
  s.ico(0.013, gold, [0, 0, 0]);
  s.bar([0, 0, 0], [side * 0.067, -0.01, -0.016], 0.0075, '#b6c1b4');
  s.ico(0.01, steel, [side * 0.067, -0.01, -0.016]);
  s.bar([side * 0.067, -0.01, -0.016], [side * 0.097, -0.093, 0.013], 0.0055, '#aab9b0');
  s.box([0.025, 0.009, 0.032], dark, [side * 0.097, -0.099, 0.013]);
}
export function serviceTool(s: Sculpture) {
  s.bar([0, 0, 0], [0, -0.039, -0.045], 0.006, steel);
  s.bar([0, -0.039, -0.045], [0, -0.076, -0.052], 0.0045, gold);
  s.cylinder(0.012, 0.018, 0.013, '#68b7ad', [0, -0.08, -0.052], undefined, 8);
}
export function craneBoom(s: Sculpture, payload = true) {
  for (const x of [-0.012, 0.012]) {
    s.bar([x, 0, 0], [x, 0.153, -0.169], 0.0055, '#bca271');
    s.bar([x, 0.026, 0.021], [x, 0.17, -0.158], 0.0045, '#bca271');
  }
  for (let i = 0; i < 5; i++)
    s.bar(
      [-0.012, i * 0.03, -i * 0.033],
      [0.012, i * 0.03 + 0.026, -i * 0.033 + 0.019],
      0.0025,
      steel,
    );
  s.bar([0, -0.018, -0.02], [0, 0.086, -0.093], 0.006, steel);
  s.ico(0.014, dark, [0, 0.16, -0.167]);
  s.bar([0, 0.16, -0.167], [0, -0.021, -0.167], 0.0018, steel);
  s.add(new THREE.TorusGeometry(0.009, 0.0025, 5, 12), gold, [0, -0.024, -0.167]);
  if (payload) salvageLoad(s);
}

export function salvageLoad(s: Sculpture) {
  s.box([0.13, 0.015, 0.016], '#927661', [0, -0.04, -0.167]);
}
