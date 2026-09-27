# Telescope and closing Earth — 2026-09-14

[Decision 024](../../DECISION_024_TELESCOPE_FLOW.md) records the implementation, assumptions and changed files. The original artwork checksum and its complete file list are in `art-source.json`. No canonical data or external assets changed.

## Checks

- 126 unit tests in 35 files passed, including optical approach/hold/exit ordering, bounded continuity and deterministic reversal.
- Type checking, ESLint, canonical data, asset rights and link/citation validators passed. The existing published growth-rate discrepancy remains separately documented by the canonical validator.
- Next production build passed. Initial homepage JavaScript: 188,891 gzip bytes, within 256,000 bytes; the full journey remains within its payload budget.
- Production desktop Chromium and mobile WebKit passed telescope link entry, exit, interrupted reversal and no-WebGL fallback. Intermediate frames were captured along the scroll path and inspected, including the aligned aperture and unobstructed Earth.
- Final live-preview desktop Chromium and mobile WebKit trajectory/anchoring regressions passed, including all five closing-section scroll samples and reversal. Screenshots were visually inspected.
- Closing Earth is compared to the center of its section-owned DOM slot in canvas coordinates, on forward/backscroll. This caught and corrected Safari's 10-pixel canvas offset. Test scroll commands wait for their requested position before checking scene placement, to avoid sampling a previous browser frame.

The camera clears the observer, approaches the eyepiece, passes through the existing open barrel and holds the view. The telescope is no longer in front of the camera when continuing into the charts. Reticle markup/styles and the hard optical-section overlay are removed. The closing Earth moves with the epilogue and leaves before the footer.

Screenshots named `chromium-*` and `mobile-webkit-*` show production captures; `desktop-*` and `mobile-*` show live-preview checks. Captures cover approach, barrel passage, settled Earth and 0/160/320-pixel closing-section scroll offsets.

## Boundaries

This is an illustrative camera journey, not an optical instrument simulation. No Blender rebuild or new render pipeline was needed. The complete historical browser suite and pinned visual baselines were not rerun. Full-motion behavior follows the user's Decision 023 request; semantic narrative and WebGL fallback remain. No deployment or commit was performed.
