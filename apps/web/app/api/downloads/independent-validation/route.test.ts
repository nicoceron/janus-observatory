import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { GET } from './route';

const artifact = new URL(
  '../../../../../../data/generated/collapse/independent-validation.json',
  import.meta.url,
);

describe('GET /api/downloads/independent-validation', () => {
  it('returns the exact hash-checked generated artifact as an attachment', async () => {
    const expected = await readFile(artifact);
    const response = await GET();
    const actual = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(actual.equals(expected)).toBe(true);
    expect(response.headers.get('content-disposition')).toContain('attachment');
    expect(response.headers.get('x-janus-artifact-sha256')).toBe(
      createHash('sha256').update(expected).digest('hex'),
    );
    expect(response.headers.get('x-janus-data-version')).toMatch(/^sha256:/);
  });
});
