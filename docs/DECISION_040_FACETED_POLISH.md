# Decision 040 — Polish the faceted worlds

2026-11-17. Refines the faceted worlds restored by
[Decision 039](DECISION_039_RESTORE_FACETED_WORLDS.md). Every model stays: nothing is removed
or replaced, and each change refines an existing asset or how it sits on its world. Story
choreography, camera, data and accessibility are unchanged.

## Request

The user loves the faceted style but found the restored site "kinda broken". They asked for
everything to be polished without removing or changing the 3D assets.

## What looked broken

A capture audit (17 chapters at desktop size, 17 on a phone, every world and destination in the
explorer, and 50 landmark close-ups) found faults in how the models sat together, not in the
models themselves:

- **Continents read as plates.** Land stood at radius 1.025 and the sea at 0.925, so every coast
  had a cliff 10% of the planet's radius. S3's lake and S5's sea sat in pits, S8's sea behind a
  tall rim, and S9 and S10 looked like plates stacked on a ball, with the cliff walls visible at
  the limb.
- **Clouds read as rocks.** Fused icosphere lobes with an irregular voxel remesh and a faint
  emission rendered as grey, craggy lumps.
- **Bodies looked pixelated.** The Moon and Mars are subdivision-5 icospheres whose colour patches
  were chosen per tiny facet, so the edges were jagged camouflage. The Moon's blue slate palette
  added to it, and every fourth facet on a crater rim was randomly tinted.
- **Loose parts.** S1's low-rise fabric was pairs of bare boxes that read as debris, and S8's
  rubble was single stones with a loose plank. S8's broken bridge was anchored to the canyon
  floor, so its spans hung inside the rift. Bodies with orbital activity had their station floating
  beside the body with nothing placing it in orbit, and S8's refuge berm capped its Moon like a
  flat disc.
- **Weak landmarks.** S1's observation tower was a stick with a box, S2's ore conveyor a belt in
  mid-air, and S8's broken power network two sticks.
- **Phone opening.** The opening globe ran behind "Would anyone know we were here?"

## Decision

- **A low coast step.** `terrain.ts` now names the two radii: `LAND_BASE` 1.01 and `SEA_RADIUS`
  0.985, a step a quarter of the old one. The raised diorama edge stays, but continents now belong
  to the globe. Every Earth-world placement that assumed the old land height drops by the same
  0.015: `surface()`'s default, trees, peaks and terraces. The route planner's water and land tests
  use the midpoint of the step instead of fixed numbers. All 32 routes, the Blender seeds and all
  eleven Blender worlds were regenerated.
- **Cumulus clouds.** The lobes are clipped flat underneath, the remesh uses even, slightly larger
  voxels, and the shaded side is lifted to pale sky blue (emission 0.34). Clouds sit a little
  lower, to match the lower land.
- **Clean body surfaces.** Colour regions are chosen per subdivision-3 cell, so patches are clean
  groups of facets. Crater bowls and Mars's valley keep their fine shading because they follow the
  terrain. The rim speckle is gone, and the Moon uses neutral regolith greys at gentle contrast.
- **Grounded parts.** S1's fabric stands on paved lots with window bands and rooftop units. S8's
  rubble settles into piles with the plank resting on them. The bridge is anchored at rim height,
  so its broken spans reach out from either lip. Orbital stations get a faint orbit track through
  their position. S8's berm is a rounder mound bent around the Moon's curve.
- **Stronger landmarks.** The tower gains a footing, gallery deck and roof. The conveyor gains a
  loading hopper, a head tower and its ore pile, and the S2 haul truck's stop moves to the hopper.
  The power network gains a footing, insulators, a fallen crossarm and a second standing pylon
  with a sagging cable.
- **Phone opening.** The globe sits in a taller gap between the title and the question.
- **Blender 5.3.** The art recorder admits Blender 5.2 or 5.3. On 2026-11-17, 5.3 rebuilt the
  opening world with the same bytes as 5.2 apart from the version stamp. The art version is
  `blender-faceted-polish-v13-2026-11-17`.

The [QA report](qa/faceted-polish/REPORT.md) has the before/after sheet and the verification.
