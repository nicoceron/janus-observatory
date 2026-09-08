# Decision 013: First light, a new story frontend

Date: 2026-09-07. Branch: `codex/janus-first-light`.

The user requested a fresh frontend, distinct planets, an animated living observer, and continuous immersive scrolling. This supersedes the former homepage, Spline hero, story layout, and scene implementation. Canonical data, domain tools, source rights, and deeper research routes remain authoritative.

The new entry point is `app/voyage`. One deferred R3F WebGL canvas sits behind a native scrolling article. Measured document positions continuously interpolate complete scene compositions and select the active chapter. IntersectionObserver watches chapter visibility; passive scroll events update a mutable flight state once per animation frame. There is no wheel interception, scroll snapping, or separate scroll clock. GSAP handles interface entrances only. No dependency is added. Terrain preparation is spread across idle callbacks, with the selected world prepared immediately for direct jumps.

The final world renderer has no photographic maps or shared coastlines. Seeded three-dimensional fields displace mesh vertices, carve extraction basins and faults, and generate separate surface materials. Instanced structures and independently authored geometry distinguish ten forms: a city world, extraction frontier, habitat arcs, wilderness, biological engineering, segmented shell, reclaimed ruins, fractured terrain, machine swarm, and a human-machine duality. Weather sits above each terrain envelope. These are original artistic inventions, not inferred planetary geography or engineering specifications. Every future world is labeled accordingly. The fallback is a WebP render of the same original procedural origin world, with source and derivative checksums recorded.

The observer is an original fictional organism with breathing, traveling fin waves, independent tendrils, small gaze movements and blinking. Two limbs curl beneath a modeled telescope. The instrument has an open barrel, internal baffles, finder, focuser and eyepiece. The camera interpolates into the actual eyepiece coordinate frame for the following chapter; native links enter and leave the view, and reverse scrolling restores the exterior. Responsive off-axis camera framing reserves space for prose. This is explicitly an illustrative view, not an optical simulation or depiction of a specific Janus mission.

The persistent-scene and scientific principles in the master plan remain. This decision replaces the plan's specific WebGPU/TSL, Spline, branch-map and old observer camera choreography with a smaller WebGL shader renderer and continuous flight. Reduced motion uses stable compositions; reading mode and context failure preserve the complete server-rendered narrative, data, and citations.

Scope: homepage and its story renderer, new story charts, shared presentation tokens, related frontend tests, and provenance/QA documentation. No source transcription, shared schema, provider configuration, or dependency changes.

Runtime source: existing generated release `sha256:46a0e94a969301c49cfafe00463e5c7e9be5dce423ddcdeb21fe4ad0614d2046`; the recorded independent human review is pending. The UI must retain this distinction. Scientific fields are projected server-side into compact display data with versioned locator links.

Implementation references read: installed Next.js 16.3 server/client component and lazy loading guides; official Three.js BufferGeometry, InstancedMesh, Camera, AnimationMixer and shader documentation; GSAP quickTo documentation; R3F demand-rendering API. Verification and remaining limitations are recorded in `docs/qa/first-light/REPORT.md`.
