# Decision 032 — Galactic depth and magnetic chapter stops

The user requested a more expressive space background and anchors that can be felt during ordinary scrolling. Retain the black base, existing native scrolling, fixed rendering resolution, planet choreography and GSAP dependency.

An original interpretive galactic band uses overlapping SVG radial gradients, dark dust gaps and a concentrated share of the existing 360 stars. Five brighter stars receive small radial halos. No textures, filters, new canvas, persistent animation loop or external media are added. The band moves gently with absolute story progress and recedes at the telescope reveal. It is illustrative scenery, not a scientific Milky Way map.

Use [native document scrollend](https://developer.mozilla.org/en-US/docs/Web/API/Document/scrollend_event) with an idle fallback for older browsers. Once wheel/touch scrolling stops near a measured portrait, GSAP ScrollTo settles to its exact chapter position. Capture is bounded to 46% of viewport height and 42% of the adjacent anchor gap. Fast gestures retain their native travel; the last departed portrait cannot pull the user back until the user leaves its neighborhood. Article chapters remain unsnapped. Passive settling neither changes keyboard focus nor pushes browser history.

[ScrollTo autoKill](https://gsap.com/docs/v3/Plugins/ScrollToPlugin/) and explicit input cancellation release the tween immediately. Touch gestures must finish before settling; dialogs, reading mode, reduced motion, visibility changes and cleanup prevent unsolicited movement. Link/index navigation still uses the existing complete anchor targets, hash and focus behavior. No Lenis, wheel interception, mandatory scroll snapping or dependency change.

Verification covers capture and release, approach from both directions, article exclusion, mobile touch completion, interruption, reduced motion, index/history/deep links, hydration, visual review and fixed resolution. Rights and scientific sources remain unchanged; code provenance is recorded in the original-art ledger.
