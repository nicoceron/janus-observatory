import * as THREE from 'three';
import { frame, type Tone } from './kit';
import { onOrbit, orbitMatrix, satellite, type LayerBuilder, type WorldContext } from './model';

type Band = { inclination: number; node: number; speed: number; radius: number };

/** Satellites evenly spaced along a few named orbits: an ordered, managed orbital environment. */
export function orderedSwarm(
  world: WorldContext,
  count: number,
  bands: Band[],
  look: { size: number; body: Tone; wings: Tone; light?: Tone },
) {
  if (!count) return;
  bands.forEach((band, b) => {
    const layer = world.layer(`orbit-${b}`, 'orbit', {
      matrix: orbitMatrix(band.inclination, band.node),
      motion: { kind: 'spin', speed: band.speed },
    });
    const share = Math.round(count / bands.length) + (b < count % bands.length ? 1 : 0);
    for (let i = 0; i < share; i++)
      satellite(
        layer,
        onOrbit(band.radius, (i / share) * Math.PI * 2),
        look.size,
        look.body,
        look.wings,
        look.light,
      );
  });
}

/** Satellites scattered through a shell: crowded, unplanned traffic. */
export function chaoticSwarm(
  world: WorldContext,
  count: number,
  shell: [number, number],
  look: {
    size: number;
    body: Tone;
    wings: Tone[];
    light?: Tone;
    lightShare?: number;
    broken?: number;
  },
  layers = 3,
) {
  if (!count) return;
  const builders: LayerBuilder[] = [];
  for (let i = 0; i < layers; i++)
    builders.push(
      world.layer(`swarm-${i}`, 'orbit', {
        matrix: orbitMatrix(world.random.range(-0.5, 0.5), world.random() * 6),
        motion: { kind: 'spin', speed: world.random.range(0.025, 0.07) * (i % 2 ? -1 : 1) },
      }),
    );
  for (let i = 0; i < count; i++) {
    const layer = builders[i % layers];
    const up = new THREE.Vector3(
      world.random.range(-1, 1),
      world.random.range(-0.75, 0.75),
      world.random.range(-1, 1),
    ).normalize();
    const radius = world.random.range(shell[0], shell[1]);
    const m = frame(up.clone().multiplyScalar(radius), up, world.random() * 6);
    const lit = look.light && world.random() < (look.lightShare ?? 1) ? look.light : undefined;
    // The draw keeps the random sequence the same for wrecks and working satellites.
    const wings = world.random.pick(look.wings);
    if (look.broken && world.random() < look.broken)
      layer.kit('sat-wreck', m, look.size * 1.6, { tint: look.body });
    else satellite(layer, m, look.size, look.body, wings, lit);
  }
}
