import { describe, expect, it } from 'vitest';

import { initialStoryState, storyReducer } from './story-state';

describe('story reducer', () => {
  it('enters a complete target state directly on jumps and backscroll', () => {
    const started = storyReducer(initialStoryState, { type: 'start', reducedMotion: false });
    const jumped = storyReducer(started, { type: 'activate', index: 6 });
    const back = storyReducer(jumped, { type: 'activate', index: 2 });

    expect(jumped).toMatchObject({ activeIndex: 6, direction: 'forward', started: true });
    expect(back).toMatchObject({ activeIndex: 2, direction: 'backward', started: true });
  });

  it('bounds keyboard movement to the available steps', () => {
    const atStart = storyReducer(initialStoryState, { type: 'move', delta: -1, stepCount: 8 });
    const atEnd = storyReducer(
      { ...initialStoryState, activeIndex: 7 },
      { type: 'move', delta: 1, stepCount: 8 },
    );

    expect(atStart.activeIndex).toBe(0);
    expect(atEnd.activeIndex).toBe(7);
  });

  it('keeps read-without-animation as a first-class mode', () => {
    expect(storyReducer(initialStoryState, { type: 'read' }).mode).toBe('reading');
  });

  it('restores a bounded in-session state and can return to the visual path', () => {
    const restored = storyReducer(initialStoryState, {
      type: 'restore',
      activeIndex: 99,
      mode: 'reading',
      stepCount: 31,
    });
    const visual = storyReducer(restored, { type: 'visual', reducedMotion: true });

    expect(restored).toMatchObject({
      activeIndex: 30,
      mode: 'reading',
      selectedObserver: 'habitable_worlds_observatory',
      started: true,
    });
    expect(visual.mode).toBe('reduced');
  });

  it('carries the reader-selected observer through movement, modes, and session restore', () => {
    const selected = storyReducer(initialStoryState, {
      type: 'selectObserver',
      selectedObserver: 'radio',
    });
    const moved = storyReducer(selected, { type: 'move', delta: 1, stepCount: 31 });
    const reading = storyReducer(moved, { type: 'read' });
    const restored = storyReducer(initialStoryState, {
      type: 'restore',
      activeIndex: reading.activeIndex,
      mode: reading.mode,
      selectedObserver: reading.selectedObserver,
      stepCount: 31,
    });

    expect(moved.selectedObserver).toBe('radio');
    expect(reading.selectedObserver).toBe('radio');
    expect(restored.selectedObserver).toBe('radio');
    expect(storyReducer(restored, { type: 'restart' }).selectedObserver).toBe(
      'habitable_worlds_observatory',
    );
  });
});
