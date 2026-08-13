export type StoryMode = 'guided' | 'reduced' | 'reading';

export type StoryState = {
  activeIndex: number;
  started: boolean;
  mode: StoryMode;
  direction: 'forward' | 'backward' | 'jump';
};

export type StoryAction =
  | { type: 'start'; reducedMotion: boolean }
  | { type: 'read' }
  | { type: 'activate'; index: number }
  | { type: 'move'; delta: -1 | 1; stepCount: number }
  | { type: 'restart' };

export const initialStoryState: StoryState = {
  activeIndex: 0,
  started: false,
  mode: 'guided',
  direction: 'jump',
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
    case 'activate': {
      if (action.index === state.activeIndex) return state;
      return {
        ...state,
        activeIndex: action.index,
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
