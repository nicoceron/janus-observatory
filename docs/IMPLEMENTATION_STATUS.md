# Implementation status

Audit date: 2026-08-13

The repository now contains a production-building all-scenario scrollytelling experience, a 3D
categorical alien-observer console, an all-ten-scenario Atlas with a source-backed analytical lens,
static scenario records, an isolated Concordia research appendix, and the required Methods,
Sources, Accessibility, and fail-closed Research Companion surfaces. It is not yet the complete
public release defined in `MASTER_PLAN.md`.

## Phase status

| Phase                            | Status                        | Evidence or remaining gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan and requirements            | Complete                      | Product, scientific, rights, accessibility, performance, AI, testing, phases, and Definition of Done are specified in `MASTER_PLAN.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Phase 0 — foundation             | Complete locally              | Workspace, CI, TypeScript/Python schema mirrors, provider adapters, safe health endpoint, checksummed manifests for five papers and ten scenario PDFs, and the asset/rights ledger exist. `pnpm check` passes from the working copy. A fresh-clone reproducibility run remains a release gate because this repository still has no baseline commit.                                                                                                                                                                                                                                          |
| Phase 1 — scientific data        | Implemented; review gate open | Scenario morphology, Tables 6–9, observing Tables 1–2/Figure 6, and paper-sourced collapse parameters/reported results are schema-validated canonical data. The author-hosted `technocycles` repository and aggregate CSV are public but have no declared license, so they remain link-only and have not replaced canonical metrics. Human source-versus-normalized sign-off and rendered review artifacts remain required before declaring a reviewed data release.                                                                                                                         |
| Phase 2 — S1/S4/S9 slice         | Complete locally              | The initial slice is subsumed by the all-scenario story. Begin/Read/Skip/Restart, native `IntersectionObserver`, deterministic complete states, keyboard steps, reduced motion, deferred R3F, CSS/WebGL fallback, canonical data tables, and citations are implemented and browser-tested. Device performance budgets and manual assistive-technology review remain release gates.                                                                                                                                                                                                           |
| Phase 3 — full authored story    | Implemented locally           | An 18-step full-viewport story moves from present Earth through ten physically rendered 3D future worlds, ten distinct interpretive surface/orbital art systems, individual S1–S10 camera states, an original Blender-authored alien operating a physical telescope, and HWO/SGL ocular views. Population, annual energy, governance factor, technology cluster, and method-dependent detectability stay separate in DOM layers. GSAP owns transitions; Three/R3F owns spatial scenes; the complete reading path survives without motion or WebGL. Editorial and scientific sign-off remain. |
| Phase 4 — Observatory            | Core implemented              | `/observatory` is a persistent 3D alien-telescope console for all ten scenarios and all five Figure 6 mission concepts, with distinct procedural instrument scenes, shareable query state, blank-cell semantics, source caveats, and the full structured matrix. Continuous sliders remain correctly absent until a validated numeric model exists. Formal source-interpretation sign-off remains.                                                                                                                                                                                           |
| Phase 5 — Atlas and collapse lab | Core implemented              | `/atlas` browses all ten records, compares up to three with URL state, and adds a four-dimension analytical lens for population, annual energy, listed observing-method cells, and system-signature categories without a composite score or probability rank. `/atlas/s1`–`/atlas/s10` are statically prerendered. Timeline, versioned downloads, artifact museum, and a validated collapse reimplementation remain.                                                                                                                                                                         |
| Phase 6 — Research Companion     | Fail-closed preview           | Provider adapters and health probes exist. `/research` explains the gate but exposes no public prompt box until retrieval, citation audit, rate limits, prompt-injection tests, and gold evaluations pass. The isolated `/research/concordia` appendix documents the seeded, withheld-target S1–S10 experiment without loading Concordia into the core runtime.                                                                                                                                                                                                                              |
| Phase 7 — hardening and launch   | In progress                   | Playwright interaction coverage and axe WCAG A/AA scans pass across Chromium, Firefox, WebKit, and mobile Chromium. Fresh-clone CI browser installation, manual accessibility, payload/CWV profiling, security review, final rights review, monitoring, deployment, and rollback remain.                                                                                                                                                                                                                                                                                                     |

## Implemented routes

```text
/
/observatory
/atlas
/atlas/s1 ... /atlas/s10
/research
/research/concordia
/methods
/sources
/accessibility
/api/health/agent
```

The production build prerenders 20 pages. Only the server-side agent health endpoint remains
dynamic.

## Verification completed on 2026-08-13

- `pnpm format:check`
- `pnpm lint`
- TypeScript type checking for domain, agent, and web packages
- 20 Vitest tests across eight files, including a guard that all ten scenarios retain distinct
  surface and orbital visual languages
- Python Ruff lint
- two Python pytest tests
- checksum, PDF MIME, and manifest validation for 15 locked sources
- Next.js 16 production build with ten statically generated scenario routes
- 40 Playwright/axe cases across Chromium, Firefox, WebKit, and mobile Chromium
- browser visual QA of the Earth, ten-world branch, S4 rewilded world, S9 machine shell, S10 outbound
  world, original alien-telescope model, and ocular states at desktop and portrait viewports, with
  portrait-specific camera framing
- seven-state animation contact-sheet review with no automated high-jump warning; the durable review
  artifact is `docs/qa/scrollytelling-contact-sheet.png`
- guided Begin/Read/Skip flows, ordinary scroll activation, arrow-key step navigation and restart,
  reduced-motion behavior, R3F enhancement plus ten-world/alien/ocular CSS fallback, S9 HWO
  blank-cell semantics, S9 probe result, Observatory URL state, Atlas comparison limits and four
  analytical controls, structured data tables, and supporting routes
- 25 Concordia appendix tests with `gdm-concordia==2.4.0`, Ruff, and the offline prefab/runtime check
- Blender 5.2 source, deterministic generation script, 683 KB GLB, preview render, source/derivative
  SHA-256 checksums, browser load, and asset-ledger attribution verified for the original alien
  observer model

Observed browser warning: React Three Fiber currently calls deprecated `THREE.Clock` internals. It
does not originate in application code and produced no runtime failure.

## Immediate release order

1. Produce source-versus-normalized review artifacts and obtain scientific reviewer sign-off.
2. Add the passing Playwright/axe suite, link/citation checks, and bundle budgets to CI.
3. Complete editorial review of the all-scenario narrative and formal interpretation review of the
   Observatory and analytical lens.
4. Add Atlas chronology, versioned JSON/CSV downloads, and artifact museum according to the ledger.
5. Validate the independent collapse reimplementation or leave it disabled with a published
   Methods finding.
6. Build and evaluate the bounded retrieval/citation workflow before enabling the Research prompt
   box.
7. Complete manual accessibility, device performance, security, rights, monitoring, deployment,
   and rollback reviews.

## External items that do not block core implementation

- an explicit license for the public
  [`technocycles`](https://github.com/celiablanco/technocycles/tree/910770dbe9224a9f7b1e003fdc7c000c2d78a5c2)
  code/aggregate CSV, plus raw per-run trajectories and an environment lock (the notebook and fixed
  seeds are already public);
- original author PSG/LIFEsim products for replication comparison;
- clarified Zenodo reuse license;
- item-specific permission for all-rights-reserved artifacts.

The direct Slack authorization supplied on 2026-08-12 is preserved in ignored permission intake and
recorded in `ACCESS_AND_RIGHTS_LOG.md`. It establishes a direct authorization trail for Project Janus
content but does not replace creator permission or public license requirements for third-party and
all-rights-reserved items.
