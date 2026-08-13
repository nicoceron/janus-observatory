import { describe, expect, it } from 'vitest';

import ledger from '../../../data/assets/ledger.json';
import { AssetLedgerSchema } from './asset';

describe('asset rights ledger', () => {
  it('admits only assets with compatible rights', () => {
    const parsed = AssetLedgerSchema.parse(ledger);
    const reserved = parsed.entries.filter(
      ({ rightsStatus }) => rightsStatus === 'all_rights_reserved',
    );

    expect(parsed.entries).toHaveLength(11);
    expect(reserved).toHaveLength(5);
    expect(reserved.every(({ admissionStatus }) => admissionStatus === 'link_only')).toBe(true);
  });
});
