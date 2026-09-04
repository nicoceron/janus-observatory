import { describe, expect, it } from 'vitest';

import { getScenarioProfile } from '../../lib/canonical-core';
import { buildObserverStory, storySteps } from './story-content';

const observerMethods = [
  'habitable_worlds_observatory',
  'radio',
  'large_interferometer_for_exoplanets',
  'solar_gravitational_lens',
  'deep_space_probes',
] as const;

describe('complete guided story content', () => {
  it('covers chapters 0 through 7 and the epilogue with stable unique steps', () => {
    expect(new Set(storySteps.map(({ id }) => id)).size).toBe(storySteps.length);
    expect(new Set(storySteps.map(({ chapter }) => chapter))).toEqual(
      new Set(['00', '01', '02', '03', '04', '05', '06', '07', 'EP']),
    );
  });

  it('authors all ten worlds plus explicit S9/S10 quiet-HWO contrasts', () => {
    const scenarioStates = storySteps.filter(({ visual }) => visual.kind === 'scenario');
    const ocularStates = storySteps.filter(({ visual }) => visual.kind === 'ocular');

    expect(scenarioStates).toHaveLength(10);
    expect(ocularStates).toHaveLength(12);
    expect(new Set(scenarioStates.map(({ visual }) => visual.scenarioId)).size).toBe(10);
    expect(new Set(ocularStates.map(({ visual }) => visual.scenarioId)).size).toBe(10);
    for (const scenarioId of ['S9', 'S10']) {
      expect(ocularStates).toContainEqual(
        expect.objectContaining({
          id: `observe-${scenarioId.toLowerCase()}-hwo-blank`,
          visual: expect.objectContaining({
            instrument: 'habitable_worlds_observatory',
            scenarioId,
          }),
        }),
      );
    }
  });

  it('gives every step a complete named visual target and source', () => {
    for (const step of storySteps) {
      expect(step.visual).toEqual(
        expect.objectContaining({
          kind: expect.any(String),
          showMetrics: expect.any(Boolean),
        }),
      );
      expect([null, 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10']).toContain(
        step.visual.scenarioId,
      );
      expect(['none', 'single', 'all']).toContain(step.visual.collapseView);
      expect(step.sourceHref.length).toBeGreaterThan(1);
      expect(step.sourceLabel.length).toBeGreaterThan(1);
    }
  });

  it('authors the default observer plus complete evidence states for all five methods', () => {
    const observer = storySteps.find(({ id }) => id === 'observer-turn');
    const authoredMethods = new Set(
      storySteps
        .filter(({ visual }) => visual.kind === 'ocular')
        .map(({ visual }) => visual.instrument),
    );

    expect(observer?.visual.instrument).toBe('habitable_worlds_observatory');
    expect(authoredMethods).toEqual(
      new Set([
        'habitable_worlds_observatory',
        'radio',
        'large_interferometer_for_exoplanets',
        'solar_gravitational_lens',
        'deep_space_probes',
      ]),
    );
  });

  it('builds a deterministic 31-step Chapter 4 path for every observer choice', () => {
    for (const observer of observerMethods) {
      const first = buildObserverStory(observer);
      const second = buildObserverStory(observer);
      const evidence = first.filter(({ chapter }) => chapter === '04');

      expect(first).toEqual(second);
      expect(first).toHaveLength(31);
      expect(new Set(first.map(({ id }) => id)).size).toBe(31);
      expect(evidence).toHaveLength(12);
      expect(evidence[0]).toMatchObject({
        scenarioId: 'S1',
        visual: { instrument: observer, kind: 'ocular' },
      });
      expect(new Set(evidence.map(({ scenarioId }) => scenarioId)).size).toBe(10);
      expect(first.find(({ id }) => id === 'observer-turn')?.visual.instrument).toBe(observer);
      expect(first.find(({ id }) => id === 'explore-handoff')).toMatchObject({
        sourceHref: `/observatory?scenario=S9&instrument=${observer}`,
        visual: { instrument: observer },
      });
    }
  });

  it('keeps the HWO authored order and changes narration plus evidence order for another method', () => {
    const hwoEvidence = storySteps.filter(({ chapter }) => chapter === '04');
    const radioEvidence = buildObserverStory('radio').filter(({ chapter }) => chapter === '04');

    expect(hwoEvidence.slice(0, 5).map(({ id }) => id)).toEqual([
      'observe-s1',
      'observe-s9-hwo-blank',
      'observe-s10-hwo-blank',
      'observe-s9-sgl',
      'observe-s10-probe',
    ]);
    expect(radioEvidence.slice(0, 5).map(({ id }) => id)).toEqual([
      'observe-s1-radio',
      'observe-s9-hwo-blank',
      'observe-s9-sgl',
      'observe-s10-hwo-blank',
      'observe-s10-probe',
    ]);
    expect(radioEvidence[0].body).toContain('You chose Radio array');
    expect(radioEvidence[0].body).not.toBe(hwoEvidence[0].body);

    const groupedFlags = radioEvidence.slice(5).map(({ scenarioId }) => {
      const radio = getScenarioProfile(scenarioId!).observations.find(({ id }) => id === 'radio')!;
      return radio.result.signatures.length > 0;
    });
    expect(groupedFlags).toEqual(
      [...groupedFlags].sort((left, right) => Number(right) - Number(left)),
    );
  });

  it('narrates categorical method cells without a filled-cell aggregate', () => {
    const scenarioBodies = storySteps
      .filter(({ chapter, visual }) => chapter === '02' && visual.kind === 'scenario')
      .map(({ body }) => body);

    expect(scenarioBodies).toHaveLength(10);
    expect(scenarioBodies.join(' ')).not.toMatch(/signatures in \d|\d of five mission/i);
    for (const body of scenarioBodies) {
      expect(body).toContain('HWO:');
      expect(body).toContain('Radio:');
      expect(body).toContain('LIFE:');
      expect(body).toContain('SGL:');
      expect(body).toContain('Probe:');
      expect(body).toContain('no composite detectability value');
    }
  });
});
