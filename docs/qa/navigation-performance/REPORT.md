# Navigation and rendering verification

2026-09-14 · local working tree · `codex/janus-first-light`

## Delivered

- A single `SiteHeader` component and stylesheet now serve the story, Atlas, Observatory, scenario records, supporting pages, 404 and recovery view. Logo, order, fonts, sizing and Index controls stay consistent. The active-link underline is the intentional route-specific state.
- Index works from inner pages, supports Escape and outside-click dismissal, and retains the story's deterministic chapter navigation. Mobile WebKit's differing fixed-element gutter width was corrected and retested.
- High-density 3D buffers adapt between native CSS resolution and 1.5 DPR under sustained rendering pressure. Recovery is slower than reduction to avoid rapid resolution changes. This affects supersampling only: geometry, materials, lighting, effects and animation timing remain unchanged; DOM text keeps full display resolution.
- The story no longer constructs all hidden worlds during the opening. Nearby worlds stage for transitions; the complete ten-world overview is retained during its approach and exit. Hidden libraries avoid repeated projection and diagnostic work.
- New portraits retain their offscreen, hidden-document and reduced-motion parking and request the same GPU preference as the story.

## Measurements

Same local Chromium harness, 1440×1000 CSS viewport, device scale 2, ten-second settling interval and three-second sample:

| Story S3                 |    Before |     After |
| ------------------------ | --------: | --------: |
| Rendered frames / second |      18.3 |      31.7 |
| Drawing-buffer size      | 2160×1500 | 1440×1000 |
| Draw calls / frame       |        76 |        76 |
| Triangles / frame        |    51,718 |    51,718 |

This sample improved about 73%, with 56% fewer buffer pixels and identical rendered scene detail. Native-resolution GPU rendering is still device-dependent; this is not a universal 60 fps claim. At device scale 1, sampled frame intervals were essentially unchanged (Atlas near 16.6 ms; story near 33 ms). Atlas's high-density sample varied from 40 to 46.7 fps at unchanged resolution, which is not treated as a proven speedup. Raw receipts: `gpu-comparison.json`, `gpu-before.log`, `gpu-after.log`, and CPU-profile summaries.

New portrait instrumentation: 2,112 WebGL draw calls during a visible second, **zero offscreen**, 2,368 after returning, **zero under reduced motion**, one canvas. Calls are not frames. See `portrait-rendering.json`.

## Verification

- Production build and bundle budgets passed. Initial homepage JS is 197,044 bytes gzip, below the unchanged 256,000-byte budget.
- TypeScript, ESLint, Prettier and `git diff --check` passed; 126 unit tests passed.
- Final navigation/accessibility suite: **30 passed** across desktop Chromium and mobile WebKit. Navigation geometry and links are compared across seven routes, including 404; tests exercise Index-to-S3 navigation, focus return, overflow, native-or-better resolution, and automated WCAG A/AA checks.
- Rendering/interaction regression run: 16 passed and one intentional touch-only keyboard-test skip; its mobile navbar-width failure was corrected and covered by the final suite above. Passing cases retain continuous companion emergence/backscroll, telescope passage, final-Earth anchoring, all ten previews/records, no-JavaScript record content, WebGL fallback, desktop keyboard rotation and the uncluttered full-motion story.
- Seven screenshots captured and reviewed, including the complete ten-world overview and desktop/mobile story/Atlas/Observatory. Capture and profiling scripts are retained beside the evidence.
- Asset ledger and link/citation validation passed. No media binaries, scientific data or dependency versions changed. Source artwork version: `navigation-performance-v16-2026-09-14`; checksum and covered source files are in `art-source.json`.

## Scope and limits

Changed application files: `components/SiteHeader.tsx`, `SiteHeader.module.css`, `AdaptiveResolution.tsx`, `PortraitCanvas.tsx`, `InnerPage.tsx`, `InnerPage.module.css`; `voyage/Voyage.tsx`, `Space.tsx`, `BlenderAssets.tsx`, `voyage.module.css`; `not-found.tsx`, `error.tsx`, `status.module.css`. Added `e2e/navigation-performance.spec.ts`; updated the art receipt, Decision 026 and implementation pointers.

No geometry was simplified or animation disabled to achieve the high-density result. Supersampled edges can become less sharp when resolution steps down under load; it never drops below native CSS resolution. Real user hardware can differ from the local measurement. No deployment, commit, research-provider canary or scientific review change was performed.
