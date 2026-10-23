import type { Sourced } from '@janus/domain/evidence';

/**
 * Reader-facing names for the paper's descriptive dimensions. The biosphere distribution
 * (reported only graphically) and the network-order dimension are left to the downloads.
 */
export const morphologyRows = [
  ['Economy', 'economy'],
  ['Politics', 'politics'],
  ['Society', 'society'],
  ['Technology and nature', 'technosphere'],
  ['Centers of technology', 'spatialDistribution'],
  ['How technology develops', 'development'],
  ['Smallest engineering scale', 'smallestScale'],
] as const;

const growthLabels: Record<string, string> = {
  growing: 'Growing',
  stable: 'Stable',
  oscillatory: 'Oscillating',
};

export function growthLabel(state: string) {
  return growthLabels[state] ?? state;
}

/** Editorial glosses for the paper's set-theory and pole terms; the wording itself is kept. */
const glosses: Record<string, string> = {
  'Some common elements with the biosphere; neither set is equal': 'They partly overlap',
  'The biosphere and technosphere are equivalent sets': 'They are one and the same',
  'The technosphere is a proper subset of the biosphere': 'Technology sits inside nature',
  'The biosphere is a proper subset of the technosphere': 'Nature sits inside technology',
  'The biosphere and technosphere have no common elements': 'They are completely separate',
  Unipolar: 'One center',
  Bipolar: 'Two centers',
  Multipolar: 'Many centers',
  'Non-polar': 'No center',
};

/** A plain reading of a sourced value, plus the paper's own words when they differ. */
export function plainReading(field: Sourced<unknown>): { value: string; paper?: string } {
  if (field.captureStatus !== 'captured') return { value: 'Not given' };
  const raw = field.display ?? field.value;
  const values = Array.isArray(raw) ? raw.map(String) : [String(raw)];
  const plain = values.map((value) => glosses[value] ?? value);
  const changed = plain.some((value, index) => value !== values[index]);
  return {
    value: plain.join(' or '),
    paper: changed ? values.join(' / ') : undefined,
  };
}
