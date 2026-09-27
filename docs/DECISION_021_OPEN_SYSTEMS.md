# Decision 021: simultaneous systems, continuous space and connected transport

2026-09-12. User-directed replacement of the single-location tabs from Decision 019.

Every scenario now composes Earth and all its canonical-selected off-world bodies in one visible
system. Shared screen-space placement aligns the Three.js models with keyboard-accessible DOM
hit targets and names. Clicking a world opens the existing detailed inspector; closing restores
focus to that world. There is no single selected story portrait. The bodies remain illustrative
miniatures: relative sizes, distances and arrangements are not orbital or scientific measurements.
Canonical selections and citations remain unchanged.

One continuous static SVG star field and restrained color clouds extend behind the story. The
existing single WebGL canvas adds sparse spatial stars. Static sky remains available without
WebGL or animation. No video, image texture, shader package or additional render engine is added.

Roads use the same prepared centerlines as moving actors. Visibility string-pulling removes
unnecessary navigation-grid detours; bounded corner refinement only accepts traversable segments.
The city receives dark pavement, restrained lane markings and edges. Quarry roads have gravel
shoulders and wheel wear. Restoration has an unpainted local track. Salvage uses worn tracks.
Airfields have runway thresholds, side markings and a taxiway to their terminal. Roads are not
added to scenarios with no road activity. The routes and their details are original interpretive
art, not reported infrastructure.

Runtime loading remains serial. The two-library target applies to unused cache entries, while
all members of the visible system retain leases. Up to eight libraries belong to S9's complete
system; neighboring systems' companions unmount when the active chapter changes. The existing
48 MiB decoded budget and single-canvas design are retained. Visibility diagnostics now expose
all visible libraries instead of allowing companion models to overwrite Earth's status.

No dependencies or canonical schema changes. Documentation consulted: master plan, Decisions
019–020, installed Next.js client component reference, existing route geometry and Blender source
pipeline. Verification and limitations: [open systems QA](qa/open-systems/REPORT.md).

Follow-up correction: the user identified the starting Earth’s strip as still visually arbitrary. The [airfield and hydration correction](qa/airfield-correction/REPORT.md) replaces that asphalt patch with a cleared grass airfield and removes cross-engine floating-point differences from the server-rendered starfield.
