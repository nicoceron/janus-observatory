'use client';

import { useRef } from 'react';
import styles from './chapter-navigator.module.css';

export function ChapterNavigator({
  chapters,
  chapter,
  activeIndex,
  stepCount,
  onMove,
  reducedMotion,
}: {
  chapters: { chapter: string; firstIndex: number; label: string }[];
  chapter: string;
  activeIndex: number;
  stepCount: number;
  onMove: (index: number) => void;
  reducedMotion: boolean;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  function move(index: number) {
    if (menu.current) menu.current.open = false;
    onMove(index);
  }
  return (
    <nav
      className={styles.navigator}
      aria-label="Story progress"
      onKeyDown={(event) => {
        // Native controls own their arrows; do not let the story shortcut hijack them.
        event.stopPropagation();
        if (event.key === 'Escape' && menu.current?.open) {
          menu.current.open = false;
          menu.current.querySelector('summary')?.focus();
        }
      }}
    >
      <button
        className={styles.arrow}
        type="button"
        aria-label="Previous story step"
        disabled={activeIndex === 0}
        onClick={() => move(activeIndex - 1)}
      >
        ←
      </button>
      <details ref={menu} className={styles.menu}>
        <summary aria-label="Choose story chapter">
          <span className={styles.current}>
            <small>{reducedMotion ? 'Motion reduced' : 'THE JOURNEY'}</small>
            <strong>{chapters.find((item) => item.chapter === chapter)?.label}</strong>
          </span>
          <span className={styles.count}>
            {String(activeIndex + 1).padStart(2, '0')} <span>/ {stepCount}</span>
          </span>
          <span aria-hidden="true">⌄</span>
        </summary>
        <div className={styles.chapters}>
          {chapters.map((item) => (
            <button
              type="button"
              key={item.chapter}
              aria-label={`Chapter ${item.chapter}: ${item.label}`}
              aria-current={chapter === item.chapter ? 'step' : undefined}
              onClick={() => move(item.firstIndex)}
            >
              <span>{item.chapter}</span>
              <strong>{item.label}</strong>
              <small>{String(item.firstIndex + 1).padStart(2, '0')}</small>
            </button>
          ))}
        </div>
      </details>
      <button
        className={styles.arrow}
        type="button"
        aria-label="Next story step"
        disabled={activeIndex === stepCount - 1}
        onClick={() => move(activeIndex + 1)}
      >
        →
      </button>
      <div className={styles.track} aria-hidden="true">
        <i style={{ transform: `scaleX(${(activeIndex + 1) / stepCount})` }} />
      </div>
    </nav>
  );
}
