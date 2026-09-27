# Decision 033 — One chapter presentation for narrative and worlds

The user reported that the left-hand narrative was disconnected from the planets. The cause was architectural: document-flow prose, independently damped Three.js progress and separately eased sky progress were three different presentations of one scroll position.

The measured native-scroll controller now publishes one absolute presentation progress. Both Three.js and DOM narrative consume a shared pure chapter frame and transition curve; the sky consumes that same progress without another smoothing clock. GSAP still owns deliberate anchor travel and settling, so no second easing layer is needed. Idle planetary activity is unchanged.

Each scenario retains one server-rendered semantic narrative. Its normal-flow slot reserves the measured dimensions, and on desktop, when the text fits safely below the header, that same node is positioned in a shared viewport composition. It enters, holds and exits according to the spatial handoff. There are no duplicated text overlays, content literals, independent delays or guessed per-world offsets. Inactive copies are inert; chapter navigation focuses the original section. Before JavaScript, in reading/fallback mode, with reduced motion, on mobile or in a short viewport, the copy uses normal document flow.

Flow layouts hold their world until the measured text has been brought into view, then transition through the remaining distance to the next anchor. This preserves natural reading, text zoom and long content. ResizeObserver and font readiness remeasure slots outside scroll frames; scroll work only applies transforms, opacity and visibility. Existing portrait anchors, behind-Earth companion staging, telescope path and closing-world ownership remain unchanged.

References: [MDN positioning and containing blocks](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position), [GSAP ticker and animation scheduling](https://gsap.com/docs/v3/GSAP/gsap.ticker/), and Decisions 031–032. No dependencies, Blender geometry, resolution or canonical data changed.
