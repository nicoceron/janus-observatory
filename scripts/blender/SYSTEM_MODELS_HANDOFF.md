# Native off-world Blender models

2026-09-11. Source implementation handoff; this is not a rendered acceptance receipt.

`system_worlds.py` exports `build_system_world(world_id, selection, system)` and
`build_study(world_id, kind)`. The caller owns collection selection, Blender process
limits, scene lifecycle, framing, export and runtime mesh consolidation. Functions
return every newly linked mesh and semantic assembly empty. Geometry uses Blender
Z-up, with the principal view toward the -Y side. No scene reset, subprocess,
external media, procedural shader, texture, modifier or simulation is created.

The supplied reviewed `system` footprint gates every requested portrait. `Moon`
and the display alias `Luna` are accepted. The twenty body portraits and seventeen
system features remain those selected from the current published positive-cell
view; S4/S7 do not acquire extra destinations. S1 Venus and S9 Moon remain orbital,
S5/S10 Venus atmospheric, and S6 Venus an anchored surface process assembly.

Sources: `JANUS-PAPER-01`, `arXiv:2409.00067v3`, narrative summaries on rendered
page 11, Table 6 on rendered page 14 and Table 8 on rendered page 17. The source
selection remains in the repository's canonical domain view. The art brief is
`docs/BLENDER_WORLD_ART_DIRECTION.md`. Exact terrain, architecture, object counts,
dimensions and spacing are original interpretive artwork, never scientific data.

The assemblies distinguish controlled residential crowns, mine-head industrial
yards, civic pressure courts, enclosed biosynthetic halls, redundant process works,
bermed refuges, robotic fabrication layouts and inhabited/autonomous settlement
edges. Asteroid and Kuiper works share small construction details. Kuiper bodies
use elongated unequal ice lobes, a deep diagonal fracture, a tall extraction portal
and a separate upper-lobe station; they do not reuse the asteroid mine layout.
Solar collectors have frames,
backside buses and unequal placement; only S9 has this portrait.

Available studies: `lunar-base`, `mars-base`, `aerostat`, `venus-facility`,
`orbital-habitat`, `machine-station` and `machine-facility`. Studies are isolated
prefabs; the caller must expose only those linked by the reviewed interface.

Each portrait allocates eleven simple Principled material families, uses
prop icospheres no higher than subdivision 3 and planetary bodies at subdivision 4, and uses native modeled chamfers.
Meshes and prefabs are separate and named in the editable master. Triangle and
node counts must be measured by the caller before acceptance; the implementation
contains no scene-wide scatter loops or high-resolution subdivision.

Verified locally: Ruff format/lint, Python compilation and whitespace diff check. Source topology
review corrected crater bowl and habitat cutaway surface winding, modeled closed
thickness, and added individually projected foundations to ground each building and equipment
saddle on curved bodies. No Blender or rendering process ran in the subtask, preserving the root
task's single-process resource budget. The root task rendered the baseline asset set;
this subtask inspected the native S1, S2, S3, S6, S8, S9 and S10 portraits, including
front, quarter and rear angles. The independent CPU geometry auditor passed the
baseline 59 GLBs after the root corrected the S10 mobile semantic export. That
baseline pass does not validate the subsequent source corrections listed below.

The first S3 rendered review rejected the oversized shared plinth and sparse module kit.
The revision removes that common pad, introduces a separate Mars pressure-gallery/atrium
street with observatory and lander, retains a radial lunar civic court, and adds physically
connected energy/thermal yards. S1, S2, S5 and S10 Mars assemblies also have distinct
construction and organization from their lunar companions. Main body facets increased to
1,280 triangles; lunar bowls deepen into sculpted terrain and Mars has a continuous valley
escarpment. These improvements were included in the inspected baseline renders.

The baseline visual review required fourteen targeted portrait revisions. The
root rebuilt them and rendered new front, quarter and rear views:

- S1 Venus and S9 Moon: raise the orbital assembly for physical and visible clearance.
- S1/S3/S5/S9/S10 outer: separate the ringed giant from the foreground icy body.
- S5/S10 Venus: raise and reposition the aerostat so its suspended cabin and cables
  remain visible; suspended cabin supports do not receive terrain foundations.
- S5/S6/S9/S10 Kuiper: replace the asteroid-like layout with cleaved ice geology,
  anchored extraction, body-following transfer lines and scenario-specific process
  or inhabited infrastructure.
- S8 Moon: embed the lower regolith berm vertices into the actual curved terrain,
  preserving its upper sheltering silhouette and the isolated study geometry.

The regenerated 59-asset CPU audit passed with no errors or warnings, exactly 37
canonical off-world portraits, eleven verified editable-source checksums and no
duplicate geometry hashes. Maximum GLB size is 831,636 bytes; maximum decoded
geometry size is 2,668,320 bytes. The most detailed off-world portrait is S3 Mars
at 10,264 triangles; off-world portraits use at most eleven material families and
eleven draw calls. See `docs/qa/blender-finish/geometry-audit.json` for the complete
per-model receipt. The root confirmed sixteen changed GLBs and forty-three
unchanged: the fourteen off-world portraits plus two independently corrected S4
Earth tiers.

The new orbital, outer-system, Kuiper and S8 berm views pass the native visual
review. S5/S10 Venus cabins and suspension read clearly in quarter/rear views, but
their front views still projected the cabin over the planet's upper edge. With
the root's approval, the shared atmospheric site radius was increased once more
from 1.14 to 1.42. Ruff, compilation and whitespace checks pass; source is frozen
again pending the two refreshed Venus portrait reviews and a new export audit.
The root owns final acceptance and the browser
review, including material appearance, framing and interactive behavior.
