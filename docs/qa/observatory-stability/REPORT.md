# Observatory scenario-switch stability

2026-09-27. Local production preview at `http://127.0.0.1:3100`.

## Cause and correction

The result column's intrinsic height depended on the selected scenario's large,
wrapping heading and signature list. Its sibling planet was vertically centered,
and the selectors followed the variable-height result. In the in-app browser,
switching S3 to S1 increased the result height from about 572 to 847 CSS pixels;
the controls moved by about 137 pixels while scroll anchoring changed the page
offset by another 137 pixels.

The selectors now precede the planet and evidence. The method explanation follows
the results. The planet aligns to the top; the result column is wider, with a
smaller heading. Ten lightweight evidence panels occupy the same CSS grid area.
Their six shared subgrid rows reserve the natural space required by all ten
scenarios at the selected instrument and current width. Inactive panels use
`visibility: hidden`, `aria-hidden`, and `inert`: they contribute intrinsic size,
but cannot be seen, announced, selected, or focused. Only one planet is mounted.
The active result remains a polite, atomic live region.

This preserves wrapping and text resizing without a fixed-height text box,
clipping, nested scrolling, resize measurement, scroll correction, or animation.
Selector columns can also shrink within the available width: the former minimum
track widths clipped the data-view button at 1081px.

Documentation consulted before implementation:

- `docs/MASTER_PLAN.md` and Decision 029.
- Installed Next.js CSS Modules and `useRouter` documentation.
- [CSS grid alignment](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Box_alignment),
  [subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Subgrid),
  and [visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/visibility).

## Verification

- The initial regression failed on the previous build's scroll movement.
- Scenario-switch regression: all ten scenarios under each of the five methods;
  assert unchanged scroll position, selector rectangle, planet rectangle, and
  complete stage rectangle to within one CSS pixel. Also check visible evidence
  fits its panel and only the active source link is accessible.
- Keyboard activation at exactly 320px, reduced motion, and WebGL disabled;
  retained focus, stationary geometry, one accessible selected heading, no
  horizontal overflow, and no axe WCAG A/AA violations in the explorer.
- Control reachability at 1080, 1081, and 1280px.
- Final layout suite: 15 passed across Chromium, Firefox, WebKit, mobile Chromium,
  and mobile WebKit configurations (including 250 scenario/instrument selections).
- Existing Observatory URL restoration/data view and guided-learning checks:
  20 passed across those five configurations.
- Unit suite: 149 passed. Formatting, Typecheck, ESLint, production build, generated-data
  reproducibility, canonical data, asset rights, and citation/link validators pass.
- Bundle budget passes; initial homepage JavaScript remains 201,920 gzip bytes
  against the 256,000-byte limit.
- Desktop visual inspection with real WebGL: `desktop-s1.png`, `desktop-s3.png`.

## Handoff and limits

Changed files for this correction: `ObservatoryExplorer.tsx`,
`ScenarioEvidence.tsx`, `observatory.module.css`,
`apps/web/e2e/observatory-layout.spec.ts`, this report and its screenshots, and the
master-plan link. No dependency or schema change; no media assets added.

Assumption: switching a scenario should update its content while preserving the
reader's scroll position and the surrounding layout. Instrument changes can
resize the evidence to fit that method; the controls and planet origin stay above
the changing content.

Scientific outputs and source locators are unchanged. Results still use
`JANUS-PAPER-03`, `arXiv:2511.20329v2`, Figure 6 and the canonical mission
assumptions. Generated release identity remains
`sha256:a93da15bce68f5d475179bccf968199c0f247a58242e1477244939848ceb754f`.
The pre-existing published growth-rate discrepancy remains explicitly separate.
The release is still a candidate pending independent review.

Verification is local and uses emulated mobile viewports, not physical phones or
Windows Edge. No production deployment or push was performed. Native assistive
technology announcements were not manually audited; accessibility-tree and axe
checks cover the active/inactive panel behavior.

Scoped `git diff --check` passes for the application and documentation. The full
working-tree check still flags source-extraction trailing spaces in the generated
growth review HTML from the preceding data work; generated artifacts were not
hand-edited for this UI correction.
