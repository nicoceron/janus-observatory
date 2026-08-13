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
});
