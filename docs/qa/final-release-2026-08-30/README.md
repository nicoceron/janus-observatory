# Final release-candidate visual QA

Date: 2026-08-30  
Canonical data version: `sha256:46a0e94a969301c49cfafe00463e5c7e9be5dce423ddcdeb21fe4ad0614d2046`  
Decision: **pass for the internal release candidate**

## Evidence captured

- Nineteen production-build screenshots: eleven representative Story states, Observatory landing
  and both scientific views, Atlas, Research, and three reduced-motion mobile routes.
- `contact-sheet.png` and `contact-sheet-report.json`, generated from the eleven Story frames by the
  animation quality gate. The report contains zero warnings.
- Four deterministic Linux/Chromium/SwiftShader baselines in `apps/web/e2e-visual/snapshots`.
  The authoritative update passed 4/4, followed by a separate unchanged comparison that passed
  4/4.
- The optimized production-server browser matrix passed 156 tests with 14 intentional
  browser-specific skips across Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit.

## Visual findings

- The Story keeps a stable editorial grid and strong subject hierarchy across Earth, branching,
  observer, ocular, matrix, collapse, handoff, and epilogue states. Text cards remain legible
  against the spatial stage and do not compete with the focal object.
- The observer silhouette, telescope, worlds, and evidence overlays remain separated. The S9 HWO
  blank state and SGL state are visibly different without translating a blank cell into absence of
  technology.
- The Observatory atmosphere view shows all fourteen independent rows, visible null crosses, and
  no shared-score axis. The modality view and Atlas expose separate categorical cells rather than
  filled-cell totals or a leaderboard.
- The forced WebGL failure state has zero canvases, a visible recovery action, a structured DOM
  Earth, and the complete 31-step text path.
- Mobile Home, Observatory, and Atlas preserve hierarchy, readable copy, usable controls, and safe
  space above the persistent motion selector.

## Corrections made during this review

- Recentered the streamed loading state and reserved bottom safe space so its title cannot be
  clipped by the motion selector on a phone.
- Reserved mobile hero space above the motion selector and moved the scenario rail clear of it.
- Reduced the mobile Home wordmark to its mark so navigation labels no longer collide.
- Made the capture harness wait for the real primary navigation before accepting a route frame,
  preventing a transient loading shell from being mistaken for the final UI.

## Limits retained honestly

- A static contact sheet can assess framing, silhouette stability, subject dominance, layer
  separation, and state-to-state coherence; it cannot by itself prove the absence of temporal
  flicker or frame pacing problems.
- The deterministic pixel gate uses pinned Chromium with SwiftShader. Native-GPU raster variance,
  physical-device frame rate and memory, and manual assistive-technology review remain deployment
  gates.
- The generated observer poster and scenario imagery remain visibly `model_generated` or
  `interpretive`; they do not replace canonical scientific data.
