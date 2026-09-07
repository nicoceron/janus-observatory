# Scrollytelling semantic design contract

Date: 2026-08-12
Status: approved by the user on 2026-08-12
Scope: home-page guided story, desktop, mobile portrait, and mobile landscape

## Approved concepts

- `concepts/approved-scrollytelling-desktop.png` — SHA-256
  `92a8fee1af379b2ab4cd488532ec98c136192cf37bc56b256d6b1caf8655ef67`
- `concepts/approved-scrollytelling-mobile-portrait.png` — SHA-256
  `23c228aafff4a5ddf42e77f08acb563385dd6eeeeeded65210d0048d44ca4c98`
- `concepts/approved-scrollytelling-mobile-landscape.png` — SHA-256
  `81c47a818f0fcfa8f2fe023f8688a6a36ad2fd88ded61574812898715a1ff7b5`

These generated images are design references, not distributable scientific evidence or runtime
assets. All factual labels and values remain code-rendered from canonical data.

## Story takeaway

Project Janus begins with one Earth, separates it into ten self-consistent futures, then changes to
an alien observer's point of view to demonstrate that the evidence depends on the observing method.

## Locked visual sequence

1. A single large Earth dominates one full-viewport sticky scene.
2. Earth physically separates into ten independently rendered future worlds. A flat node-link
   diagram over a planet does not satisfy this state.
3. The camera travels among the ten worlds while one scenario at a time becomes focal and its
   population, annual energy, governance factor, technology cluster, and listed observing methods
   remain visible in DOM overlays.
4. The camera leaves the future-world arrangement and enters a dark observatory behind an
   unmistakably non-human astronomer operating a physical optical telescope aimed at Earth.
5. The camera travels through the telescope into an ocular view. Earth is framed by a reticle and
   instrument-dependent categorical evidence rendered in editable DOM layers.
6. The final frame hands the reader to the full Observatory and Atlas without converting scenarios
   into rankings or probabilities.

## Interaction and ownership

- Native document scrolling owns movement; the story does not intercept wheel or touch input.
- A `100svh` sticky visual remains pinned while roughly `90svh` narration steps pass through it.
- The step containing the reading line owns the active state; gaps resolve to the nearest edge.
  [Decision 011](DECISION_011_CINEMATIC_SCENE_AUTHORING.md) supersedes the original largest-intersection
  heuristic so the taller observer shot cannot lose ownership to a shorter neighbor. Fast scroll
  and backscroll must restore complete named states.
- React owns steps, labels, metrics, citations, keyboard navigation, and fallbacks.
- R3F/Three.js owns planets, camera, observatory, alien, telescope, and spatial interpolation.
- GSAP is the sole tweening system.
- Exact values, labels, reticles, citations, and caveats stay out of WebGL.

## Mobile continuation

- Portrait preserves the sticky spatial scene and moves compact narration cards through the lower
  third. It is not a stacked copy of the desktop grid.
- Landscape preserves the alien, telescope, Earth, and narration simultaneously.
- Device pixel ratio is capped, the scene pauses offscreen, and no pointer gesture is required.

## Accessibility and fallback

- Reduced motion uses the same named states with immediate transitions and no autonomous rotation.
- If WebGL fails, CSS key frames preserve the one-Earth, ten-world, alien-observer, and ocular states.
- The complete article remains in DOM reading order with sources and canonical values.

## Concept-to-result acceptance

- First frame screenshot: one unmistakable Earth, not a chart dashboard.
- Branch frame screenshot: ten visible 3D worlds spatially connected to the origin Earth.
- Observer screenshot: an alien head, shoulders, arms/hands, telescope, and distant Earth all visible.
- Ocular screenshot: Earth inside a circular instrument view with method-specific evidence.
- The active visual state changes through ordinary scroll on desktop and mobile.
