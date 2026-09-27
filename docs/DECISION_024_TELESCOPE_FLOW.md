# Decision 024: telescope passage and a section-owned closing Earth

2026-09-14. User-directed correction of the telescope transition, decorative crosshair and closing Earth overlapping the footer.

The previous camera translated and rotated toward a point outside the eyepiece at once, then reversed that move during the next section while the instrument remained visible. S9 simultaneously moved away from the optical axis. The ending Earth stayed at a fixed viewport position after the last scroll anchor.

The camera now follows an authored cubic approach, aligns before entering the barrel, passes along the instrument axis, and holds the unobstructed S9 view. The observer clears the approach. Both ends use the same target on the optical axis; perceived magnification remains interpretive artwork, not a scientific instrument simulation. After passing the front of the barrel, the instrument stays behind the viewer and does not reappear when continuing to the charts. Backscroll retraces the absolute trajectory. The decorative crosshair and the section-wide dark overlay are removed.

Closing Earth uses a DOM layout slot inside the epilogue. Its measured position is converted to the existing canvas coordinate space, including Safari visual viewport offsets. It moves with its section past the last chapter anchor. Slot measurements happen during layout/scroll handling, not every render frame; viewport listeners are cleaned up. On phones the closing chapter begins at the top of its portrait instead of centering the full tall prose section.

Reviewed existing Decision 013, the scroll contract, telescope coordinates and installed Three.js CubicBezierCurve3/Quaternion APIs before implementation. No libraries or external assets added. Existing R3F canvas, native scrolling, scientific datasets and source selections remain. Full motion follows Decision 023; semantic content and WebGL fallback remain.

Changed implementation: `apps/web/app/page.tsx`, `voyage/Voyage.tsx`, `voyage/Space.tsx`, `voyage/scroll.ts`, `voyage/optical-travel.ts`, and `voyage/voyage.module.css`. Unit/browser regressions and original-art lineage accompany the change. See [QA report](qa/telescope-flow/REPORT.md).
