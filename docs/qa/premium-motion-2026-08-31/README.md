# Premium motion QA — 2026-08-31

This packet samples the native-scroll motion pass introduced by
`DECISION_010_PREMIUM_NATIVE_MOTION_GRAMMAR.md`. It is a motion-quality artifact, not a scientific
data review.

## Captured sequence

The 16 desktop frames cover:

1. local hero settle and passive scroll parallax;
2. branch trunk, family rail, scenario-limb, complete, and reverse-scroll states;
3. early, middle, and settled S1 world handoff states;
4. observer establishment, focus, follow-through, and settled states; and
5. the direct reduced-motion S1 target state.

`capture-report.json` records the active story state and runtime error list for each capture.
`contact-sheet-report.json` records the deterministic animation-quality-gate result.

## Result

- 16 of 16 requested frames were captured.
- Browser console errors, uncaught page errors, failed runtime requests, and Spline requests: 0.
- Animation quality-gate warnings: 0.
- Manual contact-sheet review found no blank transition, silhouette discontinuity, subject crop,
  framing jump, or loss of foreground/background separation.
- Forward and reverse branch states converge on the same authored layout.
- Reduced motion resolves directly to the complete S1 target without continuous drift or travel.

## Reproduction

With the application available at `http://127.0.0.1:3000`:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm qa:motion
uv run --with pillow python /Users/ceron/.codex/skills/animation-quality-gate/scripts/animation_contact_sheet.py \
  --frames docs/qa/premium-motion-2026-08-31/{01-hero-settle,02-hero-parallax,03-branch-early,04-branch-mid,05-branch-late,06-branch-settle,07-branch-all,08-branch-reverse,09-world-handoff-early,10-world-handoff-mid,11-world-handoff-settle,12-observer-establish,13-observer-focus,14-observer-follow-through,15-observer-settle,16-reduced-motion}.png \
  --out-image docs/qa/premium-motion-2026-08-31/contact-sheet.png \
  --out-report docs/qa/premium-motion-2026-08-31/contact-sheet-report.json \
  --cols 4
```

The runtime still requires physical-device frame-rate, memory, native-GPU, and assistive-technology
review before public release.
