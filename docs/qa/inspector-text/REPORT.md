# Inspector story-text isolation — 21 September 2026

## Cause and correction

The anchored chapter copy introduced in v23 explicitly sets its own visibility. The inspector's existing `visibility: hidden` on the inert story ancestor could therefore be overridden by that descendant. This let the left-side heading, paragraph and statistics remain painted behind the enlarged model.

The existing inspection boundary now also sets the entire inert story layer to zero opacity. Opacity composites the subtree as a group, so individual chapter visibility cannot escape it. Existing inertness, focus trapping and focus restoration remain in place; the DOM, layout height and scroll position stay intact. Closing restores the story through the same existing inspection state. No timers, duplicated text, z-index overrides, model, resolution, dependency or canonical-data changes.

Documentation consulted before implementation: [MDN visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/visibility) documents descendant visibility overrides; [MDN opacity](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/opacity) documents whole-element and contents compositing. This refines Decision 033's presentation ownership at the existing inspector boundary.

## Reproduction and scope

The new full-motion browser regression failed against the unchanged v23 release artifact: story text remained painted during Earth inspection. `before.png` captures the failure. The check exercises S2 Earth, its Mining hauler, Luna, Escape, repeated opening and the Close button, and checks that document height, scroll position, focus and the single canvas survive.

Changed files: `apps/web/app/voyage/voyage.module.css` (the inspection boundary), `apps/web/e2e/world-explorer.spec.ts` (regression), `scripts/record-world-art.ts`, `data/assets/ledger.json` and this evidence directory. Unrelated working-tree edits were preserved. Assumption: preserve the approved scene and inspector composition; hide the underlying story only during inspection.

Source-art version: `inspector-text-v24-2026-09-21`. Source SHA-256: `9a62794fed2441e92549aa45e222109043bf39528d833cc42439ba12dfff40b8`. Existing model assets and reviewed canonical source versions are unchanged.

## Verification

- The full-motion regression passed on desktop Chromium, desktop WebKit and mobile WebKit. Captures of Earth, Mining hauler and Luna are in this directory; desktop Earth and asset captures were visually inspected.
- All ten worlds and their available destinations passed the existing inspector sweep on desktop Chromium and mobile WebKit, preserving a single canvas and restoring story focus. Keyboard looping, model controls and the desktop dialog's automated accessibility scan passed. Seven local browser cases passed in total, with one worker at a time.
- 144 unit tests, lint, typecheck, scoped formatting, canonical-data/local-link validation, asset/rights validation and release bundle checks passed. The pre-existing published growth-rate discrepancy remains documented.
- Cloudflare production build passed at 2,783.47 KiB compressed Worker size, within the Free limit. Model bytes are unchanged: 59 models, 18,675,760 decoded bytes and 10,068,703 compressed transfer bytes. No new GPU benchmark or every-device claim is made for this CSS correction.

## Public release

Published 2026-09-21 18:36:40 UTC as Cloudflare version `707d2aea-f52c-47d1-8e11-ad4c67f9de08`, serving 100% of traffic at [Janus Observatory](https://janus-observatory.nicocerond.workers.dev/). The full-motion Earth → Mining hauler → Luna → close/reopen regression passed on the public site in Chromium. Public checks also passed for 20 routes, 59 compressed/decoded model hashes, three downloads, health and 404 handling. See `deployment.json` and `public-verification.json`.
