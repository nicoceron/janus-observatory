# Stack decision record

Status: accepted for foundation build
Date: 2026-08-12

## The Pudding distinction

The phrase “The Pudding uses the Svelte starter” is too broad.

- [`the-pudding/svelte-starter`](https://github.com/the-pudding/svelte-starter) is The
  Pudding's reusable SvelteKit scaffold for data-driven visual stories. Its own README describes it
  that way and documents story-oriented helpers including `Scrolly.svelte`, ArchieML, and static
  output.
- [`the-pudding/website`](https://github.com/the-pudding/website) is the publication website and
  publishing/catalog workflow. It is a separate repository.
- Current individual stories often use SvelteKit and patterns from the same ecosystem, but their
  repositories add or replace dependencies according to the story. Older pieces use older stacks.

Therefore, we can be certain about what the starter is intended for and what the website repository
is. We should not claim that every Pudding story began from the starter or still matches it.

## Janus implementation decision

Janus Observatory remains a Next.js/React project. We are borrowing The Pudding's editorial and
interaction practices—not duplicating its framework choice or visual identity.

Foundation versions:

- Node.js 24 LTS target
- pnpm 10
- Next.js 16.3
- React 19.2
- TypeScript 5.9
- D3 7
- Three.js 0.185 with React Three Fiber 9
- `@types/three` aligned to Three.js for typed scene refs; this is a development-only contract and
  adds no browser payload
- GSAP 3 as the sole baseline tweening system
- native `IntersectionObserver` for scrollytelling state changes
- Python 3.12+ with uv for reproducible source ingestion

The application must work as semantic HTML without WebGL. WebGL is an enhancement for planetary
and spatial views, not the document structure.

## Shared evidence contract correction

The initial scaffold used the provisional values `measured`, `modeled`, `scenario_given`, and
`editorial`. Implementation now uses the master plan's normative cross-language vocabulary:

```text
reported
transcribed
derived
reimplemented
editorial
interpretive
fictional
model_generated
```

The TypeScript domain schema and Python Pydantic mirror changed together. This prevents a generic
“modeled” label from collapsing source reporting, deterministic derivation, independent
reimplementation, and AI output into one ambiguous state.

## Static product routes

The all-scenario Atlas uses `generateStaticParams` for the ten known IDs and disables unspecified
dynamic params. Atlas and Observatory query state uses the Next.js-integrated native History API
inside Suspense-wrapped Client Components, preserving static route shells and shareable state.
