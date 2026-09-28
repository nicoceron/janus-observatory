import { describe, expect, it } from 'vitest';
import growth from '../../../data/canonical/scenarios/growth-table-9.json';
import { ScenarioGrowthDatasetSchema } from './scientific-dataset';
import { compareWithReferenceEarth } from './quantity-comparison';

const dataset = ScenarioGrowthDatasetSchema.parse(growth);

describe('reference Earth comparisons', () => {
  it('derives the energy reference in joules and retains both input locators', () => {
    const result = compareWithReferenceEarth(3e19, 'energy', dataset.referenceEarth)!;
    expect(result.referenceValue).toBe(5.925e20);
    expect(result.ratio).toBeCloseTo(0.05063291139240506);
    expect(result.evidenceKind).toBe('derived');
    expect(result.sourceRefs.map(({ locator }) => locator.page)).toEqual([12, 18]);
  });

  it('uses the reported, rounded energy total rather than recalculating it from population', () => {
    const s1 = dataset.records.find(({ scenarioId }) => scenarioId === 'S1')!;
    const population = compareWithReferenceEarth(
      s1.population,
      'population',
      dataset.referenceEarth,
    )!;
    const energy = compareWithReferenceEarth(
      s1.annualEnergyUseJ,
      'energy',
      dataset.referenceEarth,
    )!;
    expect(population.ratio).toBeCloseTo(3.797468354);
    expect(energy.ratio).toBeCloseTo(3.375527426);
    expect(population.ratio).not.toBe(energy.ratio);
  });

  it('preserves small and enormous ratios without clipping or ranking', () => {
    const ratios = dataset.records.map(
      ({ population }) =>
        compareWithReferenceEarth(population, 'population', dataset.referenceEarth)!.ratio,
    );
    expect(Math.min(...ratios)).toBeCloseTo(0.05063291139);
    expect(Math.max(...ratios)).toBeCloseTo(25316.455696);
  });

  it('does not turn a missing reference into zero or a fabricated comparison', () => {
    const reference = structuredClone(dataset.referenceEarth);
    reference.population = {
      ...reference.population,
      captureStatus: 'not_transcribed',
      value: null,
      note: 'Unavailable',
    };
    expect(compareWithReferenceEarth(1, 'population', reference)).toBeNull();
    expect(compareWithReferenceEarth(1, 'energy', reference)).toBeNull();
    expect(() => compareWithReferenceEarth(NaN, 'energy', dataset.referenceEarth)).toThrow();
  });

  it('rejects unsupported reference values and missing provenance', () => {
    const broken = structuredClone(growth);
    broken.referenceEarth.population.sourceRefs = [];
    expect(ScenarioGrowthDatasetSchema.safeParse(broken).success).toBe(false);
    broken.referenceEarth = structuredClone(growth.referenceEarth);
    broken.referenceEarth.annualEnergyPerPersonGJ.value = -1;
    expect(ScenarioGrowthDatasetSchema.safeParse(broken).success).toBe(false);
  });
});
