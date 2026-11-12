import { describe, expect, it } from 'vitest';
import { AHEAD, BODY, enqueue, rankOf, WORLD, type Queued } from './queue';

const keys = (pending: Queued[]) => pending.map((job) => job.key);
const ask = (pending: Queued[], key: string, urgent = true) =>
  enqueue(pending, { key, rank: rankOf(key, urgent) });

describe('idle build queue order', () => {
  it('builds a shown world before the companions that mounted after it', () => {
    const pending: Queued[] = [];
    // The order React mounts a system in: its Earth, then each companion.
    for (const key of ['world:S3:overview', 'body:S3:Moon:overview', 'body:S3:Mars:overview'])
      ask(pending, key);
    expect(keys(pending)).toEqual([
      'world:S3:overview',
      'body:S3:Mars:overview',
      'body:S3:Moon:overview',
    ]);
  });

  it('puts the most recent request first within a rank', () => {
    const pending: Queued[] = [];
    // A full tier and then its cheap tier, as `useProgressive` asks for them.
    ask(pending, 'world:S2:story');
    ask(pending, 'world:S2:overview');
    ask(pending, 'world:S3:overview');
    expect(keys(pending)).toEqual(['world:S3:overview', 'world:S2:overview', 'world:S2:story']);
  });

  it('keeps models warmed ahead of need behind every shown one, in the order asked', () => {
    const pending: Queued[] = [];
    ask(pending, 'world:S7:overview', false);
    ask(pending, 'world:S8:overview', false);
    ask(pending, 'body:S2:Moon:compact');
    ask(pending, 'world:S2:story');
    expect(keys(pending)).toEqual([
      'world:S2:story',
      'body:S2:Moon:compact',
      'world:S7:overview',
      'world:S8:overview',
    ]);
    expect(pending.map((job) => job.rank)).toEqual([WORLD, BODY, AHEAD, AHEAD]);
  });

  it('moves a warmed model up when it is shown, and never moves one down', () => {
    const pending: Queued[] = [];
    ask(pending, 'world:S7:overview', false);
    ask(pending, 'body:S2:Moon:compact');
    ask(pending, 'world:S7:overview');
    expect(keys(pending)).toEqual(['world:S7:overview', 'body:S2:Moon:compact']);
    ask(pending, 'world:S7:overview', false);
    expect(keys(pending)).toEqual(['world:S7:overview', 'body:S2:Moon:compact']);
    expect(pending[0].rank).toBe(WORLD);
  });

  it('holds one entry per model and keeps its other fields', () => {
    const pending: (Queued & { scope: string })[] = [];
    enqueue(pending, { key: 'world:present:story', rank: AHEAD, scope: 'core' });
    enqueue(pending, { key: 'world:present:story', rank: WORLD, scope: 'ignored' });
    expect(pending).toEqual([{ key: 'world:present:story', rank: WORLD, scope: 'core' }]);
  });
});
