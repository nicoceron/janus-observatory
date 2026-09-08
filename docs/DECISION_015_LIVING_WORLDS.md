# Decision 015: living miniature worlds and a curious astronomer

2026-09-07 · `codex/janus-first-light`.

The user supplied `dennis_tm-BVqoF4TzJ1Y-unsplash.jpg` as a reference for greater richness and
asked for a cooler alien with more movement. Interpret the reference as a direction for raised
land, saturated water, small settlements, vegetation, sculptural clouds and activity around the
whole globe. This supersedes Decision 014's sparse miniature composition. Each Janus scenario
retains its distinct architecture and palette. The existing narrative, sources, native scrolling,
DOM controls, charts and enterable telescope remain authoritative.

The reference is inspected locally as visual guidance. Its pixels are not bundled, traced into
geometry or used as textures. All new geography, structures, vehicles and character features are
original fictional/interpretive artwork. No scientific numbers or canonical records change.

## Spatial construction

- Build raised continent faces above a lower ocean, including coast rims and vertical cliff
  faces. Weld source polyhedron seam coordinates before building adjacent faces. The base terrain
  remains flat shaded, with 1,500 mobile / 2,400 desktop triangle regression limits including cliffs.
- Ground additional neighborhoods, groves, crop plots, machinery, ruins and boats on the actual
  rendered surface. Raycaster sampling happens at construction, with bounded Float32 edge
  tolerance after an exact sample. Genuine unsupported placements still fail.
- Merge static details into one vertex-colored mesh per world. Use a few separate moving spatial
  subjects: birds in the wilderness/restoration scenes, an imagined botanical flyer in S5,
  aircraft for the appropriate technological worlds, and service craft in orbital scenarios.
  Sizes, placements, density and motion have no scientific meaning.
- Preserve the defining skyline, quarry, botanical crown, shell, broken arch, rift and orbital
  silhouettes. Reframe the opening world to give the richer perimeter space on desktop and mobile.

## Character performance

Three.js AnimationMixer plays an original 18-second AnimationClip: investigate, lean into the
instrument, adjust focus, react, gesture outward, and return to observing. Torso, head, blink,
antennae, scarf and wrist tracks include anticipation and follow-through. A two-segment rig keeps
fixed limb lengths, planted ankles and the focus grip in the shared telescope coordinates.
The free-hand reach uses baked eased keys to avoid cubic overshoot beyond the arm's reach.
The resting wrist sits beside the hip; an outward, lower elbow pole keeps the returning arm
clear of the face and preserves a relaxed silhouette.
Reduced motion selects a reproducible 4.4-second observing pose and freezes spatial activity.

The character gains a brass monocle, shoulder plates, field pack, utility belt, boot fittings and
a small luminous wrist instrument. Camera entry remains tied to the existing modeled eyepiece.
No GLB export or optical simulation is claimed.

## Documentation and delivery

Read the installed Next.js client-component guide and Three.js documentation for ExtrudeGeometry,
Quaternion, AnimationMixer, AnimationAction, PropertyBinding and KeyframeTrack. Inspect the
installed Ray.intersectTriangle implementation for exact shared-edge comparisons. Apply the
animation skill's easing, staging and follow-through principles and the animation quality gate's
contact-sheet, silhouette, framing and motion-coherence review.

No dependency or shared schema change is needed. The world artwork and fallback poster become
v3; the observer becomes v2; the telescope remains v1. Record source/derivative checksums and
transformation history in the asset ledger. Preserve previous QA packets; current captures,
checks, limitations and file handoff are in `docs/qa/living-worlds/REPORT.md`.
