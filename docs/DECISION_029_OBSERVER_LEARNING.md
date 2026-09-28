# Decision 029: Instrument literacy and reference quantities

2026-09-27. Implements the user-approved response to Jacob Haqq-Misra and George
Profitiliotis: explain observing methods, make population and energy legible, and
add a short guided investigation. DOI publication and additional research models
are outside this implementation.

## Experience

The Observatory introduces five methods using plain-language labels, explanatory
SVG diagrams, and short editorial descriptions. Scientific mission names remain
available in selectors, disclosures, and citations. The story's HWO reference also
names the optical space telescope. Existing scene geometry and motion are unchanged.

The optional investigation has three explicit URL-restorable states: choose and
think, observe, and compare. It defaults to S9 when starting without a selected
scenario, because this illustrates the published quiet-Earth/extended-technology
contrast. All ten scenarios and five methods remain selectable. Guesses concern
what a published observation cell lists, never scenario probability. Results come
from the existing deterministic Figure 6 resolver. The first observation stays
visible while the second instrument changes. A blank is never converted to a
negative scientific result. No scores, live simulation, AI, or new WebGL are added.

Start, Skip, Back, and Try another scenario preserve a usable keyboard path. Step
changes focus their heading; leaving the lesson focuses the free-explorer heading.
The lesson is DOM/SVG with no animation dependency. The free explorer retains its
URL state, data view, assumptions, and original scene fallback.

## Reference quantities and schema decision

The Atlas and scenario overview now share quantity formatting and glyphs. A person
glyph denotes the paper Earth population reference; a lightning glyph denotes the
model Earth annual energy reference. Each glyph is one reference unit, followed by
a rounded multiplier. The number of SVG nodes is constant even for S9. Published
scientific notation and units remain visible, and the exact tables and source
locators remain available. The Atlas bars retain an explicitly labeled logarithmic
scale and scenario order, with no composite ranking.

The growth dataset's schema advances from 1.1.0 to 1.2.0 with a required
`referenceEarth` object. The TypeScript/Zod and Python/Pydantic schemas both admit
source-bearing population and annual-energy-per-person fields, including explicit
missing states. This is an additive shared-schema change; no dependency is added.

- Population: 7.9 billion, `JANUS-PAPER-01`, `arXiv:2409.00067v3`, PDF page 12,
  industrial-pollution scaling paragraph.
- Per-capita energy: 75 GJ/person/year, the same source version, PDF page 18,
  Table 9 caption and Section 5.1.
- Energy reference: independently derived as 7.9 billion × 75 GJ/person/year =
  592.5 EJ/year. This is a model budget, not a measured global consumption total.

The input transcriptions were checked against extracted text and rendered PDF
pages 12 and 18. Each new field has its source version and page/section locator.
The deterministic domain function derives ratios from the actual reported,
rounded scenario totals; it does not reconstruct energy totals from population.
Null reference inputs produce no comparison. Invalid quantities fail closed.

The explanatory disclosure distinguishes paper/model references, system-wide
totals, rounding, current Earth statistics, and ecological carrying capacity.
No figure is labeled Earth 2026. No new external statistic, spectrum, or media
asset is introduced. SVG glyphs and diagrams are original interface geometry.

## Generated release and handoff

`pnpm data:generate` owns all generated changes, including runtime data, downloads,
source review pages, manifests, and release identity. Review pages include both
reference-input source pages. The release stays an unsigned candidate pending
independent human review; this work does not claim author approval.

Data version:
`sha256:a93da15bce68f5d475179bccf968199c0f247a58242e1477244939848ceb754f`.
Observing results remain sourced to `JANUS-PAPER-03`, `arXiv:2511.20329v2`, Figure 6
and the existing mission-assumption locators.

Changed authored surfaces:

- `apps/web/app/page.tsx`, `apps/web/app/observatory/page.tsx`,
  `ObservatoryExplorer.tsx`, `GuidedObservation.tsx`, `InstrumentExplanation.tsx`,
  `learning.module.css`, and `apps/web/lib/canonical-core.ts`.
- `apps/web/app/atlas/AtlasExplorer.tsx`, `atlas/[scenario]/page.tsx`,
  `atlas.module.css`, and shared `QuantityComparison.tsx` / its CSS module.
- `packages/domain/src/quantity-comparison.ts`, its unit tests, domain exports,
  `scientific-dataset.ts`, `pipeline/src/janus_pipeline/models.py`, and the canonical
  `data/canonical/scenarios/growth-table-9.json` input.
- `apps/web/e2e/learning.spec.ts`, this decision, the master-plan pointer, and QA
  evidence in `docs/qa/observer-learning/`.

Verification and limits: [QA report](qa/observer-learning/REPORT.md).
