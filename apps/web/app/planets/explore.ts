import type { SystemPortrait } from '../../lib/system-portrait';
import { featureStories, worldStories, type Offworld } from './stories';

/** Explorer vocabulary for the low-poly worlds. Free of Three.js so it ships with the story DOM. */
export type Inspection = { world: number; selection: string };

export const bodyNames: Record<string, string> = {
  Earth: 'Earth',
  Moon: 'Luna',
  Mars: 'Mars',
  Venus: 'Venus',
  asteroids: 'Asteroid works',
  outer: 'Outer settlements',
  kuiper: 'Kuiper outpost',
  solar: 'Solar collectors',
};

const landmarks = new Map(
  worldStories.flatMap((story) =>
    story.landmarks.map((landmark) => [`landmark:${landmark.id}`, landmark]),
  ),
);

export function systemSelections(system: SystemPortrait) {
  return ['Earth', ...system.bodies.map((b) => b.body), ...system.features];
}

export function objectSelections(world: number) {
  return worldStories[world].landmarks.map((landmark) => `landmark:${landmark.id}`);
}

export function selectionName(id: string) {
  return bodyNames[id] ?? landmarks.get(id)?.name ?? id;
}

export function selectionDescription(world: number, id: string, system: SystemPortrait) {
  const story = worldStories[world];
  if (id === 'Earth') return `${story.depiction} Select a landmark to study it on its own.`;
  const landmark = landmarks.get(id);
  if (landmark) return `${landmark.description} Original interpretive model.`;
  const body = system.bodies.find((b) => b.body === id);
  if (body)
    return (
      story.bodies[id as Offworld] ??
      (body.activity === 'orbital'
        ? 'Orbital hardware drawn from this scenario’s published satellite-belt value.'
        : 'Surface works drawn from this scenario’s published values for this body.')
    );
  return featureStories[id] ?? '';
}
