# Decision 039 — Restore the faceted Blender worlds

2026-11-17. Withdraws the artwork of [Decision 035](DECISION_035_STORY_DRAWN_LOW_POLY_WORLDS.md)
(code-drawn low-poly worlds) and [Decision 038](DECISION_038_BLENDER_KIT.md) (the Blender model
kit). The site's worlds, explorer studies, observer and telescope return to the faceted
Blender-finished artwork of Decisions 014–020, 028 and
[034](DECISION_034_CONTOUR_COASTS_AND_EXPERIENCE_POLISH.md), as it stood at commit `2eb0a46`
(2026-09-30), the last state before Decision 035.

## Request

The user compared the three designs side by side, preferred the faceted worlds that preceded
Decision 035, and asked for them to be restored in full, with the Blender kit kept somewhere
safe.

## What is restored

- The faceted terrain, contour coastlines, grounded sites, clouds, routes and companion bodies of
  Decision 034, rendered from the 59 Decision 020/028 GLB exports under
  `apps/web/public/assets/blender/v1/`. The files are byte-identical to `2eb0a46`, and they are
  published and staged for Cloudflare again with their ledger records, gzip transport and header
  rule.
- The voyage, inspector, explorer, atlas portrait and observatory code those exports belong to,
  and the observer and telescope performance of that era.
- The asset ledger, asset validation, bundle budgets and Cloudflare staging and verification
  scripts as they were before the kit.

## What is kept from later work

Only artwork is withdrawn. Everything else that reached `main` after `2eb0a46` stays:

- the plain-language shipping polish, type, header and Chapters menu of
  [Decision 036](DECISION_036_PLAIN_LANGUAGE_SHIPPING_POLISH.md);
- the Nostromo titles of [Decision 037](DECISION_037_NOSTROMO_TITLES.md);
- the agent directory and search content signals (#5);
- the browser-suite and visual-suite repairs, and from the kit branch the local visual-suite
  runner (`scripts/visual-regression.sh`) with its `PLAYWRIGHT_VISUAL_BASE_URL` switch, and the
  ignore rules for local kit sources and process captures.

Where Decision 036 had reworded text that only existed in the code-drawn worlds, the faceted
equivalents are given the same plain-language treatment: the portrait's screen-reader
description, the inspector hint ("Drag to rotate · Pick an object to look closer") and its
"Details on Earth" list heading.

## How it was done

`main` just before the kit merged (`2bace26`) was the starting point, so the kit's own merge
choices, such as withdrawing its phone-header layout change, are not reintroduced. The 20 commits
between `2eb0a46` and `2bace26` were classified as artwork (the seven Decision 035 commits) or
not. Files touched only by artwork returned to `2eb0a46`, or were removed if they were created
after it. Files touched by both had Decision 035's edits reversed on top of `main`, and the few
conflicts were resolved by hand.

## Where the withdrawn designs live

- `design/blender-kit` (tag) and `archive/blender-kit` (branch): `main` with the Blender kit,
  commit `e4c5be8`.
- `design/code-drawn-worlds` (tag): the Decision 035 merge, `2fa292e`.
- `design/faceted-worlds` (tag): `2eb0a46`, the state this decision restores.

Decisions 035 and 038, the kit art direction and their QA reports stay in `docs/` as history.
The kit's local Blender sources (`assets/blender/kit/`) and process captures
(`media/kit-process/`) remain on disk, ignored by git.

## Verification

Run on this machine on 2026-11-17, as CI runs it:

- `pnpm check` passed: format, lint, typecheck, 153 unit tests, the Python and resilience suites,
  source, data, asset and link validation, the research evaluation, the build and the bundle
  budgets.
- `pnpm test:e2e` on all five projects: 398 passed, 8 skipped and 19 failed on the first run.
  18 of the failures were the restored `blender-assets.spec.ts`, which still opened the old
  "Index +" menu. With its chapter helper moved to the Chapters menu, it passes on every project
  (23 passed, 2 mobile cases skipped by design). The other failure was Firefox's
  `organic-reveal.spec.ts` under full-suite load. It passed on the rerun and four times in a row
  on its own.
- `pnpm source:reproduce:strict` passed (15 checksum-locked source PDFs).
- The visual suite in the pinned Playwright image (`scripts/visual-regression.sh`): only
  `first-light-earth.png` changed, and it now shows the faceted opening Earth. It was regenerated
  and then compared again: 4 passed.
