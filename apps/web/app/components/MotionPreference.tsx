'use client';

import { useCallback, useEffect, useState } from 'react';

import styles from './MotionPreference.module.css';

export type MotionPreferenceValue = 'system' | 'reduced' | 'full';

const motionStorageKey = 'janus-motion-preference';
const motionChangeEvent = 'janus:motion-change';
const motionOptions: ReadonlyArray<{ label: string; value: MotionPreferenceValue }> = [
  { label: 'System', value: 'system' },
  { label: 'Reduced', value: 'reduced' },
  { label: 'Full', value: 'full' },
];

function isMotionPreference(value: string | null): value is MotionPreferenceValue {
  return value === 'system' || value === 'reduced' || value === 'full';
}

function currentPreference(): MotionPreferenceValue {
  if (typeof document === 'undefined') return 'system';
  const value = document.documentElement.dataset.motion ?? null;
  return isMotionPreference(value) ? value : 'system';
}

function shouldReduce(preference: MotionPreferenceValue, mediaQuery: MediaQueryList) {
  return preference === 'reduced' || (preference === 'system' && mediaQuery.matches);
}

function storedPreference() {
  try {
    const value = window.localStorage.getItem(motionStorageKey);
    return isMotionPreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

export function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(shouldReduce(currentPreference(), mediaQuery));

    update();
    mediaQuery.addEventListener('change', update);
    window.addEventListener(motionChangeEvent, update);

    return () => {
      mediaQuery.removeEventListener('change', update);
      window.removeEventListener(motionChangeEvent, update);
    };
  }, []);

  return reducedMotion;
}

export function MotionPreference() {
  const [preference, setPreference] = useState<MotionPreferenceValue>('system');

  const applyPreference = useCallback((nextPreference: MotionPreferenceValue) => {
    document.documentElement.dataset.motion = nextPreference;
    try {
      window.localStorage.setItem(motionStorageKey, nextPreference);
    } catch {
      // The preference still applies for this page when storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent(motionChangeEvent));
    setPreference(nextPreference);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => applyPreference(storedPreference()));
    return () => window.cancelAnimationFrame(frame);
  }, [applyPreference]);

  return (
    <aside className={styles.motionPreference} aria-label="Motion preference">
      <span className={styles.label}>Motion</span>
      <div className={styles.options} role="group" aria-label="Animation amount">
        {motionOptions.map(({ label, value }) => (
          <button
            aria-pressed={preference === value}
            className={styles.option}
            key={value}
            onClick={() => applyPreference(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </aside>
  );
}
