# Decision 034 — Contour coastlines, grounded sites and experience polish

2026-09-30. Refines Decisions 015, 020, 028 and 033 following the user's request for a
world-by-world polish of the planets and a more finished journey.

## Problem

Every Earth classified land per facet, so each coastline was a triangle-by-triangle sawtooth with
a stepped cliff. Clouds hung a quarter of a radius above the land and read as floating rocks at
the limb. Several constructions were modelled on a flat plate and placed on a small globe: S2's
quarry benches stood proud of the ground as a raised crater with a fence floating around it, and
S7's ruined arch spanned half the planet with airborne feet. Blender assigned its glossy water
material to anything bluish, so S1 and S4 land and the S5/S9 beaches rendered as water; S1 read as
an ocean world. Venus used gas-giant belts and asteroids were near-perfect spheres.

Across the site, Methods steps all read "00", Observatory assumption values ran into their
citations, the 404 page used browser fonts, scientific-notation exponents inherited the
headline's negative tracking, many labels were 6–9px, the ten-world overview ended in a lone
tenth world, coincident chart points overprinted, and copy reappeared at full brightness beside
the wordmark while scrolling.

## Decision

- **Contour coasts.** Terrain facets are split along the zero contour of the existing authored
  landform field; the land side becomes a beach band and one sea-facing cliff quad closes each
  segment. The field, seeds, plate heights, flat per-face colour and triangle limits
  (≤ 2,400 desktop / ≤ 1,500 mobile) are unchanged.
- **Lower weather.** Cloud altitude falls from 1.26 to 1.19 of the globe radius. Clouds already
  passed through the tallest peaks; they are weather, not clearance-checked objects.
- **Wrapped sites.** `wrapOnGlobe` bends a diorama modelled in a flat tangent frame onto the
  sphere. S2's benches, ramp and excavator use it over a carve that follows the same bench outline;
  its fence posts stand on projected terrain with a gate at the ramp. S7's arch is smaller and,
  with S8's, stands on grounded piers. S2 peaks become faceted massifs.
- **Palette and water.** S1 land becomes a grey city plate with low-rise blocks in place of loose
  boulders. Blender marks water only where a facet's colour ratios match the world's ocean colour.
  Venus is a pale, low-contrast cloud deck; ore and ice asteroids gain lobes and impact dents while
  every working site keeps its original ground radius.
- **Site polish.** Explicit CSS counters, block assumption rows, site fonts on status pages, a
  10px floor for story, Observatory and motion labels, a 3-4-3 world constellation, grouped labels
  for identical published values, a softer header fade and an orbit ring that ties hover/focus
  names to their bodies.

## Boundaries

No dependency, canonical schema, scientific value or source right changes. All new geometry is
original interpretive art; label grouping reflects identical published values and adds no
ranking. Routes are re-planned offline with the existing planner and hull/clearance tests; browser
work still only interpolates authored paths. The header fade is paint-only (no backdrop blur over
WebGL). Fixed resolution, staged loading and the bounded model cache are unchanged. The model
request revision changes to `20260930-planet-polish` so returning visitors receive the rebuilt
meshes.

The contour coast costs about 256 KB of gzip across all 59 models. The conservative mobile
journey remains within budget with roughly 233 KB of headroom; future geometry growth should
find savings first. Evidence, captures and residual risks: [QA report](qa/planet-polish-2026-09-30/REPORT.md).
