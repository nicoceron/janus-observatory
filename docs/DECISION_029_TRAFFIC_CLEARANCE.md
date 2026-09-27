# Decision 029 — Water traffic and landing clearance

The deployed opening boats could occupy the same point: their routes were planned independently.
The previous coastline check also did not cover a complete turning hull, and a quay placed on
fixed local +X could cross its own approach. The correction separates the two authored coastal
trips and checks space, rather than relying on a phase delay that can fail later in the loop.

Offline route generation reserves the complete horizontal turning envelope of each boat,
including rigging and a roll margin. Subsequent boats avoid earlier routes and landing meshes.
Coastline probes cover the full turning circle. A landing searches actual shore candidates,
rejects approaches inside any swept waterway, and joins a supported narrow pier to shore.
Background scenery avoids the actual landing geometry and complete water corridor. Hand-placed
coastal details also relocate onto clear supported land; river strips stop before open water.
The canoe landing moves away from the campsite so its complete turn clears the native model.

The existing Blender pipeline exports these route facilities as editable semantic parts. Browser
animation still interpolates the baked route samples: no runtime collision solver, additional
rendering library, dependency, canonical schema or resolution change. Authored traffic remains
interpretive artwork, not a claim from the Project Janus paper.

Regression checks reproduce the old collision, then cover both route tiers, pairwise envelopes,
pier triangles and shoreline turning clearance for opening Earth, S3, S4, S7 and S10. The QA
report records observed motion, asset admission, resource use, release checks and limitations.
