import { Sculpture } from './sculpture';
import { animalBody, animalLeg, vehicle, wing } from './LifeModels';
import { vessel } from './Vessels';
import {
  flyingMachine,
  propeller,
  machineBody,
  walkerLeg,
  serviceTool,
  craneBoom,
} from './WorkingModels';
import type { LifeSubject } from './LifeActor';
/** The same authored meshes, assembled in a neutral pose for framing and geometry validation. */
export function lifeGeometry(subject: LifeSubject) {
  const s = new Sculpture();
  if (subject.type === 'vessel') vessel(s, subject.kind);
  else if (subject.type === 'vehicle') vehicle(s, subject.kind);
  else if (subject.type === 'aircraft') {
    flyingMachine(s, subject.kind);
    const p = new Sculpture();
    propeller(p, subject.kind);
    const g = p.finish();
    for (const side of [-1, 1])
      s.add(
        g.clone(),
        null,
        subject.kind === 'regional-plane'
          ? [side * 0.155, 0.035, -0.144]
          : [side * 0.105, 0.015, 0],
      );
    g.dispose();
  } else if (subject.type === 'machine') {
    machineBody(s, subject.kind);
    if (subject.kind === 'maintenance-walker') {
      for (const side of [-1, 1]) {
        const p = new Sculpture();
        walkerLeg(p, side);
        const g = p.finish();
        for (const z of [-0.067, 0, 0.067]) s.add(g.clone(), null, [side * 0.049, 0.104, z]);
        g.dispose();
      }
      const p = new Sculpture();
      serviceTool(p);
      s.add(p.finish(), null, [0, 0.094, -0.081]);
    } else {
      const p = new Sculpture();
      craneBoom(p);
      s.add(p.finish(), null, [0.025, 0.137, 0.038]);
    }
  } else {
    animalBody(s, subject.kind);
    if (subject.kind === 'crane' || subject.kind === 'bio-ray')
      for (const side of [-1, 1]) wing(s, subject.kind, side);
    else
      for (const x of [-1, 1])
        for (const z of [-0.068, 0.066]) {
          const upper = new Sculpture(),
            lower = new Sculpture();
          animalLeg(upper, subject.kind);
          animalLeg(lower, subject.kind, true);
          s.add(upper.finish(), null, [x * 0.031, 0.151, z]);
          s.add(lower.finish(), null, [x * 0.031, 0.082, z + 0.006]);
        }
  }
  return s.finish();
}
