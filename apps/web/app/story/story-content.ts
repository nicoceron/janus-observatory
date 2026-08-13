import type { ObservingMissionId, ScenarioId } from '@janus/domain';

import { allScenarioProfiles, getScenarioProfile, scientificNotation } from '../../lib/canonical';

export type StoryVisualState = {
  kind: 'present' | 'branches' | 'scenario' | 'observer' | 'ocular' | 'system';
  scenarioId?: ScenarioId;
  instrument?: ObservingMissionId;
  branchState?: 'budding' | 'all' | 'focus';
  showMetrics?: boolean;
};

export type StoryStep = {
  id: string;
  chapter: string;
  kicker: string;
  title: string;
  body: string;
  scenarioId?: ScenarioId;
  sourceLabel?: string;
  sourceHref?: string;
  cardSide?: 'left' | 'right';
  visual: StoryVisualState;
};

const scenarioPaper = 'https://arxiv.org/abs/2409.00067v3';
const observingPaper = 'https://arxiv.org/abs/2511.20329v2';

function detectionCount(scenarioId: ScenarioId) {
  return getScenarioProfile(scenarioId).observations.filter(
    ({ result }) => result.signatures.length > 0,
  ).length;
}

const scenarioSteps: StoryStep[] = allScenarioProfiles.map((profile, index) => ({
  id: `scenario-${profile.id.toLowerCase()}`,
  chapter: '02',
  kicker: `${String(index + 1).padStart(2, '0')} / 10 · ${profile.growth.growthState}`,
  title: `${profile.id} · ${profile.morphology.mythMetaphor}`,
  body: `${scientificNotation(profile.growth.population)} people, ${scientificNotation(profile.growth.annualEnergyUseJ)} joules per year, governance factor ${profile.morphology.globalFactor}, and technology cluster ${profile.morphology.technologyCluster}. The observing paper lists signatures in ${detectionCount(profile.id)} of five mission-concept cells; that count describes the published matrix, not the civilization's total technology.`,
  scenarioId: profile.id,
  sourceLabel: 'Scenario paper · Tables 5 and 9; observing paper · Figure 6',
  sourceHref: scenarioPaper,
  cardSide: index % 2 === 0 ? 'left' : 'right',
  visual: {
    kind: 'scenario',
    scenarioId: profile.id,
    branchState: 'focus',
    showMetrics: true,
  },
}));

const s1 = getScenarioProfile('S1');
const s9 = getScenarioProfile('S9');
const s1Hwo = s1.observations.find(({ id }) => id === 'habitable_worlds_observatory')!;
const s9Hwo = s9.observations.find(({ id }) => id === 'habitable_worlds_observatory')!;
const s9Sgl = s9.observations.find(({ id }) => id === 'solar_gravitational_lens')!;

export const storySteps: StoryStep[] = [
  {
    id: 'present',
    chapter: '01',
    kicker: 'Earth · 2026',
    title: 'One known technological world.',
    body: 'Begin with Earth today. Project Janus changes the question from “what will happen?” to “what self-consistent technological futures can we examine?”',
    sourceLabel: 'Scenario paper · framing',
    sourceHref: scenarioPaper,
    cardSide: 'left',
    visual: { kind: 'present' },
  },
  {
    id: 'possibility-space',
    chapter: '01',
    kicker: 'Ten futures · no probability axis',
    title: 'The world branches into possibilities.',
    body: 'The ten scenarios separate by their published end-state trajectory—growing, stable, or oscillatory. Distance, order, and branch length in this view do not encode likelihood.',
    sourceLabel: 'Scenario paper · Tables 5 and 9',
    sourceHref: scenarioPaper,
    cardSide: 'right',
    visual: { kind: 'branches', branchState: 'budding' },
  },
  {
    id: 'all-scenarios',
    chapter: '01',
    kicker: 'The full scenario set',
    title: 'Ten coherent worlds. Ten different traces.',
    body: 'Population, annual energy, governance factor, technology cluster, and instrument-dependent detectability move independently. The story will hold those dimensions apart rather than compress them into a score.',
    sourceLabel: 'Scenario paper · Tables 5 and 9; observing paper · Figure 6',
    sourceHref: scenarioPaper,
    cardSide: 'left',
    visual: { kind: 'branches', branchState: 'all' },
  },
  ...scenarioSteps,
  {
    id: 'observer-turn',
    chapter: '03',
    kicker: 'Change point of view · HWO',
    title: 'Now become the alien astronomer.',
    body: `Through a Habitable Worlds Observatory-class concept, the published matrix lists ${s1Hwo.result.signatures.join(' and ')} for S1. The telescope model is interpretive; the categorical result is reported.`,
    scenarioId: 'S1',
    sourceLabel: 'Observing paper · Figure 6',
    sourceHref: observingPaper,
    cardSide: 'right',
    visual: {
      kind: 'observer',
      scenarioId: 'S1',
      instrument: 'habitable_worlds_observatory',
    },
  },
  {
    id: 'first-light',
    chapter: '04',
    kicker: 'Ocular view · HWO · S1',
    title: 'Put your eye to the instrument.',
    body: `The HWO-class concept now fills the view. For S1, the published comparison lists ${s1Hwo.result.signatures.join(' and ')}. This is categorical evidence from the observing matrix—not a recovered raw spectrum.`,
    scenarioId: 'S1',
    sourceLabel: 'Observing paper · Figure 6',
    sourceHref: observingPaper,
    cardSide: 'left',
    visual: {
      kind: 'ocular',
      scenarioId: 'S1',
      instrument: 'habitable_worlds_observatory',
    },
  },
  {
    id: 'quiet-spectrum',
    chapter: '04',
    kicker: 'Same method · S9',
    title: 'A quiet result is not an empty world.',
    body: `The S9 HWO cell contains ${s9Hwo.result.signatures.length === 0 ? 'no listed signature' : s9Hwo.result.signatures.join(', ')}. Its wider system still carries ${s9.system.length} kinds of system technosignature in the scenario paper.`,
    scenarioId: 'S9',
    sourceLabel: 'Scenario paper · Table 8; observing paper · Figure 6',
    sourceHref: observingPaper,
    cardSide: 'right',
    visual: {
      kind: 'ocular',
      scenarioId: 'S9',
      instrument: 'habitable_worlds_observatory',
    },
  },
  {
    id: 'change-instrument',
    chapter: '05',
    kicker: 'Change method · Solar Gravitational Lens',
    title: 'Move the instrument. Recover different evidence.',
    body: `For S9, the Solar Gravitational Lens cell lists ${s9Sgl.result.signatures.join(', ')}. No single observing concept captures every future in the Janus set.`,
    scenarioId: 'S9',
    sourceLabel: 'Observing paper · Figure 6',
    sourceHref: observingPaper,
    cardSide: 'left',
    visual: {
      kind: 'ocular',
      scenarioId: 'S9',
      instrument: 'solar_gravitational_lens',
    },
  },
  {
    id: 'system-handoff',
    chapter: '06',
    kicker: 'From story to instrument',
    title: 'Observation is a ladder, not a verdict.',
    body: 'Open the Observatory to move through all ten scenarios and five mission concepts, then use the Atlas to compare the dimensions without assigning an overall rank.',
    sourceLabel: 'Open the full Observatory',
    sourceHref: '/observatory',
    cardSide: 'right',
    visual: { kind: 'system', scenarioId: 'S9' },
  },
];
