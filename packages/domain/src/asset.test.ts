import { describe, expect, it } from 'vitest';

import ledger from '../../../data/assets/ledger.json';
import { AssetLedgerEntrySchema, AssetLedgerSchema } from './asset';

describe('asset rights ledger', () => {
  it('admits only assets with compatible rights', () => {
    const parsed = AssetLedgerSchema.parse(ledger);
    const reserved = parsed.entries.filter(
      ({ rightsStatus }) => rightsStatus === 'all_rights_reserved',
    );

    expect(parsed.entries).toHaveLength(33);
    expect(reserved).toHaveLength(5);
    expect(reserved.every(({ admissionStatus }) => admissionStatus === 'link_only')).toBe(true);
  });

  it('records the complete source, retrieval, display, and publication contract', () => {
    const parsed = AssetLedgerSchema.parse(ledger);
    const linkOnly = parsed.entries.filter(
      ({ admissionStatus }) => admissionStatus === 'link_only',
    );
    const publicDerivatives = parsed.entries.filter(({ derivativePublicPath }) =>
      Boolean(derivativePublicPath),
    );

    expect(parsed.schemaVersion).toBe('2.0.0');
    expect(parsed.entries.every(({ sourceAgency }) => sourceAgency.length > 0)).toBe(true);
    expect(parsed.entries.every(({ retrievedAt }) => /^\d{4}-\d{2}-\d{2}$/.test(retrievedAt))).toBe(
      true,
    );
    expect(
      linkOnly.every(
        ({ derivativeChecksum, derivativePublicPath, sourceChecksum, transformations }) =>
          !sourceChecksum &&
          !derivativeChecksum &&
          !derivativePublicPath &&
          transformations.length === 0,
      ),
    ).toBe(true);
    expect(
      publicDerivatives.every(({ derivativeChecksum, sourceChecksum, transformations }) =>
        Boolean(sourceChecksum && derivativeChecksum && transformations.length > 0),
      ),
    ).toBe(true);
    expect(
      publicDerivatives.every(({ allowedTransformations, appliedTransformations }) =>
        appliedTransformations.every((value) => allowedTransformations.includes(value)),
      ),
    ).toBe(true);
  });

  it('rejects rights-incompatible publication and undocumented transformation claims', () => {
    const parsed = AssetLedgerSchema.parse(ledger);
    const openArtifact = parsed.entries.find(({ id }) => id === 'janus.artifact.s5.1.1');
    const portrait = parsed.entries.find(({ id }) => id === 'janus.generated.world.s1.v1');

    expect(openArtifact).toBeDefined();
    expect(portrait).toBeDefined();
    expect(
      AssetLedgerEntrySchema.safeParse({
        ...openArtifact,
        admissionStatus: 'approved',
        rightsStatus: 'all_rights_reserved',
      }).success,
    ).toBe(false);
    expect(
      AssetLedgerEntrySchema.safeParse({
        ...portrait,
        appliedTransformations: ['responsive rendering'],
      }).success,
    ).toBe(false);
  });

  it('records one admitted interpretive portrait for every Janus scenario', () => {
    const parsed = AssetLedgerSchema.parse(ledger);
    const portraits = parsed.entries.filter(({ id }) => id.startsWith('janus.generated.world.'));

    expect(portraits).toHaveLength(10);
    expect(portraits.map(({ scenarioId }) => scenarioId)).toEqual([
      'S1',
      'S2',
      'S3',
      'S4',
      'S5',
      'S6',
      'S7',
      'S8',
      'S9',
      'S10',
    ]);
    expect(
      portraits.every(
        ({ aiAssistanceDisclosure, derivativePublicPath, sourceChecksum }) =>
          aiAssistanceDisclosure?.includes('not a Project Janus research product') &&
          derivativePublicPath?.startsWith('/assets/scenarios/') &&
          Boolean(sourceChecksum),
      ),
    ).toBe(true);
  });

  it('keeps the generated observer poster explicitly interpretive and traceable', () => {
    const parsed = AssetLedgerSchema.parse(ledger);
    const poster = parsed.entries.find(({ id }) => id === 'janus.generated.observer.poster.v1');

    expect(poster).toMatchObject({
      admissionStatus: 'approved',
      derivativePublicPath: '/assets/observer/janus-observer-poster-v1.webp',
      rightsStatus: 'permission_granted',
    });
    expect(poster?.aiAssistanceDisclosure).toContain('not a Project Janus research product');
    expect(poster?.sourceChecksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(poster?.derivativeChecksum).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('admits checksum-locked 1K, 2K, and 4K runtime variants for every Earth map', () => {
    const parsed = AssetLedgerSchema.parse(ledger);
    const families = [
      ['earth-day', 'solarsystemscope.texture.earth-day-threejs'],
      ['earth-night', 'solarsystemscope.texture.earth-night-threejs'],
      ['earth-bump-roughness-clouds', 'solarsystemscope.texture.earth-bump-clouds-threejs'],
    ] as const;

    for (const [fileStem, ledgerId] of families) {
      const variants = parsed.entries.filter(
        ({ id }) => id === ledgerId || id.startsWith(`${ledgerId}.`),
      );
      const sourceChecksums = new Set(variants.map(({ sourceChecksum }) => sourceChecksum));

      expect(variants).toHaveLength(3);
      expect(sourceChecksums.size).toBe(1);
      expect(variants.every(({ admissionStatus }) => admissionStatus === 'approved')).toBe(true);
      expect(variants.map(({ derivativePublicPath }) => derivativePublicPath).sort()).toEqual(
        [
          `/assets/planets/${fileStem}-1024.webp`,
          `/assets/planets/${fileStem}-2048.webp`,
          `/assets/planets/${fileStem}-4096.jpg`,
        ].sort(),
      );
      expect(
        variants
          .filter(({ id }) => id.endsWith('.1k') || id.endsWith('.2k'))
          .every(({ requiredCreditText }) => requiredCreditText.includes('Janus Observatory')),
      ).toBe(true);
      expect(variants.map(({ maxDisplaySize }) => maxDisplaySize?.widthPx).sort()).toEqual([
        1024, 2048, 4096,
      ]);
    }
  });

  it('records the combined observer GLB as one explicit shared derivative', () => {
    const parsed = AssetLedgerSchema.parse(ledger);
    const contributors = parsed.entries.filter(
      ({ derivativePublicPath }) =>
        derivativePublicPath === '/assets/models/janus-alien-observer-v4.glb',
    );

    expect(contributors).toHaveLength(2);
    expect(new Set(contributors.map(({ derivativeChecksum }) => derivativeChecksum)).size).toBe(1);
    expect(new Set(contributors.map(({ sharedDerivativeGroup }) => sharedDerivativeGroup))).toEqual(
      new Set(['janus-alien-observer-v4']),
    );
    expect(contributors.every(({ maxDisplaySize }) => maxDisplaySize === null)).toBe(true);
  });
});
