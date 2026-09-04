import { describe, expect, it } from 'vitest';

import independentCollapse from '../../../data/generated/collapse/independent-validation.json';
import collapse from '../../../data/generated/runtime/collapse.json';
import earthAtmosphere from '../../../data/generated/runtime/earth-atmosphere.json';
import growth from '../../../data/generated/runtime/growth.json';
import morphology from '../../../data/generated/runtime/morphology.json';
import observability from '../../../data/generated/runtime/observability.json';
import planetary from '../../../data/generated/runtime/planetary.json';
import system from '../../../data/generated/runtime/system.json';
import venusAtmosphere from '../../../data/generated/runtime/venus-atmosphere.json';
import {
  ResearchDomainToolCallSchema,
  ResearchDomainToolResultSchema,
  createResearchDomainToolRuntime,
  planResearchDomainToolCalls,
  traceResearchToolResult,
} from './domain-tools';

const runtime = createResearchDomainToolRuntime({
  earthAtmosphere,
  venusAtmosphere,
  collapse,
  observability,
  growth,
  morphology,
  planetary,
  system,
  independentCollapse,
});

describe('allowlisted Research Companion domain tools', () => {
  it('plans an exact observer lookup for a named scenario and instrument', () => {
    expect(planResearchDomainToolCalls('Why does HWO list no signature for S9?')).toEqual([
      {
        name: 'run_observer_model',
        input: { scenarioId: 'S9', instrumentId: 'habitable_worlds_observatory' },
      },
    ]);
  });

  it('runs the published observer lookup and preserves a method-specific blank', async () => {
    const result = await runtime.execute(
      {
        name: 'run_observer_model',
        input: { scenarioId: 'S9', instrumentId: 'habitable_worlds_observatory' },
      },
      1,
    );
    const parsed = ResearchDomainToolResultSchema.parse(result);

    expect(parsed.status).toBe('ok');
    expect(parsed.evidenceKind).toBe('reported');
    expect(parsed.data).toMatchObject({
      scenarioId: 'S9',
      status: 'no_signature_listed',
      signatures: [],
    });
    expect(parsed.sourceRefs.length).toBeGreaterThan(0);
    expect(traceResearchToolResult(parsed).resultHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('keeps comparison dimensions separate and never emits a synthetic score', async () => {
    const result = await runtime.execute(
      { name: 'compare_scenarios', input: { scenarioIds: ['S4', 'S7'] } },
      1,
    );
    const serialized = JSON.stringify(result.data);

    expect(result.status).toBe('ok');
    expect(serialized).toContain('annualEnergyUseJ');
    expect(serialized).toContain('technologyCluster');
    expect(serialized).not.toMatch(/"(?:score|rank|probability)"/i);
  });

  it('exposes only the exact validated independent 20,000-run preset', async () => {
    const result = await runtime.execute(
      {
        name: 'run_independent_collapse_model',
        input: { scenarioId: 'S4', preset: 'validated_20000' },
      },
      1,
    );

    expect(result.status).toBe('ok');
    expect(result.evidenceKind).toBe('reimplemented');
    expect(result.data).toMatchObject({
      scenarioId: 'S4',
      ensembleSize: 20_000,
      canonicalStatus: 'noncanonical',
      evidenceKind: 'reimplemented',
    });
    expect(result.limitation).toContain('arbitrary parameters are not accepted');
    expect(() =>
      ResearchDomainToolCallSchema.parse({
        name: 'run_independent_collapse_model',
        input: { scenarioId: 'S4', preset: 'custom', parameters: { h: 1 } },
      }),
    ).toThrow();
  });

  it('routes comparisons, observing matrices, and reported collapse through bounded calls', () => {
    const calls = planResearchDomainToolCalls(
      'Compare S4 and S7 collapse and what a deep-space probe observes.',
    );

    expect(calls.map(({ name }) => name)).toEqual([
      'compare_scenarios',
      'get_observability_matrix',
      'get_reported_collapse_metrics',
      'get_reported_collapse_metrics',
    ]);
    expect(calls).toHaveLength(4);
  });
});
