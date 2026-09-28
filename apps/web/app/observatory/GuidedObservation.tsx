'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { observingMissionIds, type ObservingMissionId } from '@janus/domain/scientific-dataset';
import {
  allScenarioProfiles,
  instrumentCopy,
  sourceRefHref,
  sourceRefLabel,
  type ScenarioProfile,
} from '../../lib/canonical-core';
import { InstrumentExplanation } from './InstrumentExplanation';
import styles from './learning.module.css';

export const lessonSteps = ['predict', 'observe', 'compare'] as const;
export type LessonStep = (typeof lessonSteps)[number];
export function isLessonStep(value: string | null): value is LessonStep {
  return lessonSteps.some((step) => step === value);
}

const guesses = {
  listed: 'A signature will be listed',
  blank: 'No signature will be listed',
  unsure: 'I’m not sure yet',
} as const;

function PublishedResult({
  observation,
}: {
  observation: ScenarioProfile['observations'][number];
}) {
  return (
    <article className={styles.result}>
      <p className={styles.eyebrow}>
        {observation.plainLabel} · {observation.short}
      </p>
      <h3>
        {observation.result.signatures.length
          ? 'The paper lists these signatures.'
          : 'No signature is listed here.'}
      </h3>
      {observation.result.signatures.length > 0 && (
        <ul>
          {observation.result.signatures.map((signature) => (
            <li key={signature}>{signature}</li>
          ))}
        </ul>
      )}
      <p>{observation.result.caveat}</p>
      <p className={styles.evidence}>Reported · transcribed · published assumptions apply</p>
      <details>
        <summary>Observation assumptions and source</summary>
        <dl>
          {Object.entries(observation.result.assumptions).map(([name, field]) => (
            <div key={name}>
              <dt>{name === 'integrationTime' ? 'Integration time' : name}</dt>
              <dd>
                {field.value ?? field.note}
                {field.value && field.note ? ` — ${field.note}` : ''}
              </dd>
            </div>
          ))}
        </dl>
        <a href={sourceRefHref(observation.result.sourceRefs[0]!)} target="_blank" rel="noreferrer">
          {sourceRefLabel(observation.result.sourceRefs[0]!)} ↗
        </a>
      </details>
    </article>
  );
}

export function GuidedObservation({
  step,
  profile,
  instrumentId,
  firstInstrumentId,
  guess,
  onChange,
}: {
  step: LessonStep;
  profile: ScenarioProfile;
  instrumentId: ObservingMissionId;
  firstInstrumentId: ObservingMissionId;
  guess: string | null;
  onChange: (updates: Record<string, string | undefined>) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const observation = profile.observations.find(({ id }) => id === instrumentId)!;
  const first = profile.observations.find(({ id }) => id === firstInstrumentId)!;
  const guessLabel =
    guess && Object.hasOwn(guesses, guess) ? guesses[guess as keyof typeof guesses] : null;
  const exit = () => onChange({ lesson: undefined, first: undefined, guess: undefined });

  return (
    <section
      className={styles.lesson}
      aria-labelledby="lesson-title"
      style={{ '--signal': profile.accent } as CSSProperties}
    >
      <div className={styles.lessonTop}>
        <ol aria-label="Observation exercise progress">
          {lessonSteps.map((phase, index) => (
            <li key={phase} aria-current={phase === step ? 'step' : undefined}>
              {String(index + 1).padStart(2, '0')} ·{' '}
              {phase === 'predict' ? 'Choose & think' : phase === 'observe' ? 'Observe' : 'Compare'}
            </li>
          ))}
        </ol>
        <button type="button" onClick={exit}>
          Skip to free exploration
        </button>
      </div>
      <h2 id="lesson-title" ref={heading} tabIndex={-1}>
        {step === 'predict'
          ? 'What could an alien observer notice?'
          : step === 'observe'
            ? 'Now look at the evidence.'
            : 'Same civilization. Another way to look.'}
      </h2>
      <p>
        Target:{' '}
        <strong>
          {profile.id} · {profile.morphology.mythMetaphor}
        </strong>
        . A possible future, not a forecast.
      </p>

      {step === 'predict' ? (
        <>
          <div className={styles.selectors}>
            <label>
              Choose a scenario
              <select
                value={profile.id}
                onChange={(event) =>
                  onChange({ scenario: event.target.value, guess: undefined, first: undefined })
                }
              >
                {allScenarioProfiles.map((candidate) => (
                  <option value={candidate.id} key={candidate.id}>
                    {candidate.id} · {candidate.morphology.mythMetaphor}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Choose an observing method
              <select
                value={instrumentId}
                onChange={(event) => onChange({ instrument: event.target.value })}
              >
                {observingMissionIds.map((id) => (
                  <option value={id} key={id}>
                    {instrumentCopy[id].plainLabel} · {instrumentCopy[id].short}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className={styles.context}>
            This scenario includes:{' '}
            {profile.system.map(({ label }) => label).join('; ') ||
              'no system signature listed in Table 8'}
            .{' '}
            <a
              href={sourceRefHref(profile.systemCellProvenance[0]!)}
              target="_blank"
              rel="noreferrer"
            >
              Scenario context · Table 8 ↗
            </a>
          </p>
          <InstrumentExplanation instrumentId={instrumentId} />
          <fieldset className={styles.guesses}>
            <legend>Will the paper list a technological signature for this method?</legend>
            <p>Make a guess, then reveal the published cell. There is no score.</p>
            <div>
              {Object.entries(guesses).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ lesson: 'observe', guess: value, first: instrumentId })}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      ) : step === 'observe' ? (
        <>
          {guessLabel && <p>Your expectation: {guessLabel.toLowerCase()}.</p>}
          <PublishedResult observation={observation} />
          <p className={styles.takeaway}>
            A blank cell means this method has no signature listed in the paper. It does not
            establish that technology is absent.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() =>
                onChange({
                  lesson: 'compare',
                  first: instrumentId,
                  instrument:
                    instrumentId === 'deep_space_probes'
                      ? 'habitable_worlds_observatory'
                      : 'deep_space_probes',
                })
              }
            >
              Try another instrument →
            </button>
            <button
              type="button"
              onClick={() => onChange({ lesson: 'predict', first: undefined, guess: undefined })}
            >
              Back to your choice
            </button>
          </div>
        </>
      ) : (
        <>
          <label className={styles.secondMethod}>
            Compare with
            <select
              value={instrumentId}
              onChange={(event) => onChange({ instrument: event.target.value })}
            >
              {observingMissionIds.map((id) => (
                <option key={id} value={id} disabled={id === firstInstrumentId}>
                  {instrumentCopy[id].plainLabel} · {instrumentCopy[id].short}
                </option>
              ))}
            </select>
          </label>
          <InstrumentExplanation instrumentId={instrumentId} />
          <div className={styles.results}>
            <PublishedResult observation={first} />
            <PublishedResult observation={observation} />
          </div>
          <p className={styles.takeaway}>
            The civilization stayed the same. Each method examines different evidence under its own
            assumptions. Matching results do not make the methods equivalent, and a blank cell does
            not rule out technology.
          </p>
          <div className={styles.actions}>
            <button type="button" onClick={exit}>
              Continue to free exploration →
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  lesson: 'predict',
                  instrument: firstInstrumentId,
                  first: undefined,
                  guess: undefined,
                })
              }
            >
              Try another scenario
            </button>
          </div>
        </>
      )}
    </section>
  );
}
