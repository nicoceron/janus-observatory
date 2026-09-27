# Decision 026: Shared navigation and adaptive rendering

2026-09-14. The user reported continuing lag and inconsistent navigation between the story and inner pages.

## Diagnosis and changes

The story and InnerPage had independent header markup, spacing, logos and links. `SiteHeader` now owns the logo, Story/Atlas/Observatory links and Index menu everywhere, including recovery/404 pages. Only the active-link underline changes. Story Index buttons retain the deterministic chapter-jump callback; other pages link to the same chapter anchors. Escape restores trigger focus, outside pointer interaction closes the menu, and the header becomes inert during model inspection. Duplicate header CSS was removed. An explicit viewport width avoids the differing fixed-element gutter treatment observed between the story and clipped inner-page ancestor on mobile WebKit.

GPU sampling at a 1440x1000 CSS viewport and device scale 2 found a 2160x1500 story drawing buffer. Rendering this supersampled full-screen surface was more costly than the miniature Atlas canvas. The CPU trace also caught hidden-world procedural construction during initial use. Earlier diagnostic-write reductions had not fixed these costs.

`AdaptiveResolution` uses the installed Drei `PerformanceMonitor` and R3F `setDpr` APIs. Six 300 ms windows detect sustained rates below 45 fps and reduce DPR by 0.25. Recovery requires four healthy monitoring windows before raising DPR by 0.125. The bounds remain native CSS resolution through min(device scale, 1.5); there is no below-native fallback, frame-rate cap or reduced-motion substitution. DOM text is unaffected. Supersampled edge sharpness can decrease under load; models, textures, lighting, geometry, effects and motion timing are unchanged. Portraits now request the same high-performance context preference as the story.

The story stages the current/neighboring worlds rather than constructing every world behind the opening. All ten still mount during the overview approach and remain until its exit is complete. The persistent canvas, continuous behind-Earth reveal and inspection scene are retained. Hidden Blender libraries skip world projection and repeated cache diagnostics; leases still release when their visibility ends.

Documentation/API evidence: installed `@react-three/drei/core/PerformanceMonitor.d.ts` and `.js`; installed R3F store `setDpr` signature; Three Object3D matrix update documentation/source. No dependency or scientific schema change was required.

## Evidence

[Verification report](qa/navigation-performance/REPORT.md), [GPU comparison](qa/navigation-performance/gpu-comparison.json), and the source-art receipt are recorded together. Local sample rates are not a guarantee on other machines. No new external art, scientific values or canonical data were introduced. No deployment or git commit is part of this task.
