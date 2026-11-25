# Janus Observatory

An interactive, evidence-backed atlas of possible technological civilizations.

## Modes

- **Story** — Guided visual essay exploring the Janus possibility space.
- **Observatory** — Deterministic alien-observer simulator driven by published scenario values.
- **Atlas** — Explorer for scenarios, timelines, comparisons, sources, and methods.
- **Research Companion** — Optional citation-backed Q&A over the Janus corpus (never generates canonical facts or scientific outputs).

## Architecture

- **Web (`apps/web`, `packages/*`)**: Next.js 16 App Router, React 19, TypeScript, React Three Fiber / Three.js (faceted Blender-finished worlds), D3, GSAP, deployed on Cloudflare Workers via OpenNext.
- **Data Pipeline (`pipeline/`)**: Python (`uv`), Pydantic, and Polars for deterministic, source-locked corpus and dataset generation.
- **Experiments (`experiments/resilience-lab/`)**: Standalone Python resilience validation suite.
- **Docs (`docs/`)**: Master architecture plan ([`docs/MASTER_PLAN.md`](docs/MASTER_PLAN.md)), numbered ADRs, and QA verification reports.

## Local Development

Requirements: Node.js `>=24 <27`, `pnpm@10.10.0`, Python + `uv` (for pipeline/resilience checks).

```bash
pnpm install
pnpm dev
```

## Verification & Deployment

```bash
# Full workspace check (format, lint, typecheck, tests, Python checks, data validation, build, bundle budgets)
pnpm check

# Build & deploy to Cloudflare Workers
pnpm build:cloudflare
pnpm deploy:cloudflare
```
