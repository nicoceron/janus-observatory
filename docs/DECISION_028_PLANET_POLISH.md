# Decision 028 — Editable planet polish

2026-09-20. Refines Decisions 020 and 027 following the user's review of the deployed worlds.

## Problem and result

Opening Earth lacked sea traffic, its grass landing strips looked like disconnected roads,
and the aircraft's oversized, high arc and stationary turnaround did not explain its trip.
Cloud clumps read as loose rocks. Lunar crater overlays and Mars's repeated boulder chain
looked pasted onto the terrain; S2's quarry still resembled a target.

Opening Earth now has two coastal trips: a sampling skiff and a sailing cutter. Their hull
clearance determines navigable water, and piers connect their berths to land. Airfields have
continuous runway surfaces, thresholds, aprons and supporting buildings. Aircraft accelerate,
cruise, descend and taxi around the runway ends at a smaller scale. Cloud banks are fused,
unequal, lit faceted volumes with slower independent drift. S2 has irregular quarry benches
and a working-face opening. Moon craters and Mars's canyon are part of the terrain mesh.

## Blender and runtime boundary

All eleven `.blend` sources and their 59 web exports are rebuilt. Airport, pier and route
facilities now live in named `Activity_*` library parts, shared by the editable assembly and
web export. Original authored actors retain separate joint pivots and runtime articulation.
The research skiff gains a native sampling gantry, winch and specimen cases.

Cloud source objects retain an editable voxel Remesh modifier. Only disposable export copies
apply it; the exported mesh is static, with no browser remeshing or simulation. The implementation
uses Blender's documented [RemeshModifier API](https://docs.blender.org/api/5.3/bpy.types.RemeshModifier.html).
Native previews and web motion share route samples and cloud placement parameters.

No dependency or canonical schema changes. This remains original interpretive artwork:
boats, airports, routes and terrain do not assert scientific measurements. Companion inclusion
still comes from positive canonical Tables 6 and 8 cells. Quiet scenarios are not filled with
unrelated objects. Native sources remain independently editable; regeneration overwrites them,
so manual variants must be saved separately as documented in the [source guide](../assets/blender/README.md).

## Performance and delivery

The existing fixed resolution, staged loading, two-load concurrency and bounded unused-model
cache remain unchanged. Meshopt geometry and lossless gzip transfer remain in use; no texture
or resolution reduction is introduced. The asset request revision changes so returning visitors
receive the rebuilt meshes instead of their previous cached version. CPU-intensive route planning
and Blender remeshing run offline, not on visitors' devices.

Blender runs serially under the existing two-thread, sampled-memory guard. Sources, derivative
hashes and transformation history are recorded in the asset ledger; the previous model manifest
is retained with the [dated review](qa/planet-polish-2026-09-20/REPORT.md). That report records
individual world review, rendered evidence, tests, payload checks and deployment status.
