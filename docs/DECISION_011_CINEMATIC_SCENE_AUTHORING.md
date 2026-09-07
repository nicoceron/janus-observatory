# Decision 011 — Authored cinematic scene pipeline

Date: 2026-09-04
Status: accepted for implementation following the user's instruction to execute the rebuild plan

The [cinematic rebuild plan](THREEJS_SEQUENCE_REBUILD_PLAN.md) replaces the existing mascot,
primitive planetary decorations, branch staging, and disconnected camera/performance timing.
This supersedes Decision 010's reuse and independent retiming of the seven existing GLB clips.

Blender owns the new original character, skeletal animation, telescope, observatory, camera
references, and export. Runtime animation samples the synchronized exported performance at
one normalized time. Baked/generated scene metadata is produced by the authoring script,
not maintained independently in React. Optimized derivatives retain provenance and hashes.

The website retains one persistent R3F scene, native scrolling/IntersectionObserver, GSAP,
all 31 complete semantic states, five method paths, canonical values/citations, reduced
motion and structured no-WebGL equivalents. Planet and line design parameters are explicitly
interpretive; they do not encode probabilities or unreported scientific magnitudes.

Reading-line containment now owns the active step, with nearest-edge selection only in gaps.
This supersedes the semantic contract's earlier largest-intersection heuristic, which could
select a short neighbor while the reader was still inside the taller observer shot. Native
IntersectionObserver remains the visibility/loading signal; a coalesced passive scroll check
reconciles ownership from current geometry, including reverse scroll and reload restoration.

Remotion is isolated under `media/cinematic-review` for review renders. Its dependencies are never
imported into the Next.js application. No smooth-scroll, ScrollTrigger, or second runtime
tween library is added. New assets are admitted before runtime use. The old admitted assets
remain recoverable while replacement acceptance is underway.

Verification requires browser/export visual comparison, contact sheets plus continuous
playback, state/seek regressions, keyboard/fallback checks, rights/data validation, build,
and measured payload/frame-time results. Offline render quality alone is not acceptance.
