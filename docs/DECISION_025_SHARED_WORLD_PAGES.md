# Decision 025: One visual system across the story, atlas and observatory

Date: 2026-09-14. User request: replace the legacy destination pages, use futuristic fonts, and optimize without degrading the approved animated story.

The links already resolved to valid routes; the destination pages still used the previous green/paper treatment and static artwork. All inner routes now use the same dark space background, navigation and typography. The atlas gallery, all ten scenario records and the Observatory share the current Planet renderer and admitted Blender assets. Canonical comparisons, instrument selection, URL state, tables, downloads and citations remain the data interfaces. Scientific values and their reviewed/candidate status are unchanged.

Chakra Petch provides the display typography; Space Grotesk provides the body and controls; IBM Plex Mono remains for compact data. Fonts are served by Next's self-hosted font pipeline, with swap behavior and Latin preloads. The [typography admission ledger](qa/release-polish/typography-ledger.json) records sources, licenses and checksums; full OFL notices are bundled and linked on Sources. No dependency or shared scientific schema was added.

World portraits use one canvas, mount near the viewport, and use demand rendering. Visible motion remains continuous. Leaving the viewport, hiding the document or selecting reduced motion on the accessibility page parks the preview. Mobile previews leave vertical touch scrolling available. The homepage retains the explicitly requested full-motion experience.

Blender/canvas metadata is only written when its value changes. Expensive diagnostic JSON snapshots sample at 10 Hz; object transforms, camera motion and pointer target projection still update at their original frame rate. This reduces measured DOM mutations, not the visual animation rate; it does not establish a faster GPU frame rate.

The root `loading.tsx` boundary was removed because it left complete prerendered scenario records hidden behind a reveal script without JavaScript. Suspense stays scoped to interactive explorers. This uses the documented [Next loading/Suspense convention](https://nextjs.org/docs/app/api-reference/file-conventions/loading), not a CSS override of React's hidden streaming containers. Scenario pages, canonical text and record navigation remain readable without JavaScript. WebGL failure retains DOM controls and data.

The local-link validator now checks actual public files as well as App Router routes, so bundled license notices are verified rather than exempted.

Verification, build receipts and release limits: [release polish report](qa/release-polish/REPORT.md). No deployment, commit, push, scientific review signature or provider configuration is implied by this work.
