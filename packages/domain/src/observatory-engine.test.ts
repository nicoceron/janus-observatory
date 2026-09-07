import { describe, expect, it } from 'vitest';

import observability from '../../../data/canonical/observability/figure-6.json';
import {
  createPublishedObservationResolver,
  resolvePublishedObservation,
} from './observatory-engine';
import { observingMissionIds } from './scientific-dataset';
import { scenarioIds } from './scenario';

describe('published observatory engine', () => {
  it('validates once without changing any of the fifty canonical results', () => {
    const resolve = createPublishedObservationResolver(observability);
    for (const scenario of scenarioIds)
      for (const mission of observingMissionIds) {
        expect(resolve(scenario, mission)).toEqual(
          resolvePublishedObservation(observability, scenario, mission),
        );
      }
    expect(() => createPublishedObservationResolver({ records: [] })).toThrow();
  });
  it('resolves every scenario and mission pair without inventing a result', () => {
    for (const scenarioId of scenarioIds) {
      for (const instrumentId of observingMissionIds) {
        const result = resolvePublishedObservation(observability, scenarioId, instrumentId);
        expect(result.scenarioId).toBe(scenarioId);
        expect(result.instrumentId).toBe(instrumentId);
      }
    }
  });

  it('keeps a blank HWO cell for S9 distinct from absence of technology', () => {
    const result = resolvePublishedObservation(observability, 'S9', 'habitable_worlds_observatory');

    expect(result.status).toBe('no_signature_listed');
    expect(result.signatures).toEqual([]);
    expect(result.caveat).toContain('not evidence of no technology');
  });

  it('preserves the listed off-world S9 probe signatures', () => {
    const result = resolvePublishedObservation(observability, 'S9', 'deep_space_probes');

    expect(result.status).toBe('reported_listed');
    expect(result.signatures).toEqual(['large surface features (Venus, Mars)']);
  });

  it('returns exact row and column provenance plus explicit mission assumptions', () => {
    const result = resolvePublishedObservation(observability, 'S9', 'habitable_worlds_observatory');

    expect(result.sourceRefs[0]?.locator).toMatchObject({
      page: 10,
      figure: 'Figure 6',
      row: 'S9',
      column: 'Habitable Worlds Observatory',
    });
    expect(result.assumptions.distance.value).toBe('10 pc');
    expect(result.assumptions.integrationTime.captureStatus).toBe('not_reported');
    expect(result.assumptions.integrationTime.value).toBeNull();
  });
});
