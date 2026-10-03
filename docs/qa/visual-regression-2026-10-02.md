# Visual regression contract repair

The four deterministic screenshots still represented an older light theme and the pre-Decision-023 homepage controls. They were already failing before the agent-directory release. Decision 023 explicitly preserves full homepage motion without overwriting the saved research-page preference, removes the reading-mode button, and retains the complete article when WebGL is unavailable. The visual suite now verifies that current contract.

The full-motion hero is captured with Playwright's native Clock paused in the test, after GSAP's authored staggered entrance clears its temporary transform and opacity. Waiting only for WebGL readiness had captured the hero text mid-tween on GitHub. After checking the actual full-motion homepage policy, the screenshot fixture uses the existing motion-change event to place models at their authored rest pose: a paused callback alone does not remove the asynchronous mount offset from accumulated model phase. The journey remains in full mode, and no runtime test hook was added. The article test exercises actual WebGL failure instead of looking for a removed control. Research-page captures retain reduced motion. Fixed site headers are hidden in component screenshots so viewport overlays do not cover the section being compared. The fourteen atmospheric rows, fifty mission cells, canonical explanations, saved preference, and seventeen fallback chapters remain asserted. Pixel thresholds are unchanged.

The baselines were generated with the exact CI image, Linux amd64 Chromium/SwiftShader:

`mcr.microsoft.com/playwright:v1.62.1-noble@sha256:c091b21d9fae78c76e85cd4356431e9b018402f172a214fc7d7a5e9a7e29d8ac`

Reviewed all four generated images: current low-poly hero; complete S1 article with its existing canonical population and energy; all fourteen independent atmosphere measures; ten scenarios with five categorical mission cells each. No scientific data, source references, runtime animation, styles, artwork, or dependencies were changed. Baseline generation passed 4/4; an immediate fresh-server comparison passed 4/4. Formatter, targeted lint and all three package typechecks passed.

References: [Decision 023](../DECISION_023_STORY_CLEANUP.md), [current master plan](../MASTER_PLAN.md), [Playwright Clock](https://playwright.dev/docs/clock), [visual comparisons](https://playwright.dev/docs/test-snapshots).

## Broader browser CI repair

The previous main run timed out after forty minutes. Headless Linux Firefox could not create WebGL, while 3D-specific checks required a ready canvas. Following Playwright's documented Linux headed setup, CI now uses Xvfb and the same pinned Noble browser image. Each of the five existing browser projects runs in its own job with one worker, independently of the source-verification job (each browser job builds its own production server); no browser, assertion, or fallback coverage was removed. Reports and retained failure traces are uploaded per project. Superseded runs are cancelled through native workflow concurrency.

The fifty Observatory selections are now five independently bounded tests, one per canonical observing mission with the same ten scenarios, stable geometry, clipping, and data assertions. The pre-WebGL story-link assertion includes inactive chapters, whose semantic links intentionally become inert during the animated journey. Production navigation and artwork remain unchanged.

References: [Playwright CI, workers and Xvfb](https://playwright.dev/docs/ci), [project selection](https://playwright.dev/docs/test-projects).
