import type { LifePlan } from './life-plan';
export type ActivityMotion = {
  u: number;
  yaw: number;
  speed: number;
  distance: number;
  work: number;
  payload: number;
  at: 'from' | 'to' | null;
};
const smooth = (u: number) => u * u * (3 - 2 * u);
// Surface traffic eases into its working stops. Airborne actors use a closed loop below.
export function travelProgress(v: number) {
  return { u: smooth(v), derivative: 6 * v * (1 - v) };
}
/** Outbound trip, task at destination, return trip, task at origin. Position is continuous at every boundary. */
export function activityMotion(job: LifePlan, seconds: number): ActivityMotion {
  if (job.route === 'flight' || job.route === 'hover') {
    const period = job.travel * 2;
    return {
      u: (((seconds % period) + period) % period) / period,
      yaw: 0,
      speed: 1 / period,
      distance: seconds / period,
      work: 0,
      payload: 1,
      at: null,
    };
  }
  const duration = 2 * (job.travel + job.dwell),
    cycles = Math.floor(seconds / duration),
    t = ((seconds % duration) + duration) % duration;
  const base = cycles * 2;
  if (t < job.travel) {
    const v = t / job.travel;
    const progress = travelProgress(v);
    return {
      u: progress.u,
      yaw: 0,
      speed: progress.derivative / job.travel,
      distance: base + progress.u,
      work: 0,
      payload: 1,
      at: null,
    };
  }
  if (t < job.travel + job.dwell) {
    const v = (t - job.travel) / job.dwell;
    return {
      u: 1,
      yaw: Math.PI * smooth(Math.max(0, (v - 0.65) / 0.35)),
      speed: 0,
      distance: base + 1,
      work: Math.sin(Math.PI * Math.min(1, v / 0.65)),
      payload: 1 - smooth(Math.min(1, v / 0.45)),
      at: 'to',
    };
  }
  if (t < 2 * job.travel + job.dwell) {
    const v = (t - job.travel - job.dwell) / job.travel;
    const progress = travelProgress(v);
    return {
      u: 1 - progress.u,
      yaw: Math.PI,
      speed: progress.derivative / job.travel,
      distance: base + 1 + progress.u,
      work: 0,
      payload: 0,
      at: null,
    };
  }
  const v = (t - 2 * job.travel - job.dwell) / job.dwell;
  return {
    u: 0,
    yaw: Math.PI + Math.PI * smooth(Math.max(0, (v - 0.65) / 0.35)),
    speed: 0,
    distance: base + 2,
    work: Math.sin(Math.PI * Math.min(1, v / 0.65)),
    payload: smooth(Math.min(1, v / 0.6)),
    at: 'from',
  };
}
