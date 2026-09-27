# Spatial systems and attached names

2026-09-12 · local LAN development site `http://192.168.80.205:3000/`.
Decision: [022](../../DECISION_022_SPATIAL_SYSTEMS.md).

The former grid, persistent body captions and system labels are removed. Earth is the dominant
foreground world; Luna is nearby, with Mars, Venus and extended-system destinations distributed
at distinct camera depths and apparent sizes. All destinations still come from the existing
canonical selections. Names appear only on hover or keyboard focus, and their click targets are
projected from actual scene transforms every frame. Clicking still opens the detailed inspector.

Visual review: desktop S3 and S9 show an asymmetric, uncaptained space composition. S9 retains
all eight destinations. The live in-app browser was also inspected at its compact viewport.
Screenshots for each scenario and browser profile are saved alongside this report. They document
artistic framing, not real orbital positions or a scale reconstruction.

## Verification

- TypeScript, ESLint, production build: passed.
- Unit tests: 121 passed across 32 files, including viewport clearance and depth hierarchy.
- Asset rights: 107 records, 95 derivatives across 94 public files passed validation.
- Canonical data and 196 citation chunks across 100 routes: validation passed; data unchanged.
- Initial JavaScript: 189,167 / 256,000 gzip bytes. Conservative whole-journey payload:
  17,406,730 / 20,971,520 bytes. No new model downloads, textures or renderer dependencies.
- Browser verification: 86 distinct cases passed after focused corrections; four intentional
  non-Chromium motion-capture skips. The initial 90-case run (`browser.log`) had 81 passes,
  three Safari sweep timeouts and two mobile keyboard-order failures. `recheck.log` resolves
  the sweep timeouts and verifies the corrected keyboard order. Its two remaining motion-test
  assertions were corrected to use a quarter-chapter scroll and canvas-relative coordinates.
  The final interaction test passed on all five profiles (`verified-interaction.log`): desktop
  Chromium, Firefox, WebKit, mobile Chromium and mobile WebKit.
- Formatter, final test-source lint/typecheck, and `git diff --check`: passed.

The Safari coordinate check accounts for the distinction between layout and visual viewports,
verified against [MDN's VisualViewport documentation](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).
Both the canvas and fixed controls share that offset; the test compares their rectangles in the
same coordinate space rather than adding an artificial offset to the website.

The interaction regression checks hidden idle names, hover and keyboard focus, a Luna inspector
round trip, real-time target alignment through scrolling, return navigation and reduced-motion
freeze. The wider matrix covers all ten systems, retained canvas identity, a mobile keyboard-order correction, WebGL failure,
JavaScript-disabled content, hydration, charts, and the telescope journey.

## Scope and limitations

Changed production sources in this pass: `system-layout.ts`, `spatial-targets.ts`, `Space.tsx`,
`WorldExplore.tsx`, and `voyage.module.css`, under `apps/web/app/voyage/`, plus keyboard
ordering in `apps/web/app/page.tsx`. Tests and source-ledger
receipts accompany them. The existing Blender models and terrain geometry are unchanged.
Canonical source version remains `sha256:46a0e94a969301c49cfafe00463e5c7e9be5dce423ddcdeb21fe4ad0614d2046`.
Original interpretive art provenance: `art-source.json` and the asset ledger.

Camera depths, relative sizes and the restrained motion are art direction, not astronomical
measurements. Browser phone profiles are emulated; physical-device GPU performance and manual
screen-reader testing are not claimed. One canvas, serial model loading and the existing 48 MiB
decoded-asset cap are retained. No public deployment or remote push was performed.
