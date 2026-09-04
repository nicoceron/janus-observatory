import type { ScenarioId } from '@janus/domain/scenario';
import { ScenarioIdSchema } from '@janus/domain/scenario';
import { ObservingMissionSchema, type ObservingMissionId } from '@janus/domain/scientific-dataset';
import { z } from 'zod';

import {
  allScenarioProfiles,
  getScenarioProfile,
  scientificNotation,
} from '../../lib/canonical-core';

const storyVisualKinds = [
  'present',
  'branches',
  'scenario',
  'observer',
  'ocular',
  'matrix',
  'collapse',
  'handoff',
  'epilogue',
] as const;

const StoryVisualStateSchema = z
  .object({
    kind: z.enum(storyVisualKinds),
    scenarioId: ScenarioIdSchema.nullable(),
    instrument: ObservingMissionSchema.nullable(),
    branchState: z.enum(['budding', 'all', 'focus']).nullable(),
    showMetrics: z.boolean(),
    collapseView: z.enum(['none', 'single', 'all']),
  })
  .superRefine((state, context) => {
    if (state.kind === 'branches' && state.branchState === null) {
      context.addIssue({ code: 'custom', message: 'Branch states require a named branch target.' });
    }
    if (state.kind === 'scenario' && (state.scenarioId === null || !state.showMetrics)) {
      context.addIssue({
        code: 'custom',
        message: 'Scenario states require a scenario and its complete metric overlay.',
      });
    }
    if (
      ['observer', 'ocular'].includes(state.kind) &&
      (state.scenarioId === null || state.instrument === null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Observer and ocular states require a scenario and observing method.',
      });
    }
    if (state.kind === 'collapse' && state.collapseView === 'none') {
      context.addIssue({
        code: 'custom',
        message: 'Collapse states require a complete view mode.',
      });
    }
    if (state.kind !== 'collapse' && state.collapseView !== 'none') {
      context.addIssue({
        code: 'custom',
        message: 'Only collapse states may activate the collapse view.',
      });
    }
  });

const StoryStepSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  chapter: z.enum(['00', '01', '02', '03', '04', '05', '06', '07', 'EP']),
  kicker: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  scenarioId: ScenarioIdSchema.nullable(),
  sourceLabel: z.string().min(1),
  sourceHref: z.string().min(1),
  cardSide: z.enum(['left', 'right']),
  visual: StoryVisualStateSchema,
});

type CompleteStoryVisualState = z.infer<typeof StoryVisualStateSchema>;
type ParsedStoryStep = z.infer<typeof StoryStepSchema>;

// EarthStage is also reused by the compact home-page Observatory slice, so its
// public input remains backwards-compatible. Authored story steps use the
// complete validated form below and cannot omit any target field.
export type StoryVisualState = {
  kind: (typeof storyVisualKinds)[number];
  scenarioId?: ScenarioId | null;
  instrument?: ObservingMissionId | null;
  branchState?: 'budding' | 'all' | 'focus' | null;
  showMetrics?: boolean;
  collapseView?: 'none' | 'single' | 'all';
};

export type StoryStep = Omit<ParsedStoryStep, 'visual'> & {
  visual: CompleteStoryVisualState;
};

const scenarioPaper = 'https://arxiv.org/abs/2409.00067v3';
const observingPaper = 'https://arxiv.org/abs/2511.20329v2';
const collapsePaper = 'https://arxiv.org/abs/2604.13774v1';

function visual(
  state: Pick<CompleteStoryVisualState, 'kind'> & Partial<Omit<CompleteStoryVisualState, 'kind'>>,
): CompleteStoryVisualState {
  return StoryVisualStateSchema.parse({
    scenarioId: null,
    instrument: null,
    branchState: null,
    showMetrics: false,
    collapseView: 'none',
    ...state,
  });
}

function categoricalMissionCells(scenarioId: ScenarioId) {
  return getScenarioProfile(scenarioId)
    .observations.map(
      ({ result, short }) =>
        `${short}: ${
          result.signatures.length > 0 ? result.signatures.join(' and ') : 'no signature listed'
        }`,
    )
    .join('; ');
}

// Chapter 2 starts with the three contrasts named in the master plan, then travels
// through the remaining worlds. The order is editorial and does not encode weight.
const scenarioJourneyOrder: ScenarioId[] = [
  'S1',
  'S4',
  'S9',
  'S2',
  'S3',
  'S5',
  'S6',
  'S7',
  'S8',
  'S10',
];

const scenarioSteps: StoryStep[] = scenarioJourneyOrder.map((scenarioId, index) => {
  const profile = getScenarioProfile(scenarioId);
  return {
    id: `scenario-${profile.id.toLowerCase()}`,
    chapter: '02',
    kicker: `${String(index + 1).padStart(2, '0')} / 10 · ${profile.growth.growthState}`,
    title: `${profile.id} · ${profile.morphology.mythMetaphor}`,
    body: `${scientificNotation(profile.growth.population)} people, ${scientificNotation(profile.growth.annualEnergyUseJ)} joules per year, governance factor ${profile.morphology.globalFactor}, and technology cluster ${profile.morphology.technologyCluster}. Figure 6 keeps each method categorical—${categoricalMissionCells(profile.id)}. Those cells remain separate evidence fields; no composite detectability value is assigned.`,
    scenarioId: profile.id,
    sourceLabel: 'Scenario paper · Tables 5 and 9; observing paper · Figure 6',
    sourceHref: scenarioPaper,
    cardSide: index % 2 === 0 ? 'left' : 'right',
    visual: visual({
      kind: 'scenario',
      scenarioId: profile.id,
      branchState: 'focus',
      showMetrics: true,
    }),
  };
});

const featuredInstrument: Record<ScenarioId, ObservingMissionId> = {
  S1: 'habitable_worlds_observatory',
  S2: 'large_interferometer_for_exoplanets',
  S3: 'habitable_worlds_observatory',
  S4: 'deep_space_probes',
  S5: 'radio',
  S6: 'large_interferometer_for_exoplanets',
  S7: 'deep_space_probes',
  S8: 'large_interferometer_for_exoplanets',
  S9: 'solar_gravitational_lens',
  S10: 'deep_space_probes',
};

type ObservationBeat = {
  emphasis:
    | 'first-light'
    | 'chosen-first-light'
    | 'quiet-hwo'
    | 'instrument-reveal'
    | 'catalogue'
    | 'selected-catalogue';
  id: string;
  instrument: ObservingMissionId;
  scenarioId: ScenarioId;
};

// S9 and S10 deliberately enter the same HWO frame before the story changes
// instruments. Those two additional authored states make the quiet-spectrum
// contrast explicit without replacing any scenario's featured method state.
const defaultObservationJourney: ObservationBeat[] = [
  {
    emphasis: 'first-light',
    id: 'observe-s1',
    instrument: 'habitable_worlds_observatory',
    scenarioId: 'S1',
  },
  {
    emphasis: 'quiet-hwo',
    id: 'observe-s9-hwo-blank',
    instrument: 'habitable_worlds_observatory',
    scenarioId: 'S9',
  },
  {
    emphasis: 'quiet-hwo',
    id: 'observe-s10-hwo-blank',
    instrument: 'habitable_worlds_observatory',
    scenarioId: 'S10',
  },
  {
    emphasis: 'instrument-reveal',
    id: 'observe-s9-sgl',
    instrument: featuredInstrument.S9,
    scenarioId: 'S9',
  },
  {
    emphasis: 'instrument-reveal',
    id: 'observe-s10-probe',
    instrument: featuredInstrument.S10,
    scenarioId: 'S10',
  },
  ...(['S4', 'S2', 'S3', 'S5', 'S6', 'S7', 'S8'] as const).map((scenarioId) => ({
    emphasis: 'catalogue' as const,
    id: `observe-${scenarioId.toLowerCase()}`,
    instrument: featuredInstrument[scenarioId],
    scenarioId,
  })),
];

const selectedMethodScenarios = ['S4', 'S2', 'S3', 'S5', 'S6', 'S7', 'S8'] as const;

const missionIdSlug: Record<ObservingMissionId, string> = {
  habitable_worlds_observatory: 'hwo',
  radio: 'radio',
  large_interferometer_for_exoplanets: 'life',
  solar_gravitational_lens: 'sgl',
  deep_space_probes: 'probe',
};

function observationFor(scenarioId: ScenarioId, instrument: ObservingMissionId) {
  const observation = getScenarioProfile(scenarioId).observations.find(
    ({ id }) => id === instrument,
  );
  if (!observation) throw new Error(`Story observation is missing ${scenarioId}/${instrument}.`);
  return observation;
}

function buildObservationJourney(selectedObserver: ObservingMissionId): ObservationBeat[] {
  if (selectedObserver === 'habitable_worlds_observatory') return defaultObservationJourney;

  const selectedSlug = missionIdSlug[selectedObserver];
  const prioritizedScenarios = [...selectedMethodScenarios].sort((left, right) => {
    const leftHasEvidence = observationFor(left, selectedObserver).result.signatures.length > 0;
    const rightHasEvidence = observationFor(right, selectedObserver).result.signatures.length > 0;
    return Number(rightHasEvidence) - Number(leftHasEvidence);
  });

  return [
    {
      emphasis: 'chosen-first-light',
      id: `observe-s1-${selectedSlug}`,
      instrument: selectedObserver,
      scenarioId: 'S1',
    },
    {
      emphasis: 'quiet-hwo',
      id: 'observe-s9-hwo-blank',
      instrument: 'habitable_worlds_observatory',
      scenarioId: 'S9',
    },
    {
      emphasis: 'instrument-reveal',
      id: 'observe-s9-sgl',
      instrument: featuredInstrument.S9,
      scenarioId: 'S9',
    },
    {
      emphasis: 'quiet-hwo',
      id: 'observe-s10-hwo-blank',
      instrument: 'habitable_worlds_observatory',
      scenarioId: 'S10',
    },
    {
      emphasis: 'instrument-reveal',
      id: 'observe-s10-probe',
      instrument: featuredInstrument.S10,
      scenarioId: 'S10',
    },
    ...prioritizedScenarios.map((scenarioId) => ({
      emphasis: 'selected-catalogue' as const,
      id: `observe-${scenarioId.toLowerCase()}-${selectedSlug}`,
      instrument: selectedObserver,
      scenarioId,
    })),
  ];
}

function buildObservationSteps(selectedObserver: ObservingMissionId): StoryStep[] {
  const observationJourney = buildObservationJourney(selectedObserver);
  return observationJourney.map((beat, index) => {
    const profile = getScenarioProfile(beat.scenarioId);
    const instrument = beat.instrument;
    const observation = observationFor(profile.id, instrument);
    const result =
      observation.result.signatures.length > 0
        ? observation.result.signatures.join(' and ')
        : 'no signature in the published cell';

    const co2 = profile.atmosphere.co2;
    const nox = profile.atmosphere.nox;
    if (beat.emphasis === 'quiet-hwo' && (co2.value === null || nox.value === null)) {
      throw new Error(`Quiet HWO state is missing its canonical atmosphere for ${profile.id}.`);
    }

    const title =
      beat.emphasis === 'first-light'
        ? 'Evidence changes with the method.'
        : beat.emphasis === 'chosen-first-light'
          ? `${observation.short} first light: method shapes evidence.`
          : beat.emphasis === 'quiet-hwo'
            ? profile.id === 'S9'
              ? 'A quiet spectrum can hide a machine world.'
              : 'A familiar atmosphere can outlive its civilization.'
            : beat.emphasis === 'instrument-reveal'
              ? 'Change the instrument, not the world.'
              : beat.emphasis === 'selected-catalogue'
                ? `${profile.id} through ${observation.short}.`
                : `${profile.id} enters the ocular field.`;

    const body =
      beat.emphasis === 'first-light'
        ? 'Your chosen observing method controls the first Figure 6 result. The world does not change when the method changes; only the evidence available to the observer does.'
        : beat.emphasis === 'chosen-first-light'
          ? `You chose ${observation.label}. For S1, its Figure 6 cell lists ${result}. This chosen-method result comes first; later HWO blanks remain fixed comparison states, so the world never changes when the method changes.`
          : beat.emphasis === 'quiet-hwo'
            ? `Hold the observing method at HWO: Figure 6 lists no signature for ${profile.id}. Table 1 transcribes its preagricultural-like atmosphere with ${co2.label} ${co2.value?.toLocaleString('en-US')} ${co2.unit} and ${nox.label} ${nox.value?.toLocaleString('en-US')} ${nox.unit}. This method-specific blank is not evidence of no technology.`
            : beat.emphasis === 'instrument-reveal'
              ? `Keep ${profile.id} fixed and change only the method from HWO to ${observation.short}. Figure 6 now lists ${result}. The earlier HWO blank and this result describe instrument complementarity, not a change in the civilization.`
              : beat.emphasis === 'selected-catalogue'
                ? `Following your ${observation.short} path, the ${profile.id} Figure 6 cell lists ${result}. Chosen-method cells with listed evidence are grouped first, followed by method-specific blanks; this order organizes evidence and never ranks civilizations.`
                : `For ${profile.id}, the ${observation.short} cell lists ${result}. The framed world is an interpretive portrait; every displayed value and categorical result comes from versioned canonical transcriptions. A blank cell never means no technology.`;

    return {
      id: beat.id,
      chapter: '04',
      kicker: `${String(index + 1).padStart(2, '0')} / ${observationJourney.length} · ${observation.short}`,
      title,
      body,
      scenarioId: profile.id,
      sourceLabel: 'Observing paper · Table 1 and Figure 6',
      sourceHref: observingPaper,
      cardSide: index % 2 === 0 ? 'right' : 'left',
      visual: visual({ kind: 'ocular', scenarioId: profile.id, instrument }),
    };
  });
}

function authoredStepsFor(selectedObserver: ObservingMissionId): StoryStep[] {
  const selectedS1Observation = observationFor('S1', selectedObserver);
  const selectedS1Result =
    selectedS1Observation.result.signatures.length > 0
      ? selectedS1Observation.result.signatures.join(' and ')
      : 'no signature in the published cell';
  const observationSteps = buildObservationSteps(selectedObserver);

  return [
    {
      id: 'one-earth',
      chapter: '00',
      kicker: 'Loading and consent · Earth 2026',
      title: 'One world. Your pace.',
      body: 'The complete article works as ordinary scrolling text and a 2D scene. Start the spatial story, switch to reading mode, or leave for the Atlas at any time. No sound plays and the page never captures the scroll wheel.',
      scenarioId: null,
      sourceLabel: 'Project Janus · scenario framing',
      sourceHref: scenarioPaper,
      cardSide: 'left',
      visual: visual({ kind: 'present' }),
    },
    {
      id: 'possibility-families',
      chapter: '01',
      kicker: 'Three families · no probability axis',
      title: 'One Earth opens into three kinds of change.',
      body: 'Stable, collapse-and-recovery, and continued-growth families organize the first view. These are not forecasts, and they are not equally weighted probabilities. Position and branch length carry no likelihood.',
      scenarioId: null,
      sourceLabel: 'Scenario paper · Tables 5 and 9',
      sourceHref: scenarioPaper,
      cardSide: 'right',
      visual: visual({ kind: 'branches', branchState: 'budding' }),
    },
    {
      id: 'all-scenarios',
      chapter: '01',
      kicker: 'The full possibility space',
      title: 'Ten coherent worlds. Ten different traces.',
      body: 'The families resolve into ten independently rendered futures. Population, annual energy, governance, technology cluster, and instrument-dependent evidence remain separate dimensions; the story never compresses them into a score.',
      scenarioId: null,
      sourceLabel: 'Scenario paper · Tables 5 and 9; observing paper · Figure 6',
      sourceHref: scenarioPaper,
      cardSide: 'left',
      visual: visual({ kind: 'branches', branchState: 'all' }),
    },
    ...scenarioSteps,
    {
      id: 'observer-turn',
      chapter: '03',
      kicker: 'Choose the outside gaze',
      title: 'Now become the alien astronomer.',
      body:
        selectedObserver === 'habitable_worlds_observatory'
          ? `Begin with an HWO-class reflected-light concept or choose radio, LIFE, a solar gravitational lens, or an in-situ probe. The default S1/HWO cell lists ${selectedS1Result}. Arrow keys change the method; Enter confirms; Escape returns to HWO.`
          : `You chose ${selectedS1Observation.label}. Its S1 cell lists ${selectedS1Result}, so that categorical result will open Chapter 4 before the fixed HWO quiet-world contrasts. Arrow keys change the method; Enter confirms; Escape returns to HWO.`,
      scenarioId: 'S1',
      sourceLabel: 'Observing paper · Figure 6',
      sourceHref: observingPaper,
      cardSide: 'right',
      visual: visual({
        kind: 'observer',
        scenarioId: 'S1',
        instrument: selectedObserver,
      }),
    },
    ...observationSteps,
    {
      id: 'observing-ladder',
      chapter: '05',
      kicker: 'No single instrument is enough',
      title: 'Five methods reveal different parts of the same worlds.',
      body: 'The full view is rebuilt from the structured Figure 6 transcription. A luminous mark means the source lists one or more signatures for that scenario-method cell. A blank remains method-specific and never becomes evidence of no technology.',
      scenarioId: 'S9',
      sourceLabel: 'Observing paper · Figure 6',
      sourceHref: observingPaper,
      cardSide: 'right',
      visual: visual({
        kind: 'matrix',
        scenarioId: 'S9',
        instrument: selectedObserver,
      }),
    },
    {
      id: 'civilizations-breathe',
      chapter: '06',
      kicker: 'Reported collapse layer · S4',
      title: 'Civilizations breathe.',
      body: 'The published collapse model describes growth, resource pressure, collapse survival, recovery delay, and restored resources. This view shows S4’s reported parameters and aggregate outcomes; it does not invent or replay a missing per-run trajectory.',
      scenarioId: 'S4',
      sourceLabel: 'Collapse paper · Table 4 and reported aggregate results',
      sourceHref: collapsePaper,
      cardSide: 'left',
      visual: visual({ kind: 'collapse', scenarioId: 'S4', collapseView: 'single' }),
    },
    {
      id: 'ten-rhythms',
      chapter: '06',
      kicker: 'Ten reported ensembles',
      title: 'Ten scenarios do not share one rhythm.',
      body: 'The small multiples show only duty-cycle values reported in prose. Missing values remain explicitly unavailable, not zero and not estimated from the figure. Signature persistence can outlast activity, but this story does not calculate a persistence probability.',
      scenarioId: 'S9',
      sourceLabel: 'Collapse paper · Sections 3.2–4.1',
      sourceHref: collapsePaper,
      cardSide: 'right',
      visual: visual({ kind: 'collapse', scenarioId: 'S9', collapseView: 'all' }),
    },
    {
      id: 'explore-handoff',
      chapter: '07',
      kicker: 'From authored path to investigation',
      title: 'Carry this context into the Observatory and Atlas.',
      body: 'Open the full Observatory with the selected method and a quiet-atmosphere scenario, or compare S5, S9, and S4 in the Atlas. Neither surface ranks futures; both preserve exact fields and source links.',
      scenarioId: 'S9',
      sourceLabel: 'Continue with the versioned release-candidate dataset',
      sourceHref: `/observatory?scenario=S9&instrument=${selectedObserver}`,
      cardSide: 'left',
      visual: visual({
        kind: 'handoff',
        scenarioId: 'S9',
        instrument: selectedObserver,
      }),
    },
    {
      id: 'absence-of-evidence',
      chapter: 'EP',
      kicker: 'Epilogue · one known example',
      title: 'Absence of evidence is still instrument-shaped.',
      body: 'Earth remains our only known technological world. Project Janus offers self-consistent possibilities, not probabilities, and every observing result remains conditional on a method and its assumptions.',
      scenarioId: null,
      sourceLabel: 'Methods, sources, accessibility, and research companion',
      sourceHref: '/methods',
      cardSide: 'right',
      visual: visual({ kind: 'epilogue' }),
    },
  ];
}

const requiredChapters = ['00', '01', '02', '03', '04', '05', '06', '07', 'EP'] as const;

export function buildObserverStory(selectedObserver: ObservingMissionId): StoryStep[] {
  const observer = ObservingMissionSchema.parse(selectedObserver);
  const parsedSteps = z.array(StoryStepSchema).parse(authoredStepsFor(observer));
  const stepIds = new Set(parsedSteps.map(({ id }) => id));
  if (stepIds.size !== parsedSteps.length) throw new Error('Story step IDs must be unique.');

  for (const chapter of requiredChapters) {
    if (!parsedSteps.some((step) => step.chapter === chapter)) {
      throw new Error(`Story chapter ${chapter} has no authored step.`);
    }
  }

  const observationSteps = parsedSteps.filter(({ visual }) => visual.kind === 'ocular');
  if (
    parsedSteps.length !== 31 ||
    allScenarioProfiles.length !== 10 ||
    scenarioSteps.length !== 10 ||
    observationSteps.length !== 12 ||
    new Set(observationSteps.map(({ scenarioId }) => scenarioId)).size !== 10
  ) {
    throw new Error('The guided story requires complete 31-step, ten-scenario travel arcs.');
  }

  const firstObservation = observationSteps[0];
  if (firstObservation.scenarioId !== 'S1' || firstObservation.visual.instrument !== observer) {
    throw new Error(`The ${observer} story must begin Chapter 4 with its S1 result.`);
  }

  for (const scenarioId of ['S9', 'S10'] as const) {
    const quietIndex = observationSteps.findIndex(
      (step) =>
        step.scenarioId === scenarioId &&
        step.visual.instrument === 'habitable_worlds_observatory' &&
        step.visual.kind === 'ocular',
    );
    if (quietIndex < 0) {
      throw new Error(`The guided story requires an explicit ${scenarioId}/HWO blank.`);
    }
    if (observer !== 'habitable_worlds_observatory') {
      const alternateStep = observationSteps[quietIndex + 1];
      if (
        alternateStep?.scenarioId !== scenarioId ||
        alternateStep.visual.instrument !== featuredInstrument[scenarioId]
      ) {
        throw new Error(`The ${scenarioId}/HWO blank must lead directly to its alternate method.`);
      }
    }
  }

  return parsedSteps;
}

export const storySteps = buildObserverStory('habitable_worlds_observatory');
