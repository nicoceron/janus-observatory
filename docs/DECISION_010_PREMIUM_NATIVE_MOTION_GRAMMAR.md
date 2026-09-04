# Decision 010 — Premium native-scroll motion grammar

Date: 2026-08-31  
Status: accepted for the internal release candidate

This decision supersedes the hosted-runtime portion of Decision 003. The credited CC0 source and
its admitted poster derivative remain; only the external preview iframe is removed.

## Context

The first complete Story implementation made every scientific state available and deterministic,
but several transitions still read as implementation mechanics: branch lines extended as rigid
segments, worlds often arrived together, scene overlays relied on generic fades, and the alien
performance and camera move competed for attention. The result was functionally correct without
the controlled pacing expected of the Observatory's institutional art direction.

The master plan requires native vertical scrolling, complete target states, GSAP as the sole
baseline tween system, a useful no-WebGL path, and bounded reduced motion. Premium motion therefore
cannot depend on scroll capture, a smooth-scroll library, `ScrollTrigger`, or values that exist only
inside a transition.

## Decision

Keep browser-native scrolling and use a single motion grammar across the guided Story:

1. **Scroll is input, never a transport.** `IntersectionObserver` continues to select complete
   authored states. Passive scroll sampling may derive bounded progress and velocity for visual
   interpolation, but it never cancels wheel or touch input.
2. **Lines draw with intent.** Branches stage trunk, family paths, and scenario limbs in sequence.
   A restrained traveling head and opacity falloff communicate direction without implying
   probability or weight.
3. **Worlds travel on arcs.** Scenario worlds separate in depth, scale, and timing before settling
   into exact authored positions. Neighboring worlds never move in perfect lockstep, and a selected
   world receives emphasis without changing canonical data.
4. **Camera and character take turns.** The observer camera establishes the silhouette before the
   alien's reach, focus, blink, and antenna follow-through. Runtime playback uses eased progress
   over the existing licensed GLB tracks instead of exposing their linear keyframe cadence.
5. **Transitions preserve continuity.** Scene atmosphere, registration marks, labels, cards, and
   evidence panels share the same restrained ease family and directional reveal. Decorative motion
   remains secondary to Earth, the selected world, and the current claim.
6. **Reduced motion is a first-class authored result.** Reduced motion resolves immediately to the
   same complete state, removes continuous drift and blur/scale travel, and keeps every control,
   value, citation, and structured fallback available.
7. **The opening is local and deterministic.** Replace the Spline-hosted preview with a deferred,
   project-owned SVG/GSAP orbital layer above the admitted local poster. This removes third-party
   runtime code, telemetry, frame permissions, and the observed white-frame loading failure.

## Motion character

- Primary settle: `power3.out` / `cubic-bezier(0.22, 1, 0.36, 1)`.
- Cinematic handoff: `power2.inOut`, with camera movement completing before dense UI appears.
- Organic secondary movement: low-amplitude arcs and follow-through; no bounce, elastic easing, or
  decorative perpetual motion near prose.
- Mechanical instrument motion: precise, short, and nearly linear only where the object is actually
  mechanical.
- Transition duration is bounded. Correctness never depends on sampling a mid-transition value.

## Consequences and validation

- No new runtime dependency or scroll controller is introduced.
- GSAP contexts/tweens, animation frames, observers, and Three.js resources must be cleaned up.
- Backscroll, chapter jumps, fast scroll, keyboard navigation, no-WebGL, and reduced motion must
  converge on the same target state.
- Acceptance requires sampled transition frames/contact sheets, forward and reverse scroll checks,
  responsive screenshots, browser console review, the existing Playwright matrix, and bundle
  validation. A clean build alone is not visual acceptance.
