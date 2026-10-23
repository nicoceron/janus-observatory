import { compareWithReferenceEarth, type QuantityDimension } from '@janus/domain';
import {
  growthDataset,
  scientificNotation,
  sourceRefHref,
  sourceRefLabel,
} from '../../lib/canonical-core';
import styles from './quantity-comparison.module.css';

export function readableNumber(value: number) {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    compactDisplay: 'long',
    maximumSignificantDigits: 2,
  }).format(value);
}

function QuantityGlyph({ dimension }: { dimension: QuantityDimension }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
      {dimension === 'population' ? (
        <>
          <circle cx="16" cy="8" r="4" />
          <path d="M8 28v-8a8 8 0 0 1 16 0v8M12 20v8m8-8v8" />
        </>
      ) : (
        <path d="m18 3-12 15h9l-1 11 12-16h-9Z" />
      )}
    </svg>
  );
}

export function QuantityComparison({
  value,
  dimension,
}: {
  value: number;
  dimension: QuantityDimension;
}) {
  const comparison = compareWithReferenceEarth(value, dimension, growthDataset.referenceEarth);
  const label =
    dimension === 'population' ? 'the study’s Earth population' : 'the study’s Earth energy use';
  return (
    <span className={styles.quantity}>
      <strong>
        {dimension === 'population'
          ? readableNumber(value)
          : `${readableNumber(value / 1e18)} EJ a year`}
      </strong>
      {comparison ? (
        <span className={styles.comparison}>
          <QuantityGlyph dimension={dimension} />
          <span>
            ≈ {readableNumber(comparison.ratio)} × {label}
          </span>
        </span>
      ) : (
        <span>No Earth comparison available</span>
      )}
      {dimension === 'energy' ? <small>{scientificNotation(value)} joules a year</small> : null}
    </span>
  );
}

export function ReferenceEarthNote() {
  const { population, annualEnergyPerPersonGJ } = growthDataset.referenceEarth;
  const comparison = compareWithReferenceEarth(1, 'energy', growthDataset.referenceEarth);
  return (
    <details className={styles.reference}>
      <summary>What is “the study’s Earth”?</summary>
      <p>
        The scenario study measures every future against a fixed Earth:{' '}
        {population.value === null ? 'an unstated number of' : readableNumber(population.value)}{' '}
        people, each using {annualEnergyPerPersonGJ.value} gigajoules of energy a year
        {comparison ? ` (${comparison.referenceValue / 1e18} EJ per year in total)` : ''}. An
        exajoule (EJ) is a billion billion joules.
      </p>
      <p>
        The multipliers are rounded and count every world a civilization lives on. The reference is
        the study’s model, not a measurement of Earth today, and says nothing about how many people
        a planet can support.
      </p>
      <p>
        {comparison?.sourceRefs.map((ref, index) => (
          <a key={index} href={sourceRefHref(ref)} target="_blank" rel="noreferrer">
            {sourceRefLabel(ref)} ↗
          </a>
        ))}
      </p>
    </details>
  );
}
