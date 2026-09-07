import { describe, expect, it } from 'vitest';
import { allScenarioProfiles } from '../../lib/canonical-core';
import { getOffworldContext } from './offworld-context';

describe('off-world illustrations are admitted by canonical fields, not component literals', () => {
  it('covers every scenario and preserves provenance for every illustrated body', () => {
    for (const profile of allScenarioProfiles) {
      for (const { body, signatures } of getOffworldContext(profile).bodies) {
        expect(body).not.toBe('Earth');
        expect(signatures.length).toBeGreaterThan(0);
        for (const signature of signatures) {
          expect(signature.value).toBeGreaterThan(0);
          expect(signature.sourceRefs.length).toBeGreaterThan(0);
        }
      }
    }
  });
  it('does not invent off-world geography for S4 or S7', () => {
    for (const id of ['S4', 'S7'])
      expect(getOffworldContext(allScenarioProfiles.find((p) => p.id === id)!).bodies).toEqual([]);
  });
  it('isolates the stellar cutaway to its published field', () => {
    expect(
      allScenarioProfiles.filter((p) => getOffworldContext(p).stellar).map((p) => p.id),
    ).toEqual(['S9']);
  });
});
