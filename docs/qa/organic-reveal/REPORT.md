# Continuous companion reveal

2026-09-14 · verified against `http://192.168.80.205:3000/`.

The prior implementation mounted companions only when their rounded chapter became active,
placing them immediately at their final locations. It also let the incoming Earth's idle staging
lag behind companions. This produced a visible appearance at the chapter midpoint.

Earth and its companions now stage together across adjacent chapters. Companion positions move
from a camera-aligned point behind Earth's opaque sphere into the existing spatial arrangement,
with small timing differences between bodies. Exit reverses the path. Absolute scroll progress
makes backscroll deterministic. This is geometric occlusion; no fade or scale-in effect is used.
Reduced motion still shows complete chapter states immediately. Hidden companions cannot receive
hover or keyboard focus. The existing interactive inspector, spacing and canonical destinations
are preserved.

## Verification

- Unit tests: 123 passed across 33 files. New checks cover continuity at both rounded chapter
  boundaries, reveal endpoints, backscroll, reduced motion and off-center camera occlusion.
- Browser reveal regression: five passed in Chromium, Firefox, WebKit, mobile Chromium and
  mobile WebKit. Nine samples cover entry, both sides of the old midpoint, arrival and reversal.
  The test also checks the incoming Earth exists throughout, one canvas remains, and reduced
  motion exposes all five S3 controls.
- Visual review: `frame-1-3.3.png` through `frame-9-3.3.png` document the forward and reverse
  reveal. The reviewed `3.49` and `3.51` frames retain the same incoming Earth and companions.
- Four existing browser regressions passed: all ten systems and inspectors, hover/keyboard
  alignment, WebGL failure and JavaScript-disabled content (`regression.log`).
- TypeScript, ESLint, production build, canonical data, rights and citation validation passed.
  Initial JavaScript is 189,191 / 256,000 gzip bytes; the whole-journey upper bound is
  17,407,316 / 20,971,520 bytes. Logs accompany this report.
- Formatter coverage excludes generated Playwright trace folders using the existing ignore
  convention; `git diff --check` passed.

## Scope

Production changes: `Space.tsx`, `spatial-targets.ts`, and new `companion-reveal.ts` under
`apps/web/app/voyage/`. New unit and browser regressions, updated Decision 022, status/master-plan
links and original-art provenance accompany them. No geometry exports, dependencies or canonical
scientific values changed. Source version remains
`sha256:46a0e94a969301c49cfafe00463e5c7e9be5dce423ddcdeb21fe4ad0614d2046`.

The scene keeps neighboring roots mounted, but only the two sides of a handoff can be visibly
revealing companions. Hidden roots do not acquire Blender leases. Model loading remains serial,
with the existing 48 MiB decoded cache limit. No physical-device frame-rate guarantee is claimed;
phone browser profiles are emulated. No deployment or push was performed.
