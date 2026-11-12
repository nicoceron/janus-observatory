/**
 * Order of the idle build queue (`LowPoly.tsx`). A model someone is showing is built before one
 * warmed ahead of need, and among those a world is built before any companion body: a system
 * without its Earth reads as broken, one without a moon yet does not. Within a rank the most
 * recent request goes first, because that is where the reader is now; models warmed ahead of need
 * keep the order they were asked for.
 */
export type Rank = 0 | 1 | 2;
/** A world someone is showing. */
export const WORLD: Rank = 0;
/** A companion body or system feature someone is showing. */
export const BODY: Rank = 1;
/** Warmed ahead of need. */
export const AHEAD: Rank = 2;

export type Queued = { key: string; rank: Rank };

export const rankOf = (key: string, urgent: boolean): Rank =>
  !urgent ? AHEAD : key.startsWith('world:') ? WORLD : BODY;

/** Add a job, or move a queued one up when it is asked for again with more urgency. */
export function enqueue<Job extends Queued>(pending: Job[], job: Job) {
  const queued = pending.findIndex((other) => other.key === job.key);
  if (queued >= 0) {
    // Warming a model that is already queued changes nothing.
    if (job.rank === AHEAD) return;
    job = { ...pending[queued], rank: Math.min(pending[queued].rank, job.rank) as Rank };
    pending.splice(queued, 1);
  }
  if (job.rank === AHEAD) {
    pending.push(job);
    return;
  }
  const at = pending.findIndex((other) => other.rank >= job.rank);
  pending.splice(at < 0 ? pending.length : at, 0, job);
}
