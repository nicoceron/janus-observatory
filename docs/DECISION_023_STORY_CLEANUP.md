# Decision 023: quiet story UI and Timer-backed rendering

Date: 2026-09-14. Scope: homepage story and its React Three Fiber runtime.

The user explicitly requested removal of decorative microcopy, off-world link lists, the entire bottom toolbar, and the System/Reduced/Full selector, with full motion always active. The homepage now follows that choice, even with an OS or saved reduced-motion preference. This overrides the prior homepage motion/reading selector requirement; it is not a WCAG conformance claim. Research pages retain their existing preference and the homepage does not overwrite its saved value. The accessibility page describes the current behavior.

Scenario names, canonical narratives and stats, chart sources, atlas links, keyboard chapter navigation, inspector focus management, Skip story, and semantic/no-WebGL content remain. Retry 3D appears in the Index only after a rendering failure. The existing planets and organic behind-Earth reveal remain unchanged. No new media or scientific data was introduced.

## Dependency decision

Installed `@react-three/fiber` 9.7.0 (also the current published release checked for this change) constructs `THREE.Clock`; installed Three 0.185.1 deprecates that constructor. Reviewed Three's installed `src/core/Timer.js` and `Clock.js`, Fiber's store/render loop, and the [official pnpm patch workflow](https://pnpm.io/cli/patch) before changing it.

A version-pinned pnpm patch replaces the store's clock construction with a Timer-backed adapter in all three shipped event bundles (ESM, CJS development, CJS production). It retains the public start/stop, autoStart, elapsedTime, oldTime and getDelta interface, including demand/never frameloops. getElapsedTime reads the current simulation frame instead of advancing time a second time. No warnings are filtered. No browser listeners are added; no Timer document connection requires cleanup. No library version is upgraded or downgraded.

`pnpm-workspace.yaml` and `pnpm-lock.yaml` pin the patch. A real Fiber root-store unit test checks startup, elapsed reads, frame deltas and stop/restart across frameloop changes. Production browser checks exercise the ESM runtime. Remove this patch when an upstream Fiber release natively migrates to Timer, and rerun those checks when upgrading Fiber or Three.

Next.js's supported `devIndicators: false` setting removes the development badge from local review. Errors are still logged and surfaced normally.
