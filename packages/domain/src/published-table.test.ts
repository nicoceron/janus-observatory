import { describe, expect, it } from 'vitest';

import earthAtmosphere from '../../../data/canonical/atmosphere/earth-apjl-table-1.json';
import { PublishedNumericTableSchema } from './published-table';

describe('published numeric table contract', () => {
  it('validates the transcribed Earth atmosphere table', () => {
    const parsed = PublishedNumericTableSchema.parse(earthAtmosphere);

    expect(parsed.columns).toHaveLength(12);
    expect(parsed.rows).toHaveLength(14);
    expect(parsed.rows.find(({ id }) => id === 'co2')?.values.S6).toBe(30_000);
    expect(parsed.rows.find(({ id }) => id === 'cfc_11')?.values.S5).toBeNull();
  });
});
