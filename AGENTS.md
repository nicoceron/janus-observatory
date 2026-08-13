# Janus Observatory Agent Contract

Read [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md) before changing the repository. It is the product, data, architecture, and delivery source of truth.

## Working rule

Execute the assigned work directly. Make reasonable in-scope assumptions, document them, and verify the result. Stop only when required authority, unavailable source material, or a product decision would materially change the result.

## Non-negotiable scientific rules

- Project Janus scenarios are self-consistent possibilities, not forecasts or probabilities.
- Never call a scenario “likely,” rank scenarios by probability, or imply that the ten scenarios are equally probable.
- Never infer “no technology” from “not detected by this instrument.”
- Runtime scientific values come from reviewed canonical data or deterministic domain tools, never from component literals or an LLM.
- Every canonical factual field needs a `SourceRef` with a version and locator.
- Preserve the distinction among `reported`, `transcribed`, `derived`, `reimplemented`, `editorial`, `interpretive`, `fictional`, and `model_generated` content.
- The collapse model in this repository is an independent reimplementation unless official author code is later obtained and verified.
- Do not present PDF-digitized spectra as authoritative raw spectral data.

## Rights and attribution

- Use only assets admitted by the source/asset ledger.
- Do not bundle the all-rights-reserved S7 Water Zither without written permission.
- Do not bundle or substantially reproduce the ten Zenodo pipeline PDFs until their blank license is clarified; link and cite them.
- NASA/USGS/ESA source credit is required. Do not use NASA insignia/logotypes as Janus Observatory branding or imply agency endorsement.
- Keep original and derivative checksums and transformation history.

## Architecture constraints

- Next.js/React/TypeScript application with a Python ingestion pipeline.
- Static-first story and atlas; AI endpoints stay server-only.
- Native `IntersectionObserver` plus sticky layout for scrollytelling.
- GSAP is the single baseline tweening system. Do not add Scrollama, ScrollMagic, ScrollTrigger, Framer Motion, or a smooth-scroll library without a recorded decision.
- R3F/Three.js is limited to spatial scenes. Use DOM/SVG/D3 for prose, controls, labels, axes, citations, and accessible equivalents.
- Canonical runtime data is generated. Do not manually edit generated files.
- The core experience must work without AI and without WebGL.
- Public AI tools are allowlisted domain functions only; no arbitrary web, SQL, filesystem, or code-execution tool.

## Accessibility and performance

- Target WCAG 2.2 AA.
- Every canvas/WebGL visualization needs structured DOM text/data.
- Implement keyboard, visible focus, Start/Skip, reduced motion, and WebGL fallback with the feature, not afterward.
- Story steps declare complete target states so backscroll, fast scroll, and jumps are deterministic.
- Honor the payload, Core Web Vitals, frame-rate, cleanup, and asset-staging budgets in the master plan.

## Agent ownership and coordination

- Work only in the files/packages named by the task.
- Shared schema or dependency changes require an accompanying decision note in the task handoff.
- Do not overwrite unrelated or user-owned changes.
- Feature owners write the relevant unit/integration tests; quality agents verify rather than silently redesigning features.
- Handoffs must list changed files, verification performed, assumptions, source/data versions, and remaining risks.

## Completion checklist

Before declaring a task complete:

1. Run the relevant formatter, linter, type checker, tests, build, and data validators available at that phase.
2. Verify factual values and citations against canonical generated data.
3. Verify keyboard, reduced-motion, and fallback behavior for interactive work.
4. Verify asset rights and credits for any new media.
5. Report anything that could not be validated; do not conceal it behind placeholder success.
