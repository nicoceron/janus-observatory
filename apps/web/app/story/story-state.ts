import type { ObservingMissionId } from '@janus/domain';

export type StoryMode = 'guided' | 'reduced' | 'reading';

export type StoryState = {
  activeIndex: number;
  started: boolean;
  mode: StoryMode;
  direction: 'forward' | 'backward' | 'jump';
  selectedObserver: ObservingMissionId;
};

export type StoryAction =
  | { type: 'start'; reducedMotion: boolean }
  | { type: 'read' }
  | { type: 'visual'; reducedMotion: boolean }
  | {
      type: 'restore';
      activeIndex: number;
      mode: StoryMode;
      selectedObserver?: ObservingMissionId;
      stepCount: number;
    }
  | { type: 'selectObserver'; selectedObserver: ObservingMissionId }
  | { type: 'activate'; index: number }
  | { type: 'move'; delta: -1 | 1; stepCount: number }
  | { type: 'restart' };

export const initialStoryState: StoryState = {
  activeIndex: 0,
  started: false,
  mode: 'guided',
  direction: 'jump',
  selectedObserver: 'habitable_worlds_observatory',
};

export function storyReducer(state: StoryState, action: StoryAction): StoryState {
  switch (action.type) {
    case 'start':
      return {
        ...state,
        started: true,
        mode: action.reducedMotion ? 'reduced' : 'guided',
      };
    case 'read':
      return { ...state, started: true, mode: 'reading' };
    case 'visual':
      return {
        ...state,
        started: true,
        mode: action.reducedMotion ? 'reduced' : 'guided',
      };
    case 'restore':
      return {
        activeIndex: Math.min(Math.max(action.activeIndex, 0), action.stepCount - 1),
        started: true,
        mode: action.mode,
        direction: 'jump',
        selectedObserver: action.selectedObserver ?? initialStoryState.selectedObserver,
      };
    case 'selectObserver':
      return { ...state, selectedObserver: action.selectedObserver };
    case 'activate': {
      if (action.index === state.activeIndex) return state;
      return {
        ...state,
        activeIndex: action.index,
        started: state.started || action.index > 0,
        direction: action.index > state.activeIndex ? 'forward' : 'backward',
      };
    }
    case 'move': {
      const activeIndex = Math.min(
        Math.max(state.activeIndex + action.delta, 0),
        action.stepCount - 1,
      );
      return {
        ...state,
        activeIndex,
        direction: activeIndex > state.activeIndex ? 'forward' : 'backward',
      };
    }
    case 'restart':
      return initialStoryState;
  }
}
