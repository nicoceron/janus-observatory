# Observer learning verification

2026-09-27 · local branch `codex/observer-learning`.

Implements [Decision 029](../../DECISION_029_OBSERVER_LEARNING.md). This report
describes local production-build and source verification, not deployment or a
scientific reviewer endorsement.

## Checks

- TypeScript: domain, agent, and web type checking passed.
- ESLint and Python Ruff passed. Authored files pass Prettier.
- Vitest: 149 tests across 40 files passed, including five new reference-quantity
  tests for unit conversion, source lineage, preserved published rounding, extreme
  ratios, missing inputs, and rejected invalid inputs.
- Python: 18 ingestion/schema/reproduction tests passed.
- 80 Playwright checks passed across Chromium, Firefox, WebKit, mobile Chromium,
  and mobile WebKit: 50 explorer/learning checks, 15 route accessibility scans,
  10 existing no-JavaScript/no-WebGL checks, and 5 narrow-layout checks.
- All stages restore from URL state; the full keyboard exercise preserves S9,
  contrasts a blank optical cell with the published probe cell, reloads the
  comparison, and restores focus on exiting. Scenario changes, restart, skip,
  malformed URLs, and distinct comparison instruments are covered.
- The guided flow is tested with reduced motion and canvas contexts disabled.
  Its two-result comparison passes automated WCAG A/AA checks in all five browser
  projects. Observatory, Atlas, and scenario-record scans also pass.
- All ten scenario records remain readable without JavaScript. Original explorer
  controls remain functional when WebGL is unavailable.
- Guided choice, guided comparison, and Atlas energy views have no horizontal
  document overflow at an exact 320px viewport in all five projects. Desktop
  WebKit reserves scrollbar space; the assertion permits a document narrower
  than its viewport.
- Source validator: 15 records and checksums verified. Asset validator: 107 rights
  records, 95 derivative records across 94 public files verified. No new external
  runtime asset is added.
- Data validator: 8 datasets, 10 scenarios, 5 missions, 1,361 field-provenance
  records, 120 reconciled cells, and 27 generated files verified. Existing
  cross-publication growth-rate discrepancies remain disclosed and separate.
- `pnpm data:generate:check` reproduces the generated artifacts. Link/citation
  validation passes across 121 route files and 196 citation chunks.
- Production build and bundle budgets pass. The earlier build measured 201,920
  gzip bytes of initial home JavaScript against a 256,000-byte budget; this is
  build accounting, not field Core Web Vitals evidence.

The first browser run exposed test-locator assumptions: nested select labels
needed role/name lookup rather than exact label-text lookup, and a no-overflow
assertion needed to permit reserved scrollbar width. Both were corrected and the
affected checks passed. No product workaround was added for those failures.

## Visual review

The existing dark space background, fonts, and scenario accents are preserved.
The instrument explanation is shared by the guided exercise and free explorer.
Population and energy glyphs remain distinct, with readable quantities, model
reference multipliers, scientific notation, and an expandable source explanation.

Reviewed desktop comparison and Atlas energy views in the app browser, and exact
320px screenshots captured by Playwright:

- [Desktop comparison](desktop-comparison.png)
- [Desktop energy](desktop-energy.png)
- [Mobile choice](mobile-choice.png)
- [Mobile comparison](mobile-comparison.png)
- [Mobile energy](mobile-energy.png)

## Evidence limits and remaining work

The new baseline inputs were checked against extracted text and rendered source
PDF pages 12 and 18. They remain part of an unsigned candidate release pending
independent human review, just like the existing dataset. Energy ratios use a
derived 592.5 EJ/year model reference, not observed Earth consumption or a 2026
measurement. The release version and exact input provenance are in Decision 029.

No production deployment, Windows/Edge device run, physical mobile-device run,
VoiceOver/NVDA audit, classroom learning-outcome study, or field performance
measurement was performed. Automated accessibility checks do not establish full
WCAG conformance. No DOI deposit or additional research simulator was created.
No email or Slack message was sent.

Generated review HTML intentionally preserves the source extraction's whitespace;
it is excluded from Prettier by the existing repository configuration and must not
be edited manually. All generated changes were produced by the Python pipeline.
