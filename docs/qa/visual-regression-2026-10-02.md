# Visual regression contract repair

The four deterministic screenshots still represented an older light theme and the pre-Decision-023 homepage controls. They were already failing before the agent-directory release. Decision 023 explicitly preserves full homepage motion without overwriting the saved research-page preference, removes the reading-mode button, and retains the complete article when WebGL is unavailable. The visual suite now verifies that current contract.

The full-motion hero is captured with Playwright's native Clock paused in the test. The article test exercises actual WebGL failure instead of looking for a removed control. Research-page captures retain reduced motion. Fixed site headers are hidden in component screenshots so viewport overlays do not cover the section being compared. The fourteen atmospheric rows, fifty mission cells, canonical explanations, saved preference, and seventeen fallback chapters remain asserted. Pixel thresholds are unchanged.

The baselines were generated with the exact CI image, Linux amd64 Chromium/SwiftShader:

`mcr.microsoft.com/playwright:v1.62.1-noble@sha256:c091b21d9fae78c76e85cd4356431e9b018402f172a214fc7d7a5e9a7e29d8ac`

Reviewed all four generated images: current low-poly hero; complete S1 article with its existing canonical population and energy; all fourteen independent atmosphere measures; ten scenarios with five categorical mission cells each. No scientific data, source references, runtime animation, styles, artwork, or dependencies were changed. Baseline generation passed 4/4; an immediate fresh-server comparison passed 4/4. Formatter, targeted lint and all three package typechecks passed.

References: [Decision 023](../DECISION_023_STORY_CLEANUP.md), [current master plan](../MASTER_PLAN.md), [Playwright Clock](https://playwright.dev/docs/clock), [visual comparisons](https://playwright.dev/docs/test-snapshots).
