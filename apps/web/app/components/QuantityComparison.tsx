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
  const label = dimension === 'population' ? 'paper Earth population' : 'model Earth energy';
  return (
    <span className={styles.quantity}>
      <strong>
        {dimension === 'population'
          ? readableNumber(value)
          : `${readableNumber(value / 1e18)} EJ / year`}
      </strong>
      {comparison ? (
        <span className={styles.comparison}>
          <QuantityGlyph dimension={dimension} />
          <span>
            ≈ {readableNumber(comparison.ratio)} × {label}
          </span>
        </span>
      ) : (
        <span>Reference comparison unavailable</span>
      )}
      <small>
        {scientificNotation(value)}
        {dimension === 'energy' ? ' J / year' : ' total population'}
      </small>
    </span>
  );
}

export function ReferenceEarthNote() {
  const { population, annualEnergyPerPersonGJ } = growthDataset.referenceEarth;
  const comparison = compareWithReferenceEarth(1, 'energy', growthDataset.referenceEarth);
  return (
    <details className={styles.reference}>
      <summary>What does one reference Earth token mean?</summary>
      <p>
        Population: {population.value === null ? 'unavailable' : readableNumber(population.value)},
        the paper’s fixed Earth reference. Energy: that population × {annualEnergyPerPersonGJ.value}{' '}
        GJ per person per year, the paper’s model assumption
        {comparison ? ` (equivalent to ${comparison.referenceValue / 1e18} EJ per year)` : ''}. One
        exajoule (EJ) is a billion billion joules.
      </p>
      <p>
        Each symbol is one reference unit; the multiplier gives the scenario’s total across all
        bodies in the Solar System. Ratios are derived and rounded. Energy tokens represent a model
        budget, not measured current consumption. Neither token measures ecological carrying
        capacity. These are fixed paper references, not Earth in 2026.
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
