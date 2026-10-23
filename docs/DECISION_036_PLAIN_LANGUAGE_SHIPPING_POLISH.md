# Decision 036 — Plain-language shipping polish

2026-10-22. Scope: every public page's copy, the type system, the site header, route
transitions and the research hub. Supersedes the typography of Decision 025. Canonical data, the 3D worlds, story choreography and the
scientific rules in `AGENTS.md` are unchanged.

## Request

The user asked for a section-by-section pass to make the site ready to ship: remove jargon and
anything a visitor can't understand, remove leftovers and self-referential developer language
(endpoints, release gates, configuration flags), keep what works, and improve the fonts, layout,
transitions and navbar.

## Copy

- Visitor-facing text describes the work in plain words: "the scenario study", "the observing
  study", "the collapse study" instead of table and figure locators; "Nothing listed for this
  instrument" instead of "blank Figure 6 cell"; "Not given" instead of "published ellipsis".
  Source links still point to the exact page; their labels shrink to "Table 9, p. 18".
- Instruments get one-word names for tight layouts (`instrumentCopy.name`: Optical, Radio,
  Infrared, Sun lens, Probe). The mission acronyms remain in the "Based on" disclosure.
- The paper's set-theory and pole terms get an editorial gloss (`lib/plain-labels.ts`) with the
  paper's own wording shown beneath it, so the transcribed value is never replaced silently.
- Removed from view: the GF/cluster/TF construction codes, the biosphere-distribution row (all
  ten values are untranscribed), the network-order row, the inline "reported · transcribed"
  chips, and the Atlas "three evidence clocks" section. All remain in the JSON/CSV downloads,
  and the evidence labels are explained under "Labels in the data" on Methods.
- Scientific notation renders as `2 × 10²¹` everywhere instead of `2e21`.
- Required language holds: scenarios are "possibilities, not predictions", never ranked by
  likelihood; an empty instrument result is never presented as "no technology"; the collapse
  model is "our rebuild", never official author code.

## Removed pages and leftovers

- `/research/concordia` is deleted. It described a deliberation experiment that had only run
  against a mocked provider and had no results. The experiment code in `experiments/concordia`
  is untouched; the route is removed from `publicRoutes`, the telemetry allowlist, the
  Cloudflare verification script and the accessibility test list.
- `/research` no longer shows a disabled question form, runtime-flag names or a link to
  `/api/health`. It lists the five Project Janus papers and links the collapse-model rebuild.
  The question form renders only when `JANUS_RESEARCH_PREVIEW_ENABLED` is true.
- Privacy describes the deployment as built: analytics and research-question text appear only
  when their flags are on, instead of describing what "a deployment may" enable.
- Error, 404 and global-error pages drop "route", "application shell" and runbook language.

## Type

Chakra Petch, Space Grotesk and IBM Plex Mono are replaced by Newsreader (headlines, optical
sizes) and Hanken Grotesk (text and interface), both SIL OFL 1.1 and self-hosted by
`next/font`. Atkinson Hyperlegible Next was tried and rejected because its slashed zero made
every "1,000" and "S10" read like code. Tracked all-caps monospace labels become sentence-case
text with tabular figures; minimum label size is 12px. License texts live in
`apps/web/public/licenses/` and the Sources credits name both families.

## Header and transitions

- The header shows a "Janus Observatory" wordmark, the three primary links with a small dot for
  the current page, and a "Chapters" button on every page so the bar never shifts between
  routes. On the story the entries jump in place; elsewhere they link back into the story. Entries
  carry the scenario names. On phones the wordmark collapses to the symbol so it fits one row.
- Route changes use React's `<ViewTransition>` (native View Transitions, no new dependency):
  inner pages fade and rise on enter and fade on exit; the header and backdrop do not animate.
  Reduced motion shortens the transition to 1 ms. GSAP remains the only tweening library.

## Verification

Prettier, ESLint, type checks, Vitest, data/asset/link/source validators, the production build
and bundle budgets ran for this change; Playwright results for Chromium desktop and mobile are
recorded in the handoff. Copy and layout were reviewed in the browser at 1440 × 900 and
375 × 812.
