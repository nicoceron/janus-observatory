import { smooth } from './scroll';

/** Absolute scroll choreography: approach, pass through the barrel, hold, leave into empty sky. */
export function opticalTravel(scene: number) {
  const leave = smooth((scene - 13.45) / 0.45);
  const through = smooth((scene - 12.65) / 0.33);
  return {
    approach: smooth((scene - 12) / 0.65),
    align: smooth((scene - 12) / 0.5),
    through,
    enter: through,
    frame: smooth((scene - 12) / 0.5) * (1 - leave),
    leave,
  };
}
