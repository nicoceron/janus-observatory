# Decision 020: editable Blender worlds and bounded runtime asset libraries

2026-09-11. Implements the user's request to finish every approved miniature in Blender.

The accepted faceted Earth terrain, authored routes and articulated motion provide the starting
geometry. Blender adds editable construction details, PBR surface treatment and modeled edge
finishing. New native Blender assemblies replace the source-selected off-world portraits. Each
scenario has an editable `.blend` with separate scenes for Earth and each selected destination;
the origin has its own source. These files are working source assets, not web downloads.

All geometry is original interpretive art. The source selection remains the canonical
`systemPortrait` view of `JANUS-PAPER-01`, `arXiv:2409.00067v3`, Tables 6 and 8. Architectural
dimensions, counts, terrain and motion are not reported measurements. S1 Venus and S9 Luna retain
orbital activity, S5/S10 Venus retain atmospheric activity, and S6 Venus receives its correct
surface facility. Empty canonical cells never establish absence. No new external asset is used.

## Source and export contract

`scripts/export-blender-seeds.ts` writes a versioned art exchange containing the existing terrain,
landmark placement, local joint geometry and deterministic route samples. It does not generate
or change scientific data. `scripts/blender/finish_world.py` imports vertex colors with the
coordinate transform `(x, y, z) → (x, -z, y)`, adds native modeled components, and saves editable
sources. The Blender timeline includes route and joint previews; the production site's existing
R3F controller remains responsible for live movement, task pauses and reduced-motion states.
The S4 canoe has separate upper-arm, forearm and hand meshes. Both the web controller and
Blender preview derive the wrist targets from the moving paddle and place the arm segments
between shoulder, elbow and grip; hands are not baked into the stationary torso.

The official installed Blender 5.2 glTF exporter supplies `EXT_meshopt_compression`; Three's
bundled decoder reads it. No new package, remote decoder, animation framework or scroll library
is introduced. Installed exporter documentation/RNA were inspected for vertex-color, selection,
Y-up and compression options. `export_apply=False` avoids uncontrolled modifier expansion.

Runtime copies merge static components within each named semantic part. Editable source meshes
retain their individual construction names. Wheels, limbs, propellers, loading equipment, clouds
and mill mechanisms remain separate at their existing local pivots. Each Earth has desktop and
mobile geometry tiers. Each selected body or system feature has a separate compact GLB. Static landmark closeups use the exported Blender geometry bounds for framing, so added bases and construction detail stay inside the default view. Moving mill assemblies retain their joint pivots.

## Resource and accessibility behavior

Blender jobs are serial, run at reduced priority with two CPU threads, and use a watchdog over
their own process group. The default sampled RSS ceiling is 4 GiB. Launch checks require available
memory and refuse a competing Blender process. An explicitly inspected idle GUI may be identified
with `--idle-gui-pid`; it must be the only other Blender process, at no more than 10% CPU and
2 GiB RSS. The runner rechecks that condition and stops only its own job if the GUI becomes busy.
It never changes or closes the GUI or its scene. Launch requires 4 GiB free + inactive + purgeable
memory; the watchdog also stops its own job if free + inactive memory falls below 2 GiB.
Timeouts terminate only the launched process group. Build receipts, logs and source hashes
support safe resumption. Rendering uses CPU Cycles
with small review frames; no physics, large textures, GPU simulations or parallel renders.

The web loader requests only a visible, portrait-sized world and serializes requests/parsing.
Overview miniatures retain lightweight geometry. A reference-counted cache retains two unused/
active libraries within a 48 MiB decoded-geometry budget; live references are never disposed.
Procedural content stays visible until a complete required library is available and remains the
failure fallback. The interface, DOM descriptions, keyboard controls, single-canvas story,
reduced-motion handling and no-WebGL reading experience are preserved.

The unchanged 20 MiB guided-path budget is audited separately for desktop and mobile. Both
journeys include all Blender off-world destinations, every emitted client
JS/CSS/WOFF2 file and home HTML. Desktop uses the desktop Earth libraries. Mobile includes both
Earth tiers because the detailed explorer intentionally loads desktop libraries even on a phone.
The larger complete story-and-explorer total is reported. Legacy Earth maps, old observer GLBs
and other public assets unreachable from the audited home source graph are excluded. Every
public file still passes the unchanged 4 MiB individual-asset guardrail. The audit checks the full
Voyage directory, home page/layout relative imports and emitted HTML, and fails on unexpected
`/assets/` references or missing source-selected exports. Browser request receipts independently
verify asset coverage.

## Acceptance

Source export alone does not establish visual quality. Review all selected planets, Earth
landmarks and actors in the running site, inspect multiple Blender angles, verify motion and
object selection, and record measured file sizes, decoded resources, process memory and test
results in `docs/qa/blender-finish/REPORT.md`. Hash every source and derivative in the asset ledger.
Keep original evidence when a first render prompts a correction. Production performance on
unavailable physical devices must remain an explicit limitation.
