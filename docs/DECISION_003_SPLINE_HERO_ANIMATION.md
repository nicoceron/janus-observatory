# Decision 003 — Poster-first Spline hero animation

Date: 2026-08-13
Status: superseded for runtime animation by Decision 010 on 2026-08-31

Decision 010 replaces the hosted preview iframe with a project-owned SVG/GSAP orbital layer. The
CC0 source and project-owned poster derivative remain in the asset ledger and retain their credit;
the application no longer requests or executes the Spline-hosted runtime.

## Decision

Use Caner Sevince's “Solar System - Basic” Spline Community scene as a decorative animated hero
layer. Keep the project-owned 3200 × 1906 poster derivative beneath it as the initial render and as
the fallback for reduced motion, unavailable WebGL, loading failure, and offscreen cleanup.

The animation is mounted after browser idle and removed when the hero leaves a 200-pixel viewport
margin. It is non-interactive, outside the accessibility tree, and cannot capture pointer or keyboard
input. The existing DOM hero copy remains the accessible equivalent.

## Why

The requested Solar System motion better supports the revised “Ten futures. One system.” framing.
Loading the live scene during server render would conflict with the static-first opening, LCP budget,
reduced-motion behavior, and no-WebGL requirement. Poster-first progressive enhancement preserves
those guarantees while allowing motion on capable clients.

## Source and rights

- Community file: `bf1c301a-7620-4b6b-8096-9391e209ce10`
- Scene title: “Solar System - Basic”
- Creator: Caner Sevince
- License shown by Spline Community: CC0 1.0
- Runtime preview: `f5454200-ebd6-49c9-9e41-ea232c88cb61?view=preview`

The asset ledger retains the source URL, license, checksums for the poster source and derivative,
transformation history, and AI-enhancement disclosure.

## Tradeoffs and remaining risk

- The animation depends on Spline's hosted preview URL and can stop working if that URL changes.
- The hosted preview may load Spline-controlled runtime code and telemetry after browser idle.
- A future production export to a project-controlled `.splinecode` URL should replace the preview
  iframe if the scene becomes a permanent launch asset.
- The scene is interpretive and is not a scale model or canonical scientific dataset.
