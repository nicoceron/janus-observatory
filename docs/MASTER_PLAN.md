# Janus Observatory - Master Product, Data, Architecture, and Execution Plan

Current Observatory scenario-switch layout stability:
[verification and implementation](qa/observatory-stability/REPORT.md).

Current instrument explanations, reference quantities, and guided observation:
[Decision 029](DECISION_029_OBSERVER_LEARNING.md), with
[verification](qa/observer-learning/REPORT.md).

Current editable planet polish: [Decision 028](DECISION_028_PLANET_POLISH.md), with [individual world review](qa/planet-polish-2026-09-20/REPORT.md).

Current deployment and fixed-resolution decision: [Decision 027](DECISION_027_FREE_CLOUDFLARE.md).

Current unified navigation and adaptive rendering: [Decision 026](DECISION_026_NAVIGATION_PERFORMANCE.md), with [verification](qa/navigation-performance/REPORT.md).

Current shared world pages, futuristic typography and render optimization: [Decision 025](DECISION_025_SHARED_WORLD_PAGES.md), with [verification](qa/release-polish/REPORT.md).

Current telescope passage and section-anchored closing Earth: [Decision 024](DECISION_024_TELESCOPE_FLOW.md), with [verification](qa/telescope-flow/REPORT.md).

Current story cleanup and Timer migration: [Decision 023](DECISION_023_STORY_CLEANUP.md), with [verification](qa/story-cleanup/REPORT.md).

Status: implementation-ready plan

Latest behind-Earth reveal correction: [verification](qa/organic-reveal/REPORT.md). Latest spatial composition and on-demand names: [Decision 022](DECISION_022_SPATIAL_SYSTEMS.md), with [verification](qa/spatial-systems/REPORT.md). Latest starting-Earth airfield and hydration correction: [verification](qa/airfield-correction/REPORT.md). Current simultaneous systems, continuous star field and revised transport: [Decision 021](DECISION_021_OPEN_SYSTEMS.md), with [verification](qa/open-systems/REPORT.md). Current editable Blender finishing and bounded web assets: [Decision 020](DECISION_020_BLENDER_FINISHING.md), with [source files](../assets/blender/README.md) and [verification](qa/blender-finish/REPORT.md). Current connected roads and visible Solar System locations: [Decision 019](DECISION_019_CONNECTED_WORLDS.md). Current actor purpose and motion: [Decision 018](DECISION_018_PURPOSEFUL_ACTIVITY.md). Current individual world exploration and object refinement: [Decision 017](DECISION_017_WORLD_EXPLORER.md). Current scenario-specific world/system identities: [Decision 016](DECISION_016_SCENARIO_IDENTITIES.md), with the evidence in [scenario identities QA](qa/scenario-identities/REPORT.md). Reference-inspired low-poly art and character performance: [Decision 015](DECISION_015_LIVING_WORLDS.md), refining the rebuilt planet and observer models from [Decision 014](DECISION_014_LOW_POLY.md). Current story frontend: [Decision 013](DECISION_013_FIRST_LIGHT.md) supersedes the detailed Spline, WebGPU/TSL and former camera choreography below, following the user-authorized fresh frontend rebuild on 2026-09-07. Scientific, source, rights, accessibility and performance requirements remain in force.
Version: 1.0
Evidence cutoff: 2026-08-12
Repository state at audit: empty Git repository, no commits, code, data, assets, or configuration

## 1. Executive decision

Build **Janus Observatory: An Interactive Atlas of Possible Civilizations** as a static-first, source-backed scientific visual essay with three progressively deeper modes:

1. **Story** - a guided, Pudding-style journey through the Janus possibility space.
2. **Observatory** - a deterministic alien-observer simulator driven by published Janus values.
3. **Atlas** - a free explorer for scenarios, timelines, comparisons, sources, and methods.

A fourth surface, the **Research Companion**, uses `deepseek-v4-flash` to answer questions from the Janus corpus with passage-level citations. It is optional and cannot author canonical facts, calculate scientific outputs, or block the core experience.

The product must never describe the scenarios as forecasts, probabilities, rankings, or predictions. They are self-consistent futures used to explore a possibility space.

### Chosen implementation direction

- Next.js 16 App Router, React 19.2, TypeScript, Node.js 24 LTS, pnpm.
- Hybrid static/dynamic deployment: story and atlas pages prerendered; AI endpoints server-only.
- React Three Fiber and Three.js for planetary and spatial scenes only.
- D3 for scales, geometry, layouts, and SVG charts.
- A small native `IntersectionObserver` scrolly system with CSS `position: sticky`.
- GSAP as the single animation/tweening system; no ScrollTrigger, Scrollama, Framer Motion, or smooth-scroll dependency in the baseline.
- CSS Modules plus semantic CSS custom properties and design tokens; no generic dashboard shell.
- Python ingestion pipeline using `uv`, PDF extraction tools, Pydantic, and Polars.
- PostgreSQL full-text search plus pgvector for production RAG; lexical-only retrieval remains a supported fallback.
- First-party DeepSeek Responses API where deployment canaries pass, with a Chat Completions adapter as a compatibility fallback.
- Cloudflare R2 or equivalent object storage/CDN for optimized 3D and image assets.

### Deliberate exclusions from the baseline

- No Concordia or open-ended multi-agent civilization simulation.
- No generic dashboard, card-game scores, or arbitrary scenario ranking.
- No runtime-generated scenario facts or LLM-generated scientific values.
- No Cesium dependency unless the product later needs geospatial tiles at planetary scale.
- No full Gaia catalog in the browser.
- No client-side PDF parsing.
- No all-planets-loaded scene in the initial hero payload. The approved decorative Spline scene may
  mount after the browser is idle, with reduced-motion, offscreen, and no-WebGL fallback behavior as
  recorded in Decision 003.
- No UMAP/t-SNE of only ten scenarios presented as meaningful ML analysis.
- No reproduction of The Pudding's logo, branded fonts, or visual identity.

## 2. What the investigation established

### 2.1 Local repository

At the start of the investigation, the repository contained only `.git`. There was no inherited stack, migration constraint, package manager, application code, data, design system, deployment configuration, test suite, or user-auth system. The architecture could therefore be designed cleanly, but every convention had to be made explicit before parallel implementation began.

### 2.2 The Pudding's actual current stack and practice

The Pudding maintains two different repositories that must not be conflated. [`the-pudding/svelte-starter`](https://github.com/the-pudding/svelte-starter) is explicitly a reusable scaffold “designed around data-driven, visual stories at The Pudding.” [`the-pudding/website`](https://github.com/the-pudding/website) is the publication/catalog website and its publishing workflow. The starter uses Svelte 5, SvelteKit 2, Vite 8, D3 7, ArchieML, Style Dictionary, static prerendering, and a custom native `IntersectionObserver` scrolly component. This does **not** establish that every Pudding story is generated from that starter unchanged: individual story repositories customize the foundation, and older stories use older stacks. Its public Resources page still names Scrollama and older tools because those remain historical resources; they are not all part of its current default stack.

The transferable lesson is editorial and architectural, not “use Svelte”:

- ask one precise question;
- create one dominant visual metaphor;
- storyboard before implementation;
- use short text to advance explicit visual states;
- guide first, explore second;
- load only what the current scene needs;
- treat mobile choreography as a separate design problem;
- give every non-DOM visual an accessible DOM equivalent;
- publish methods, caveats, data, and sources with the story.

Representative current patterns:

- [Love Story](https://pudding.cool/2026/06/love-story/) uses a sticky canvas and deterministic step states before opening into exploration.
- [IVF](https://pudding.cool/2026/03/ivf/) uses an explicit branching state machine, Start/Skip controls, keyboard navigation, focus management, and alternative paths.
- [Happy Map](https://pudding.cool/2026/02/happy-map/) stages its initial and exploration data and uses GPU rendering only where density warrants it.
- [The Pudding starter](https://github.com/the-pudding/svelte-starter) documents its current build and helper patterns.

### 2.3 Project Janus corpus

The MVP corpus is reachable:

- five formal works are linked by the [official Project Janus publications index](https://futures.bmsis.org/publications);
- all ten worldbuilding pipeline PDFs are downloadable from [Zenodo 11174443](https://zenodo.org/records/11174443);
- the scholarly arXiv copies are extractable and carry open licenses;
- the official artifact museum now lists eight creative artifacts; five were added on 2026-08-12.
  Rights are item-specific, and only artifacts with verified licenses or written permission may be
  embedded.

The papers provide machine-transcribable tables for:

- scenario morphology and sociotechnical structure;
- planetary technosignature magnitudes;
- atmospheric constituents;
- system technosignatures;
- population, energy use, and growth state;
- instrument-to-scenario observability;
- collapse/recovery parameter ranges and baseline parameters;
- aggregate 200-run collapse outcomes;
- a published equation for signature persistence and observation probability.

The collapse–recovery paper does provide an author-hosted public implementation: its Code
Availability statement on rendered page 20 links
[`celiablanco/technocycles`](https://github.com/celiablanco/technocycles). At the audited commit
[`910770d`](https://github.com/celiablanco/technocycles/tree/910770dbe9224a9f7b1e003fdc7c000c2d78a5c2),
the repository contains a simulation/figure notebook, generated figures, manuscript sources, and a
committed aggregate CSV. The notebook fixes the main Monte Carlo generator seed to `12345` and
uses `54321` for sensitivity batches. It does **not** commit per-run trajectories or a dependency
lock, and GitHub reports no repository license while the tree contains no license file. Public
readability therefore establishes availability, not permission to copy, adapt, bundle, or execute
the materials as a project dependency. The aggregate CSV remains link-only and canonical metrics
continue to come from the CC BY 4.0 paper pending rights clarification. Machine-readable
PSG/LIFEsim spectral products also remain unavailable from the sources audited here.

### 2.4 NASA and astronomical assets

NASA's public asset ecosystem is sufficient for the visual prototype. The correct web strategy is not to ship high-resolution source masters directly. Preserve source masters and provenance offline, then publish optimized derivatives.

Recommended sources:

- [NASA Earth with Clouds](https://science.nasa.gov/resource/earth-with-clouds-3d-model/)
- [NASA Blue Marble](https://svs.gsfc.nasa.gov/3487)
- [NASA Black Marble 2016](https://svs.gsfc.nasa.gov/30876)
- [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/)
- [LRO-derived Moon GLBs](https://svs.gsfc.nasa.gov/14959/)
- [NASA Mars 3D model](https://science.nasa.gov/resource/planet-mars-3d-model/)
- [USGS/NASA Mars mosaics](https://astrogeology.usgs.gov/search/map/mars_viking_global_color_mosaic_925m)
- [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- [NAIF SPICE generic kernels](https://naif.jpl.nasa.gov/naif/data_generic.html)
- [ESA Gaia Archive](https://gea.esac.esa.int/archive/)
- [NASA Exoplanet Archive TAP API](https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html)

NASA media can generally be used for educational or informational web experiences with source credit and without implied endorsement. Asset-specific credits govern; NASA names, insignia, and logotypes are not product branding assets. See the [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).

### 2.5 DeepSeek V4 Flash

The official callable model ID is:

```text
deepseek-v4-flash
```

`deepseekv4flash` is not the documented first-party model ID and may only be accepted as a configurable private alias after capability probes.

As of the evidence cutoff, the first-party API documents:

- OpenAI Chat Completions, OpenAI Responses, and Anthropic-compatible interfaces;
- one-million-token context;
- thinking and non-thinking modes;
- tool calls;
- JSON mode;
- automatic context-prefix caching;
- no documented first-party embeddings endpoint.

DeepSeek V4 Flash and schema-strict tool behavior are beta surfaces. The runtime must validate behavior at deployment and must not infer provider capability from the model name alone. See the [official change log](https://api-docs.deepseek.com/updates/), [pricing/model table](https://api-docs.deepseek.com/quick_start/pricing/), [thinking mode](https://api-docs.deepseek.com/guides/thinking_mode/), and [context caching](https://api-docs.deepseek.com/guides/kv_cache).

## 3. Product definition

### 3.1 Product promise

> Explore ten internally consistent futures of Earth and the Solar System, then observe them as an alien astronomer would: through incomplete, instrument-dependent evidence.

### 3.2 The driving question

> If a technological civilization existed a thousand years from now, would an observer recognize it?

This question joins the strongest Janus finding - technology does not imply easy detectability - with an experience that can only work well as an interactive visual medium.

### 3.3 Primary audiences

1. Curious public readers who want a visual, comprehensible introduction.
2. Students and educators in astrobiology, futures studies, SETI, science communication, and governance.
3. Researchers who want source-linked comparisons without searching across every paper.
4. Engineering and design reviewers evaluating the portfolio's frontend, scientific-computing, graphics, and AI work.

### 3.4 User jobs

- Understand why the ten scenarios are not predictions.
- See how social organization, technology, resources, and spatial expansion co-evolve.
- Compare what exists in a scenario with what an instrument could observe.
- Explore the difference between “no detected signature” and “no technology.”
- Inspect collapse/recovery dynamics and epistemic limitations.
- Ask a research question and receive a cited, auditable answer.
- Reach the underlying paper, table, figure, license, or source asset.

### 3.5 Success criteria

Product success:

- A first-time reader can explain the difference between a scenario and a prediction after the prologue.
- A first-time reader can explain why S9 or S10 may evade atmospheric detection despite extensive technology.
- At least one complete guided path works with keyboard only, reduced motion, and no WebGL.
- The Atlas exposes all canonical values and source links without requiring AI.
- Every scientific scalar or categorical claim resolves to provenance.

Engineering success:

- Good Core Web Vitals at the 75th percentile: LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1.
- The opening shell does not download the complete 3D asset set.
- WebGL idles when the scene is static and releases resources across route changes.
- Data validation fails the build when a factual field lacks a source reference.
- AI responses have supported-claim citation coverage and never expose chain-of-thought.

## 4. Information architecture

### 4.1 Routes

```text
/
  Guided story: Ten Futures, One System

/observatory
  Alien observer simulator and instrument ladder

/atlas
  Free scenario explorer and comparison workspace

/atlas/[scenario]
  Canonical scenario page with deep links

/research
  Cited Research Companion

/methods
  Scenario methodology, independent model notes, limitations, AI policy

/sources
  Searchable source, dataset, asset, attribution, and license ledger

/accessibility
  Controls, nonvisual equivalents, reduced-motion behavior, known limitations
```

The guided story can deep-link into Observatory and Atlas states. Query parameters must encode selected scenario, instrument, distance, and view where useful, making every meaningful state shareable.

### 4.2 Global navigation

- Story
- Observatory
- Atlas
- Research
- Methods & Sources
- Sound toggle only if sound is later added; default off and never required
- Motion setting with `system`, `reduced`, and `full`

## 5. Guided narrative specification

Each step declares a complete visual state. Entering a step cannot depend on a prior animation having completed. Rapid forward/back scroll must render the correct state immediately.

The guided story uses one persistent R3F world from the first Earth frame through the final Solar
System handoff. Story chapters animate complete targets for the camera, present Earth, ten scenario
worlds, branch connectors, observer, ocular tunnel, and system context; they do not replace separate
canvas scenes. The selected scenario world is the same mounted object that leaves the branch map,
enters the observer's target, fills the ocular view, and settles into the system view. Native
`IntersectionObserver` selects authored target states and GSAP performs the transitions. WebGPU/TSL
provides the Earth day/night, roughness, cloud, bump, and atmosphere material, with Three.js's WebGL2
compatibility backend and the structured DOM fallback preserving the baseline experience.

### Chapter 0 - Loading and consent

Purpose: load the minimum Earth scene and establish user control.

- Display the title, one-sentence promise, and estimated scene readiness.
- Controls: `Start story`, `Read without animation`, and `Skip to Atlas`.
- Do not auto-play sound or capture the scroll wheel.
- Initial visual payload: the optimized Solar System poster, required fonts, and core DOM/CSS. The
  decorative Spline animation mounts only after browser idle when the hero is visible, WebGL is
  available, and reduced motion is not requested; the poster remains the fallback.

### Chapter 1 - Ten futures, one system

Purpose: establish that futures branch but are not assigned probabilities.

- Begin on present-day Earth.
- Pull back into a branching structure, initially showing three conceptual families rather than ten tiny labels: stability, collapse/recovery, and continued growth.
- Reveal the ten named scenarios only after the families are understood.
- Explicit text: “These are not forecasts and they are not equally weighted probabilities.”
- Visual primitive: Earth as the stable anchor; spatial branch connectors and worlds remain in the
  persistent 3D stage while labels and accessible meaning remain DOM/SVG.
- Accessible equivalent: nested list of families and scenarios with canonical summaries.

### Chapter 2 - The same home system can leave different traces

Purpose: connect lived futures to physical observables.

- Use three contrast scenarios as the initial vertical slice: S1, S4, and S9.
- Transition the Earth layer among industrial pollution/night lights, low-technology ecological integration, and a quiet Earth alongside off-world machine expansion.
- Introduce atmosphere, surface modification, artificial illumination, and orbital infrastructure as separate evidence layers.
- Never imply that texture changes are measured predictions; label them “scenario interpretation” when visually extrapolated.

### Chapter 3 - Choose your observer

Purpose: turn the reader from citizen into distant astronomer.

- Offer a small branch: HWO-class telescope, large radio array, LIFE-class infrared interferometer, solar gravitational lens, or deep-space probe.
- Default guided path starts with HWO.
- Branching changes narration and evidence order, not the canonical dataset.
- Keyboard: arrow keys change instruments, Enter selects, Escape returns.
- The reader can later expose all paths.

### Chapter 4 - A quiet spectrum is not an empty world

Purpose: deliver the main Janus insight.

- Place an Earth analog at the paper's modeled distance where appropriate, clearly displaying the assumption.
- Show detected features, non-detections, ambiguity, and observation requirements.
- Contrast S1's industrial atmospheric signals with S9/S10's preagricultural-like atmospheric spectra.
- When the instrument sees nothing distinctive, move the visual focus to surface or off-world structures that require another method.
- The UI distinguishes `detectable in the published scenario`, `not detected by this method`, and `not evaluated`.

### Chapter 5 - No single instrument is enough

Purpose: reveal the stepwise observing strategy.

- Expand from one scenario/instrument result into the full published modality matrix.
- Use the matrix from the observing-strategies paper as the canonical categorical basis.
- Allow switching among distance and integration assumptions only where a deterministic model supports the control.
- Unsupported controls must not masquerade as simulation inputs.

### Chapter 6 - Civilizations breathe

Purpose: explain collapse/recovery duty cycle.

- Animate technology level, resource stock, collapse thresholds, recovery, and signature persistence.
- Begin with a single scenario, then show small multiples across ten scenarios.
- Baseline results are labeled as values reported by an independent published model.
- Any interactive parameter sweep is labeled “Janus Observatory independent reimplementation,” includes the seed and parameters, and is compared to paper aggregates.
- Explain that signature lifetime can outlast activity and that some signatures disappear quickly.

### Chapter 7 - Explore the possibility space

Purpose: move from authored story to reader-driven investigation.

- Hand off to the Atlas with current context preserved.
- Support side-by-side comparison of up to three scenarios.
- Encourage comparisons such as S5 vs. S9, S4 vs. S7, and S3 vs. S10 without ranking them.

### Epilogue - Absence of evidence

- Restate that one known example, Earth, limits inference.
- Link to Methods, Sources, data downloads, and the Research Companion.
- Credit Project Janus authors, artifact creators, NASA/USGS/ESA data sources, and independent Observatory work without implying endorsement.

## 6. Functional requirements

### 6.1 Story engine

| ID        | Requirement                                               | Acceptance criterion                                                         |
| --------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| STORY-001 | Story content is organized into chapters and typed steps. | Every step validates at build time and names its complete visual state.      |
| STORY-002 | Scroll changes state through native observation.          | Forward, backward, rapid, and jump navigation produce the same final state.  |
| STORY-003 | Users can start, skip, resume, and restart.               | State persists in-session and all actions are keyboard accessible.           |
| STORY-004 | Motion is optional.                                       | Reduced-motion mode snaps between legible states without losing information. |
| STORY-005 | Story supports WebGL failure.                             | A complete 2D/DOM path remains available and navigable.                      |

### 6.2 Observatory

| ID      | Requirement                                                   | Acceptance criterion                                                                             |
| ------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| OBS-001 | Select scenario and instrument.                               | Every S1-S10/instrument combination resolves to a typed result.                                  |
| OBS-002 | Distinguish published, derived, and unavailable results.      | Each result displays an epistemic label and source.                                              |
| OBS-003 | Render atmosphere/surface/radio/probe evidence appropriately. | No category is represented with a scientifically misleading common scale.                        |
| OBS-004 | Show assumptions.                                             | Distance, integration time, host assumptions, and instrument concept are visible beside results. |
| OBS-005 | Share state.                                                  | URL restores scenario, instrument, and supported parameters.                                     |
| OBS-006 | Offer a data view.                                            | Every visual output has a table or structured text equivalent.                                   |

### 6.3 Atlas

| ID        | Requirement                    | Acceptance criterion                                                                               |
| --------- | ------------------------------ | -------------------------------------------------------------------------------------------------- |
| ATLAS-001 | Browse all ten scenarios.      | All scenarios expose summary, morphology, trajectory, planetary reach, signatures, and citations.  |
| ATLAS-002 | Compare up to three scenarios. | URL-shareable comparison aligns exact fields and highlights missing/not-applicable values.         |
| ATLAS-003 | Explore chronology.            | Timeline differentiates reported endpoints, modeled trajectories, and fictional artifact dates.    |
| ATLAS-004 | Inspect sources.               | Clicking any sourced field opens its exact source record and locator.                              |
| ATLAS-005 | Download reviewed data.        | Versioned JSON/CSV exports include provenance and do not redistribute restricted source documents. |

### 6.4 Research Companion

| ID     | Requirement                             | Acceptance criterion                                                               |
| ------ | --------------------------------------- | ---------------------------------------------------------------------------------- |
| AI-001 | Answer only from approved corpus/tools. | Unsupported claims are refused or labeled interpretation.                          |
| AI-002 | Provide source citations.               | Every factual paragraph carries one or more valid source IDs; links resolve.       |
| AI-003 | Explain deterministic results.          | The LLM receives tool output and cannot replace observatory/collapse calculations. |
| AI-004 | Stream status and answer.               | UI shows routing/retrieval/audit stages but never raw reasoning.                   |
| AI-005 | Degrade gracefully.                     | Static Atlas and prewritten explanations remain usable during provider failure.    |
| AI-006 | Bound execution.                        | Maximum six tool rounds, fixed allowlist, request/output/token/time budgets.       |

### 6.5 Sources and rights

| ID       | Requirement                         | Acceptance criterion                                                                      |
| -------- | ----------------------------------- | ----------------------------------------------------------------------------------------- |
| PROV-001 | Every factual datum has provenance. | Build fails for missing `sourceRef` on canonical factual fields.                          |
| PROV-002 | Every asset has a rights record.    | Public build includes generated credits; assets with blocked rights cannot enter bundles. |
| PROV-003 | Derivatives are traceable.          | Original and derivative checksum plus transformation log are recorded.                    |
| PROV-004 | Corrections are auditable.          | Data releases are versioned and record the reviewer/change rationale.                     |

## 7. Scientific and editorial rules

### 7.1 Epistemic labels

Every claim or value uses one of these labels:

```ts
type EvidenceKind =
  | 'reported' // directly stated/table/figure in a source
  | 'transcribed' // manually normalized from a source
  | 'derived' // deterministic calculation from sourced inputs
  | 'reimplemented' // independent model based on published method
  | 'editorial' // Observatory explanation or classification
  | 'interpretive' // art-directed extrapolation from scenario prose
  | 'fictional' // in-world artifact or narrative content
  | 'model_generated'; // AI output, never canonical;
```

These labels are visible in Methods and appear inline where confusion is likely.

### 7.2 Mandatory language

- Use “scenario,” “projection,” “possibility,” or “modeled future.”
- Do not use “probability of scenario,” “most likely future,” or “Janus predicts.”
- Do not infer equal probability from the ten-scenario set.
- Do not infer absence of technology from an instrument non-detection.
- Do not claim the independent collapse implementation is official or a byte-for-byte replication.

### 7.3 Numerical fidelity

- Transcribe source tables twice or use independent extraction plus human comparison.
- Preserve original units and significant digits.
- Record table/figure/page locator and source version.
- Store display formatting separately from numeric values.
- Represent blank, zero, below-threshold, not applicable, and not evaluated as distinct states.
- Unit tests reproduce published derived quantities where equations and inputs allow it.

### 7.4 Spectra policy

The papers show spectra but do not deposit the machine-readable curves found in this investigation. Therefore:

- MVP uses the published categorical detection matrix and atmospheric abundance tables.
- It may reproduce a qualitative annotated wavelength diagram, clearly labeled as explanatory.
- It must not present digitized PDF curves as authoritative raw spectra without a documented digitization uncertainty workflow.
- Exact interactive spectra enter scope only after obtaining authors' PSG/LIFEsim outputs or independently rerunning and validating those models.

## 8. Source and rights register

### 8.1 Core scholarly sources

| Source ID      | Resource                                                                    | Access                      | Rights/status        | Planned use                                                                                              |
| -------------- | --------------------------------------------------------------------------- | --------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------- |
| JANUS-PAPER-01 | [Scenario modeling](https://arxiv.org/abs/2409.00067)                       | PDF, v3, 23 pages           | CC BY 4.0 arXiv copy | Canonical scenario factors, Tables 6-9, narrative                                                        |
| JANUS-PAPER-02 | [Luminosity and mass](https://arxiv.org/abs/2410.23420)                     | PDF, v4                     | CC BY 4.0            | Growth-limit research appendix                                                                           |
| JANUS-PAPER-03 | [Observing strategies](https://arxiv.org/abs/2511.20329)                    | PDF, v2, 12 pages           | CC BY 4.0            | Atmosphere table, observing matrix, assumptions                                                          |
| JANUS-PAPER-04 | [Governance and freedom](https://sesa.scholasticahq.com/article/155236.pdf) | PDF, 10 pages               | CC BY-ND 4.0         | Governance analysis; no altered redistribution                                                           |
| JANUS-PAPER-05 | [Collapse/recovery](https://arxiv.org/abs/2604.13774)                       | PDF, TeX, HTML              | CC BY 4.0            | Equations, parameter logic, reported aggregates                                                          |
| JANUS-DATA-01  | [Worldbuilding pipelines](https://zenodo.org/records/11174443)              | 10 PDFs, about 1.1 MB total | License field blank  | Link/cite and extract facts internally; permission required before bundling or substantial republication |

#### Public collapse replication materials

| Source ID     | Resource                                                                                                                                                                          | Availability                                                                                            | Rights/status       | Planned use                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------- |
| JANUS-CODE-01 | [`technocycles` at audited commit `910770d`](https://github.com/celiablanco/technocycles/tree/910770dbe9224a9f7b1e003fdc7c000c2d78a5c2)                                           | Notebook implementation, generated figures, manuscript source, requirements summary; no dependency lock | No declared license | Link/cite only; request a license before copying, adapting, bundling, or using it as a dependency |
| JANUS-DATA-02 | [`notebooks/technosphere_summary.csv` at `910770d`](https://github.com/celiablanco/technocycles/blob/910770dbe9224a9f7b1e003fdc7c000c2d78a5c2/notebooks/technosphere_summary.csv) | Ten-scenario aggregate CSV; 1,448 bytes; no per-run time series                                         | No declared license | Link/cite only; do not replace paper-sourced canonical values until dataset rights are clarified  |

The repository is linked directly by the paper's Code Availability statement. Its notebook uses
seed `12345` for the main 200-replicate ensemble and `54321` for sensitivity batches at the pinned
commit. Those facts correct the earlier audit claim that no code or seed was public; they do not
resolve reuse rights.

### 8.2 Creative artifacts

| Asset                      | Status                            | Rule                                                                                                    |
| -------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| S3.2.3 Children's Doll     | Downloadable, all rights reserved | Link only until written embed/reproduction permission is obtained.                                      |
| S3.2.4 Aelin's Journal     | Downloadable, all rights reserved | Link only until written embed/reproduction permission is obtained.                                      |
| S4.2.1 Luna's Travels      | Downloadable, all rights reserved | Link only until written embed/reproduction permission is obtained.                                      |
| S5.1.1 essay               | Downloadable, CC BY 4.0           | May display/adapt with attribution, license link, and modification notice.                              |
| S6.2.5 First Water         | Downloadable, all rights reserved | Link only; preserve the public ID/filename discrepancy in provenance metadata.                          |
| S7.1.3 Water Zither        | Downloadable, all rights reserved | Link only until written embed/reproduction permission is obtained.                                      |
| S8.2.2 Technician's Manual | Downloadable, CC BY 4.0           | May display after checksum/manifest; retain creator credit and generative-AI-assistance disclosure.     |
| S9.1.2 images A-C          | Downloadable, CC BY 4.0           | May display/adapt with creator credit, license link, modification notice, and AI-assistance disclosure. |

### 8.3 Highest-value missing inputs

These are not blockers for the vertical slice, but they limit replication or redistribution:

1. An explicit software/data license or written reuse permission for the public `technocycles`
   repository and its committed aggregate CSV.
2. Raw per-run collapse trajectories, a dependency/environment lock, and author confirmation that
   the pinned public commit and documented seeds reproduce the submitted 200-run ensembles.
3. Explicit license or written permission for the ten Zenodo pipeline PDFs.
4. Permission to embed the all-rights-reserved artifacts selected for the experience.
5. Any unpublished author corrections to the published tables.

The published tables are the canonical source for spectral inputs. Table 6 and Table 7 of the
scenario-modeling paper establish the technosignature scaling and atmospheric mixing ratios; Table
1 of the observing-strategies paper consolidates the Earth atmosphere, temperature, sodium-emission,
and laser-emission inputs used for its observing analysis. PSG/LIFEsim curves are reproducible,
modeled products generated from published inputs plus documented simulator/observatory assumptions.
Original author run files would be useful for replication comparison, but their absence does not
make the tables incomplete or block our own clearly versioned synthetic runs.

The production DeepSeek and Voyage accounts were capability-tested successfully on 2026-08-12.

If author materials are obtained, archive the original files unchanged with checksums and add them through the same provenance process.

## 9. Canonical data model

All runtime JSON is generated from reviewed source data; components never contain hard-coded scientific values.
The first canonical transcription is `data/canonical/atmosphere/earth-apjl-table-1.json`, sourced
from Table 1 of the observing-strategies paper. Nulls preserve published ellipses and never silently
become numeric zero.

### 9.1 Core types

```ts
type ScenarioId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10';

type SourceRef = {
  sourceId: string;
  version: string;
  locator: {
    page?: number;
    section?: string;
    table?: string;
    figure?: string;
    row?: string;
    column?: string;
    url?: string;
  };
  evidenceKind: EvidenceKind;
  extractedAt: string;
  reviewedBy?: string[];
  note?: string;
};

type Sourced<T> = {
  value: T;
  unit?: string;
  display?: string;
  sourceRefs: SourceRef[];
  uncertainty?: string;
};

type Scenario = {
  id: ScenarioId;
  slug: string;
  title: string;
  canonicalSummary: Sourced<string>;
  morphology: {
    economy: Sourced<string>;
    politics: Sourced<string>;
    society: Sourced<string>;
    technosphereBiosphere: Sourced<string>;
    spatialDistribution: Sourced<string>;
    development: Sourced<string>;
    connectivity: Sourced<string>;
    smallestScale: Sourced<string>;
  };
  trajectory: {
    state: Sourced<'stable' | 'growth' | 'collapse' | 'oscillatory'>;
    population: Sourced<number>;
    annualEnergyUse: Sourced<number>;
    growthRate: Sourced<number | null>;
  };
  atmosphere: Record<string, Sourced<number | null>>;
  bodies: Record<'earth' | 'moon' | 'mars' | 'venus', BodySignatures>;
  systemSignatures: Record<string, Sourced<boolean | 'unknown'>>;
  observing: Record<InstrumentId, ObservationResult>;
  collapse?: CollapseScenario;
  artifacts: string[];
  sourceRefs: SourceRef[];
};
```

### 9.2 Observation result states

```ts
type ObservationStatus =
  | 'reported_detectable'
  | 'reported_not_detectable'
  | 'not_evaluated'
  | 'derived_detectable'
  | 'ambiguous';

type ObservationResult = {
  status: ObservationStatus;
  signatures: Array<{
    id: string;
    status: ObservationStatus;
    strength?: number;
    unit?: string;
    sourceRefs: SourceRef[];
  }>;
  assumptions: AssumptionRef[];
  sourceRefs: SourceRef[];
};
```

### 9.3 Corpus chunk

```ts
type CorpusChunk = {
  chunkId: string;
  sourceId: string;
  sourceVersion: string;
  scenarioIds: ScenarioId[];
  pageStart: number;
  pageEnd: number;
  headingPath: string[];
  text: string;
  contentHash: string;
  rights: string;
  offsets?: { start: number; end: number };
  embedding?: number[];
};
```

## 10. System architecture

```text
Immutable sources
  PDFs / TeX / HTML / NASA masters / APIs
             |
             v
Python ingestion and validation
  download -> checksum -> extract -> normalize -> double-review
             |
             +-------------------------+
             |                         |
             v                         v
Reviewed canonical data           Search corpus
JSON/CSV + provenance             chunks + FTS + vectors
             |                         |
             v                         v
Next.js static pages          Server-only Research Companion
Story / Observatory / Atlas   route -> retrieve -> tools -> audit -> answer
             |                         |
             +------------+------------+
                          v
                shared deterministic domain tools
```

### 10.1 Repository layout

```text
janus-observatory/
  apps/
    web/
      app/
      components/
      styles/
      public/
  packages/
    domain/          # schemas, units, source refs, deterministic engines
    content/         # story and scenario content loaders
    visuals/         # charts, scrolly, canvas, R3F scenes
    agent/           # provider adapters, workflow, tools, citation audit
    ui/              # accessible primitives and design tokens
  pipeline/
    pyproject.toml
    src/janus_pipeline/
    tests/
  content/
    story/
    scenarios/
    methods/
  data/
    sources/         # manifests only; source-file policy depends on rights
    normalized/
    generated/
    queries/         # Horizons/Gaia/Exoplanet Archive query text
  assets/
    source-manifests/
    derivatives/
  evals/
    retrieval/
    answers/
    prompt-injection/
  docs/
  scripts/
```

Use a pnpm workspace without adding Turborepo until build times justify it.

### 10.2 Frontend rendering boundaries

- Server Components render route shells, prose, citations, scenario metadata, and initial tables.
- Client Components own scroll state, interactive controls, SVG transitions, Canvas, and R3F.
- 3D scenes are dynamically imported and never server-rendered.
- The story shell and nonvisual content arrive before WebGL.
- Expensive scene assets are requested by chapter or user intent.
- URL state is canonical for explorer selections; transient animation state is local.

### 10.3 Story state model

Use a small pure reducer, not an external state-machine dependency in the first implementation:

```ts
type StoryState = {
  chapterId: string;
  stepId: string;
  mode: 'guided' | 'reduced' | 'atlas';
  observer?: InstrumentId;
  scenario?: ScenarioId;
  direction: 'forward' | 'backward' | 'jump';
};
```

Story step content supplies a complete `SceneState`. The renderer diffs from the previous state only for animation; correctness comes from the target state.

### 10.4 Visual systems

- DOM: prose, controls, citations, tables, focus states.
- SVG/D3: branch tree, timelines, spectra annotations, axes, comparison charts.
- Canvas 2D: dense lights, particles, and mark fields where SVG would create excessive DOM.
- R3F/Three: Earth/Moon/Mars/Venus, orbital layers, observer camera, solar-system transitions.
- WebGL shaders: atmosphere rim, cloud shadowing, emissive city-light layer, selection highlighting.

Do not implement a data visualization in WebGL merely for novelty. Labels, axes, and explanatory annotations remain DOM/SVG.

## 11. Asset pipeline

### 11.1 Asset ledger

Every asset record includes:

```text
asset_id
source_url
source_agency
creator_credit
required_credit_text
rights_status
retrieved_at
source_checksum
derivative_checksum
transformations
public_path
max_display_size
notes
```

CI blocks `rights_status = blocked` and warns on `unknown`.

### 11.2 Planet assets

- Earth: use an efficient sphere plus separately optimized Blue Marble day, Black Marble emissive, cloud, normal/topography, and atmosphere layers.
- Do not use the 83 MB printable Earth mesh as a web globe.
- Moon: prototype with `moon_small.glb` or a sphere with CGI Moon Kit textures.
- Mars: prototype with NASA's roughly 3.85 MB glTF; move to a downsampled USGS master only if visual QA warrants it.
- Venus: use a sourced global texture/sphere; verify item-specific credit before intake.
- Preserve full TIFF/GeoTIFF masters outside the public web bundle.

### 11.3 Optimization

- Convert color textures to AVIF/WebP where browser sampling permits; use KTX2/Basis for GPU texture delivery.
- Generate 1K, 2K, and 4K variants.
- Apply Meshopt and geometry simplification to GLB derivatives; use Draco only where decoding tradeoffs win in profiling.
- Cap texture anisotropy and device pixel ratio by performance tier.
- Generate poster images for every 3D state.
- Use seeded procedural stars for the hero; load a magnitude/distance-limited Gaia subset only in the neighborhood explorer.

### 11.4 Astronomy data

- Precompute JPL Horizons positions during the build and commit a compact versioned dataset.
- Store query text, retrieval date, target IDs, center, time range, step size, and API response checksum.
- Use Gaia DR3 for true spatial star points and record the ADQL query.
- Use NASA Exoplanet Archive records only when a real target selector enters scope; preserve archive acknowledgment and literature references.

## 12. Deterministic scientific engines

### 12.1 Observatory engine

The first engine is a transparent lookup/derivation layer, not a speculative telescope simulator.

Inputs:

- scenario;
- instrument concept;
- supported distance/integration assumptions;
- signature category.

Outputs:

- published detectability status;
- relevant atmospheric or surface values;
- ambiguity and non-evaluated states;
- assumptions and source references;
- optional persistence-adjusted probability where the published equation applies.

Only expose continuous sliders after a validated continuous calculation exists. Until then, use explicit published presets.

### 12.2 Collapse/recovery engine

Implement in two layers:

1. **Reported layer** - transcribed paper parameters and aggregate outcomes.
2. **Independent reimplementation** - equations reconstructed from the paper/TeX source, seeded Monte Carlo runs, and comparison against reported aggregates.

Requirements for the independent layer:

- fixed pseudorandom generator and visible seed;
- serialized parameter set;
- deterministic replay;
- unit tests for equations and boundary conditions;
- ensemble comparison against reported duty cycles, collapse counts, and time-to-first-collapse ranges;
- a Methods warning that the author-hosted code is public but unlicensed, raw per-run trajectories
  are unavailable, and the Observatory implementation remains independent;
- no “official Janus simulation” label.

### 12.3 Scenario comparison engine

Comparison is field-based and source-preserving. It does not calculate a single “technology,” “resilience,” “risk,” or “detectability” score unless a published definition supports that number. Multi-dimensional comparisons remain separate dimensions.

## 13. Research Companion architecture

### 13.1 Runtime workflow

Use one bounded workflow with specialized stages, not autonomous agents talking to one another indefinitely:

```text
request
  -> ResearchRouter
  -> hybrid retrieval
  -> EvidenceAnalyst or ObserverAnalyst
  -> deterministic tools as needed
  -> CitationAuditor
  -> NarrativeDirector
  -> streamed cited answer
```

Runtime roles:

1. **ResearchRouter** - non-thinking structured classification of intent, scenarios, dimensions, and tool needs.
2. **EvidenceAnalyst** - thinking/high; synthesizes only retrieved evidence and structured data.
3. **ObserverAnalyst** - thinking/high; interprets Observatory tool results.
4. **CitationAuditor** - structured claim/source audit plus deterministic source-ID validation.
5. **NarrativeDirector** - non-thinking; expresses approved claims in the Observatory voice without adding facts.

### 13.2 Allowed tools

```text
search_corpus
fetch_passages
get_scenario
compare_scenarios
get_observability_matrix
run_observer_model
get_reported_collapse_metrics
run_independent_collapse_model
resolve_citations
```

No arbitrary web, SQL, filesystem, code execution, or user-auth mutation tool is exposed to the public runtime.

### 13.3 Provider configuration

```text
JANUS_LLM_BASE_URL=https://api.deepseek.com
JANUS_LLM_MODEL=deepseek-v4-flash
JANUS_LLM_PROTOCOL=responses
JANUS_LLM_FALLBACK_MODEL=deepseek-v4-pro
JANUS_LLM_MAX_TOOL_ROUNDS=6
```

Supported adapters:

1. First-party DeepSeek Responses API.
2. First-party DeepSeek Chat Completions.
3. Ollama Cloud `deepseek-v4-flash:cloud` as an optional provider fallback.
4. Configurable OpenAI-compatible endpoint after capability probes.

Deployment canary probes:

- model listing;
- plain streaming response;
- valid JSON mode response;
- tool call and tool result round trip;
- thinking-mode multi-tool replay;
- usage/cache fields;
- timeout and 429 behavior.

In Chat Completions thinking-mode tool loops, preserve `reasoning_content` in the provider conversation as required by DeepSeek, but never log or send it to the browser.

### 13.4 Retrieval

- Extract by section and page; preserve table/figure context.
- Chunk roughly 500-900 tokens with section-aware overlap.
- Retrieve about 30 lexical/vector candidates and rerank/fuse to 8-12 passages.
- Always prioritize structured canonical records for exact scenario values.
- Use Postgres FTS as the reliable baseline.
- Add pgvector with a configurable embedding provider; DeepSeek has no verified embeddings API.
- Local development can use the installed `nomic-embed-text`; production query embeddings require a deployed compatible service or approved external provider.
- The one-million-token window is not permission to inject the whole corpus into every request.

### 13.5 Reliability and security

- Zod-validate tool inputs, JSON stages, citations, and final response envelope.
- Retry one empty/invalid JSON response, then run deterministic JSON repair or fail closed.
- Exponential backoff with jitter for retryable provider errors.
- Circuit breaker and graceful static fallback.
- Server-only API key; no client proxy of arbitrary prompts.
- Per-IP/session rate and concurrency budgets.
- Opaque hashed `user_id`; no PII in provider metadata.
- Treat retrieved text as untrusted data, not instructions.
- Stable system/tool prefix first for cache reuse; user/retrieval content last.
- Record model ID, fingerprint if returned, token counts, cache hits, latency, tools, and cited source IDs.
- Store token counts separately from mutable price tables.

## 14. Design and interaction requirements

### 14.1 Art direction

The visual identity should feel like a future astronomical institution: dark but not generic sci-fi, precise but humane, with Earth color and scenario accent systems derived from physical signatures rather than arbitrary neon.

Principles:

- Earth remains the recurring visual anchor.
- One continuous transformation grammar links chapters.
- Instruments use recognizable optical/radio/infrared visual language without imitating NASA product branding.
- Scenario colors pass contrast requirements and are never the sole carrier of meaning.
- Data UI feels editorial, not like enterprise analytics.
- Fictional artifacts are displayed as museum objects and never confused with scientific evidence.

### 14.2 Responsive modes

- Wide: sticky visual stage plus narrative column.
- Medium: reduced stage width and simplified annotations.
- Narrow: visual-first cards between prose steps; fewer simultaneous labels and lower 3D complexity.
- Very small/low-power: poster frames, SVG/DOM, and explicit `Open interactive view` controls.

### 14.3 Interaction rules

- Native vertical scrolling; no scroll hijacking.
- Touch gestures never prevent normal page movement unless a focused control explicitly needs horizontal interaction.
- Hover affordances have focus/touch equivalents.
- Selection state is announced to assistive technology.
- Animation duration is bounded; essential values do not exist only mid-transition.

## 15. Accessibility requirements

Target WCAG 2.2 AA.

- Skip-to-main and skip-story links.
- Logical heading hierarchy and landmarks.
- Full keyboard navigation for story, instrument selector, compare view, modals, and charts.
- Visible focus and focus restoration.
- Escape closes immersive overlays.
- Reduced motion and reduced transparency support.
- No information encoded only by color, position, animation, or 3D depth.
- Every canvas/WebGL scene has a concise live description plus a detailed structured data view.
- Charts have titles, descriptions, tabular alternatives, and keyboard-reachable annotations.
- Screen-reader announcements are limited to meaningful state changes, not every animation frame.
- Text meets contrast and zoom/reflow requirements at 200% and 400% where applicable.
- Autoplay audio is prohibited; captions/transcripts are required if media is added.
- Manual VoiceOver, NVDA, keyboard-only, touch, and reduced-motion test passes supplement automated axe scans.

## 16. Performance and resilience budgets

### 16.1 Loading

- Core story DOM/CSS and hero poster must be useful before WebGL initialization.
- Initial route JavaScript budget: target <= 250 KB gzip excluding deferred R3F/Three chunk.
- Initial critical visual payload: target <= 1.5 MB compressed on mobile and <= 3 MB on desktop.
- Any individual runtime texture <= 4K and <= 4 MB compressed; most mobile textures <= 2K.
- Deferred complete experience target <= 20 MB for a typical guided path, not all optional assets.
- Fonts are local WOFF2, subset, preloaded only when critical.

### 16.2 Rendering

- Target 60 fps desktop and 30+ fps supported mobile during active animation.
- Cap device pixel ratio by device tier.
- Use `frameloop="demand"` or invalidate-on-change while idle.
- Pause or unload scenes outside active chapters.
- Dispose geometries, materials, textures, observers, event handlers, GSAP contexts, and animation frames.
- Canvas/WebGL context-loss path presents poster and recovery control.

### 16.3 Core Web Vitals and measurement

- LCP <= 2.5 seconds at p75.
- INP <= 200 milliseconds at p75.
- CLS <= 0.1 at p75.
- Record route, device tier, reduced-motion setting, and WebGL fallback without collecting sensitive content.

## 17. Testing and quality gates

### 17.1 Test stack

- Vitest for domain, schema, reducers, tools, and calculations.
- React Testing Library for UI behavior.
- Playwright for Chromium, WebKit, Firefox, mobile viewports, keyboard paths, route state, and screenshots.
- `@axe-core/playwright` for automated accessibility checks.
- Deterministic visual regression for key 2D and WebGL states on a pinned browser/OS image.
- Python pytest for ingestion, extraction, validation, and simulation.

### 17.2 Required CI gates

```text
format
lint
typecheck
unit tests
Python tests
source manifest validation
canonical data schema validation
provenance completeness
rights/attribution validation
build
bundle budgets
Playwright smoke
axe scans
broken-link and citation-target checks
AI provider canary (scheduled/deployment, not every fork PR)
golden-answer evals (scheduled/release)
```

### 17.3 Scientific QA

- Double-review every transcribed table.
- Automated cross-table consistency checks for repeated atmospheric values.
- Unit and significant-digit checks.
- A rendered “source vs. normalized” review artifact for each table.
- Independent reviewer signs off canonical release data.
- Published scenario wording is kept separate from editorial summary.

### 17.4 AI evaluation set

Gold questions must cover:

- single-scenario facts;
- S5/S9 and S4/S7 comparisons;
- atmospheric and surface detectability;
- “nothing detected” ambiguity;
- collapse duty cycles and parameter effects;
- conflicting publication dates;
- missing evidence and refusal behavior;
- fictional artifact vs. scientific source distinction;
- prompt injection embedded in retrieved text;
- requests for predictions or probability rankings.

Metrics:

- retrieval recall@10;
- citation precision;
- supported-claim citation coverage;
- unsupported-claim rate;
- tool-call validity;
- JSON parse/empty-response rate;
- consistency by model fingerprint;
- p50/p95 latency;
- cache-hit/input/output tokens and estimated cost.

Release gate: no unsupported factual claim may pass as canonical. Interpretations must be labeled.

## 18. Analytics, observability, and privacy

- Prefer privacy-respecting, cookieless product analytics.
- Track chapter completion, instrument selection, compare usage, fallback mode, and source-link engagement.
- Do not store research questions by default; if stored for quality analysis, disclose it and redact identifiers.
- AI traces record operational metadata, tool names, source IDs, costs, and errors; avoid raw reasoning and unnecessary user text.
- Use structured logs and error reporting with source/version/model identifiers.
- Add health endpoints for data version, model adapter capability, retrieval index, and asset manifest.

## 19. Delivery phases and gates

Durations are planning ranges for a small team using implementation agents with human review. Gates matter more than calendar promises.

### Phase 0 - Source lock and project foundation (week 1)

Deliverables:

- pnpm workspace and Next.js application shell;
- Python pipeline package;
- source, data, and asset schemas;
- source download/checksum manifests;
- decisions log and contribution rules;
- CI baseline;
- DeepSeek adapter spike and capability-probe script;
- rights status for every intended MVP source.

Gate:

- clean install/build/test from a fresh clone;
- all five papers and ten scenario files have manifests;
- no restricted artifact is bundled;
- model adapter fails safely without a key.

### Phase 1 - Scientific data foundation (weeks 1-2, overlaps Phase 0)

Deliverables:

- normalized scenario morphology;
- Tables 6-9 from the foundational paper;
- atmospheric Table 1 and observing Figure 6 matrix;
- collapse parameters, equations, and reported aggregate metrics;
- canonical generated JSON/CSV;
- source-to-normalized review pages.

Gate:

- two-pass review complete;
- all canonical fields have locators;
- repeated values reconcile across papers or carry discrepancy notes.

### Phase 2 - Vertical slice: S1, S4, S9 (weeks 2-4)

Deliverables:

- chapter shell, native scrolly, story reducer;
- Earth day/night/cloud/atmosphere prototype;
- branch-tree SVG;
- three scenario transformations;
- HWO/probe contrast interaction;
- Start/Skip/reduced-motion/WebGL-fallback paths;
- data table and citations.

Gate:

- the key “quiet spectrum != empty world” story works on desktop and mobile;
- keyboard and fallback paths are complete;
- performance budgets pass on the slice.

This phase decides whether the visual metaphor and stack are credible before all ten scenarios are built.

### Phase 3 - Full authored story (weeks 4-6)

Deliverables:

- all chapters and scenarios;
- responsive art direction;
- governance and growth-limit interludes where narratively useful;
- source/method/caveat surfaces;
- poster frames and share images.

Gate:

- editorial and scientific review of every chapter;
- no chapter needs AI or WebGL to communicate its result.

### Phase 4 - Observatory (weeks 5-7)

Deliverables:

- all ten scenarios across five observing modalities;
- categorical evidence engine;
- assumption panels and shareable URL state;
- D3/SVG atmosphere and modality views;
- accessibility data view.

Gate:

- every matrix cell matches the reviewed source interpretation;
- blank/not-evaluated/not-detected states remain distinct.

### Phase 5 - Atlas and collapse lab (weeks 6-8)

Deliverables:

- scenario pages and comparison workspace;
- reported collapse outcomes;
- independent seeded reimplementation if validation succeeds;
- artifact museum links/embeds according to rights;
- downloadable reviewed dataset.

Gate:

- comparison never fabricates aggregate scores;
- independent simulation matches published aggregates within documented tolerances or remains disabled with findings published in Methods.

### Phase 6 - Research Companion (weeks 7-9)

Deliverables:

- corpus index and hybrid retrieval;
- bounded DeepSeek workflow and tools;
- streaming cited UI;
- citation auditor;
- rate limits, circuit breaker, static fallback;
- gold evaluation harness.

Gate:

- provider canaries pass in deployment;
- unsupported-claim and citation metrics meet release thresholds;
- API outage does not damage Story, Observatory, or Atlas.

### Phase 7 - Hardening and launch (weeks 9-11)

Deliverables:

- cross-browser/device passes;
- manual accessibility audit;
- bundle/texture/3D optimization;
- security and prompt-injection review;
- final rights/credit review;
- analytics/observability;
- launch runbook and rollback.

Gate:

- Definition of Done in Section 22 passes;
- no unknown-rights asset ships;
- no critical/severe accessibility or security defect remains.

### Phase 8 - Optional research extensions

- exact spectra if source data becomes available;
- Gaia solar-neighborhood expansion view;
- real exoplanet target selector;
- Concordia comparison experiment under `/research/concordia`;
- educators' lesson mode;
- artifact submission integration.

These extensions cannot delay the core launch.

## 20. Development-agent work plan

Development agents implement bounded work packages. They do not independently redefine scientific claims, dependencies, source rights, or cross-package contracts.

### 20.1 Parallel work waves

#### Wave A - contracts before features

**Foundation agent**

- Owns workspace, Next.js shell, TypeScript config, formatting, linting, test runners, CI.
- May create package boundaries but not scientific schemas alone.
- Output: clean scaffold and contributor commands.

**Data/provenance agent**

- Owns source manifests, download scripts, checksums, extraction, normalized schema proposals, Python tests.
- Must preserve original units and locators.
- Cannot publish a value until review status is present.

**Experience agent**

- Owns story outline to typed content mapping, wireframes, step state contracts, accessibility interaction specification.
- Uses placeholders until canonical data exists.
- Cannot invent scenario facts.

First integration gate: the three agents agree on `Scenario`, `SourceRef`, `SceneState`, and build-output contracts.

#### Wave B - vertical slice

**Planetary visual agent**

- Owns asset derivative pipeline, R3F Earth, day/night/cloud/atmosphere layers, device tiers, lifecycle cleanup.
- Uses approved asset manifests only.

**Scrolly/data-viz agent**

- Owns native observer hook, sticky layout, D3 branch tree, atmosphere view, reduced-motion behavior.

**Narrative UI agent**

- Owns chapter DOM, controls, citations, tables, Start/Skip, keyboard and screen-reader states.

Integration owner assembles the S1/S4/S9 slice and prevents each visual agent from creating a separate animation/state system.

#### Wave C - product surfaces

**Observatory-engine agent**

- Owns typed lookup/derivation tools and tests against reviewed matrices.

**Atlas agent**

- Owns routes, comparison URL state, scenario field alignment, exports.

**Collapse agent**

- Owns reported metrics and independent reimplementation under explicit namespace/labels.

#### Wave D - AI and hardening

**Agent-runtime agent**

- Owns DeepSeek adapters, capability probes, workflow, budgets, streaming, and provider telemetry.

**Retrieval/evaluation agent**

- Owns chunking, index creation, gold questions, citation metrics, prompt-injection cases.

**Quality agent**

- Owns Playwright/axe/visual/performance suites and release evidence; fixes remain with feature owners.

### 20.2 File ownership

- One agent owns a package or vertical slice at a time.
- Shared schemas change through a short decision record and integration review.
- Agents do not edit generated data manually.
- Agents do not update source manifests while working on UI.
- Agents do not add dependencies without documenting the capability and alternatives.
- Every work order names files allowed, interfaces consumed, tests required, and completion evidence.

### 20.3 First implementation backlog

1. Scaffold pnpm workspace, Next.js 16, Node 24, Vitest, Playwright, Python `uv` package, and CI.
2. Define Zod/Pydantic mirrors for source, scenario, atmosphere, observation, collapse, and asset records.
3. Implement source downloader with checksum and rights metadata.
4. Download and archive permitted scholarly sources; link-only restricted/unknown-rights objects.
5. Normalize S1/S4/S9 plus observing matrix and build JSON.
6. Build Story shell, typed steps, native observer, Start/Skip/reduced-motion.
7. Build NASA-sourced Earth asset derivative pipeline and poster fallback.
8. Build the S1/S4/S9 Earth transitions and HWO/probe comparison.
9. Add citations, data table, methods note, and WebGL fallback.
10. Run accessibility, performance, scientific-data, and visual gates.
11. Only after the slice passes, expand to S1-S10.
12. Spike DeepSeek capability tests independently; do not couple them to the slice release.

## 21. Risks and mitigations

| Risk                                                        | Impact                                               | Mitigation                                                                                                                                                 |
| ----------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public collapse code is unlicensed and raw runs are missing | Cannot reuse the notebook or claim exact replication | Keep code/CSV link-only, source canonical values from the CC BY paper, preserve an independent reimplementation, and request license plus per-run outputs. |
| Blank Zenodo license                                        | Republishing pipeline PDFs/text may be unauthorized  | Link and cite; store only as controlled research inputs; request written permission.                                                                       |
| S7 artifact all rights reserved                             | Cannot safely embed                                  | Link only until permission.                                                                                                                                |
| Spectral curves unavailable                                 | Interactive spectra could imply false precision      | Use categorical matrix/tables; add exact curves only after data/reproduction validation.                                                                   |
| WebGL payload/performance                                   | Slow or unusable mobile experience                   | staged assets, posters, adaptive quality, idle rendering, strict budgets.                                                                                  |
| Scroll state bugs                                           | Backscroll/fastscroll tells the wrong story          | target-state steps, reducer tests, Playwright jump/rapid-scroll tests.                                                                                     |
| LLM hallucinations                                          | Scientific misinformation                            | bounded corpus, deterministic tools, citation audit, refusal, labeled interpretation.                                                                      |
| DeepSeek beta behavior changes                              | Runtime failure or schema drift                      | provider abstraction, deployment canaries, circuit breaker, static fallback, fingerprint tracking.                                                         |
| No DeepSeek embeddings                                      | RAG architecture gap                                 | Postgres FTS baseline plus verified Voyage `voyage-4-lite` adapter at 1,024 dimensions.                                                                    |
| NASA/third-party rights confusion                           | Attribution or endorsement issue                     | per-asset ledger, exact credits, no NASA branding, CI rights gate.                                                                                         |
| Scope growth                                                | Core story never reaches polish                      | vertical slice gate, optional extensions after launch, explicit non-goals.                                                                                 |
| Generic sci-fi art direction                                | Weak scientific/editorial credibility                | source-derived visual grammar, editorial review, restrained scene count.                                                                                   |

## 22. Definition of Done

The first public release is done only when:

- Story, Observatory, Atlas, Methods, Sources, and Accessibility routes are complete.
- The guided story communicates the key result without AI and without WebGL.
- All ten scenarios have reviewed canonical records.
- Every scientific field and observation result resolves to provenance.
- The five-modality observability matrix matches the reviewed paper interpretation.
- Reported and independently reimplemented collapse results are visually and verbally distinct.
- The Research Companion passes its evidence/citation gates or is hidden behind a research preview flag.
- Keyboard-only, reduced-motion, screen-reader, no-WebGL, and mobile paths are functional.
- Core Web Vitals, initial payload, animation, and memory budgets pass on target devices.
- Licenses, creator credits, agency credits, modification notices, and AI disclosures are rendered from the asset/source ledger.
- No unknown-rights or all-rights-reserved asset is bundled without permission.
- CI passes from a fresh clone and the generated data is reproducible from its permitted inputs.
- The deployment has monitoring, rate limits, a rollback path, and a documented data/model version.

## 23. Remaining external inputs and resolved infrastructure

The build does not depend on receiving unpublished spectral curves or machine-readable author
tables. Published tables are the canonical spectral inputs, and Observatory-generated spectra are
versioned derived products.

Remaining external inputs:

1. Request an explicit license for the public `technocycles` code/aggregate CSV, raw per-run
   trajectories, an environment lock, and confirmation that audited commit `910770d` with main seed
   `12345` corresponds to the reported ensemble. The independent reimplementation may proceed from
   the CC BY publication and must remain labeled independently.
2. Ask the Zenodo deposit authors to clarify the ten pipeline PDFs' reuse license.
3. Ask the relevant creators/rights holders for permission before embedding selected
   all-rights-reserved artifacts, including S7.1.3.
4. Optionally request original PSG/LIFEsim run products only to compare our regenerated products
   against the authors' runs.

Resolved on 2026-08-12:

- the first-party DeepSeek Responses adapter reached `deepseek-v4-flash` successfully;
- the Voyage `voyage-4-lite` adapter returned a valid 1,024-dimensional vector;
- local secrets are stored in a Git-ignored, owner-readable-only environment file;
- the observing-strategies Table 1 is transcribed and schema-validated as the first canonical
  atmosphere input table.

Implementation proceeds with the open scholarly PDFs, reviewed table transcriptions, categorical
observability engine, source-linked pipeline summaries, NASA/USGS/ESA assets, and hybrid retrieval.
