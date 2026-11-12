# Nostromo titles — verification

2026-11-10. Implements [Decision 037](../../DECISION_037_NOSTROMO_TITLES.md).

## Method

A Playwright sweep against the production build (`next build` + `next start`) visited 20 routes at
1440 × 900 and at 375 × 812 (mobile emulation, device scale 2), with reduced motion and after
`document.fonts.ready`. Routes: the story, Observatory, Atlas, all ten scenario records, Research,
the collapse-model rebuild, Methods, Sources, Accessibility, Privacy and the 404 page. On each it
measured every `h1`–`h6` and every element whose computed font is the display face:

- rendered lines, from `Range.getClientRects()` grouped by line top;
- horizontal overflow past the viewport or the element's block container;
- page-level horizontal scroll.

A second pass took screenshots of eleven story chapters at both widths, and a third checked the
header and every title for overflow at 700, 761, 820, 900, 1024, 1100 and 1280 px. The "before"
numbers come from the same scripts run on an unchanged build of `771dc07`.

## Results

- 786 title elements measured after the change. **None overflows** at either width; no page
  scrolls sideways. At 700–1280 px the header wordmark and navigation never touch.
- One overflow was found and fixed during tuning: the story footer wordmark ("Observatory", one word)
  at 60px on phones. It is 44px now.
- The longest display-face titles are 3 lines on desktop (the three-line epilogue, by design, and
  two Methods section titles in their narrow column) and 3 lines on phones. Source
  citations on `/sources` stay in the text face and wrap to 4–5 lines on desktop, as they did
  before in Newsreader.
- Every character rendered in the display face is inside the WOFF2 subset, so no title falls back
  to Arial.
- `pnpm bundle:check`: the home page's critical visual payload is 89,114 audited bytes (budgets 1.5
  MB mobile and 3 MB desktop). The display-font preload falls from 131,848 bytes (Newsreader) to
  8,536 bytes.

Max lines count display-face elements only (Newsreader before, Nostromo after). Overflow counts
cover every heading.

| Width   | Route                  | Max lines before | Max lines after | Overflow before | Overflow after | Page overflow after (px) |
| ------- | ---------------------- | ---------------- | --------------- | --------------- | -------------- | ------------------------ |
| desktop | `/`                    | 3                | 3               | 0               | 0              | 0                        |
| desktop | `/observatory`         | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/atlas`               | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/atlas/s1`            | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/atlas/s2`            | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/atlas/s3`            | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/atlas/s4`            | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/atlas/s5`            | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/atlas/s6`            | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/atlas/s7`            | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/atlas/s8`            | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/atlas/s9`            | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/atlas/s10`           | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/research`            | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/research/resilience` | 2                | 2               | 0               | 0              | 0                        |
| desktop | `/methods`             | 3                | 3               | 0               | 0              | 0                        |
| desktop | `/sources`             | 5                | 2               | 0               | 0              | 0                        |
| desktop | `/accessibility`       | 3                | 2               | 0               | 0              | 0                        |
| desktop | `/privacy`             | 1                | 1               | 0               | 0              | 0                        |
| desktop | `/missing-page`        | 1                | 1               | 0               | 0              | 0                        |
| phone   | `/`                    | 4                | 3               | 0               | 0              | 0                        |
| phone   | `/observatory`         | 2                | 3               | 0               | 0              | 0                        |
| phone   | `/atlas`               | 3                | 2               | 0               | 0              | 0                        |
| phone   | `/atlas/s1`            | 2                | 2               | 0               | 0              | 0                        |
| phone   | `/atlas/s2`            | 2                | 2               | 0               | 0              | 0                        |
| phone   | `/atlas/s3`            | 2                | 2               | 0               | 0              | 0                        |
| phone   | `/atlas/s4`            | 2                | 2               | 0               | 0              | 0                        |
| phone   | `/atlas/s5`            | 3                | 2               | 0               | 0              | 0                        |
| phone   | `/atlas/s6`            | 2                | 2               | 0               | 0              | 0                        |
| phone   | `/atlas/s7`            | 2                | 2               | 0               | 0              | 0                        |
| phone   | `/atlas/s8`            | 2                | 2               | 0               | 0              | 0                        |
| phone   | `/atlas/s9`            | 2                | 2               | 0               | 0              | 0                        |
| phone   | `/atlas/s10`           | 2                | 2               | 0               | 0              | 0                        |
| phone   | `/research`            | 5                | 2               | 0               | 0              | 0                        |
| phone   | `/research/resilience` | 2                | 3               | 0               | 0              | 0                        |
| phone   | `/methods`             | 2                | 2               | 0               | 0              | 0                        |
| phone   | `/sources`             | 4                | 2               | 0               | 0              | 0                        |
| phone   | `/accessibility`       | 2                | 3               | 0               | 0              | 0                        |
| phone   | `/privacy`             | 2                | 2               | 0               | 0              | 0                        |
| phone   | `/missing-page`        | 1                | 1               | 0               | 0              | 0                        |

Per-route data: [sweep-summary.json](sweep-summary.json).

## Checks run

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm build`,
`pnpm bundle:check`, `pnpm assets:validate`, `pnpm links:validate`, `pnpm data:validate` and
`pnpm source:validate` all pass. The Playwright end-to-end suite passed in the `chromium` and
`mobile-chromium` projects against the production build: 160 passed and 2 skipped, including the axe
accessibility checks. It ran on the locally installed Chromium build 1248 through a temporary config,
because the pinned build 1234 is not installed on this machine.

## Not covered

- Firefox and WebKit were not run locally. The visual-regression baselines change with the face and
  must be re-rendered by the pinned CI container and reviewed.
- The web-font licence is unconfirmed (see Decision 037).
