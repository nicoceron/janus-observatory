import { expect, test } from '@playwright/test';

const storyName = 'Watch one Earth become ten possible worlds.';

test.describe('guided story', () => {
  test('starts as a scroll story and offers Read and Skip paths', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Ten futures. One system.' })).toBeVisible();
    await expect(page.locator('.heroSpline')).toHaveCount(1);

    const story = page.getByRole('region', { name: storyName });
    await expect(story.getByRole('link', { name: 'Begin first light' })).toHaveAttribute(
      'href',
      '#story-scrolly',
    );
    await expect(story.getByRole('button', { name: 'Read as article' })).toBeVisible();
    await expect(story.getByRole('link', { name: 'Skip to Atlas' })).toHaveAttribute(
      'href',
      '/atlas',
    );
    await expect(story.getByLabel('Story chapters').getByRole('article')).toHaveCount(18);
    await expect(story.locator('.storySticky')).toBeVisible();

    const steps = story.getByLabel('Story chapters').getByRole('article');
    await steps.nth(1).scrollIntoViewIfNeeded();
    await expect(page.locator('.heroSpline')).toHaveCount(0);
    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
    await expect(story.locator('.storyStage')).toHaveAttribute(
      'data-active-step',
      'possibility-space',
    );
    await expect(story.locator('.earthStage')).toHaveAttribute('data-scene-kind', 'branches');
    await expect(story.locator('.earthStage')).toHaveAttribute(
      'data-branch-layout',
      'trunk-spine-stems',
    );
    await expect(story.locator('.earthStage')).toHaveAttribute(
      'data-branch-animation',
      'scroll-scrubbed',
    );
    await expect
      .poll(async () =>
        Number(await story.locator('.earthStage').getAttribute('data-branch-progress')),
      )
      .toBeGreaterThan(0);

    await story.getByRole('button', { name: 'Read as article' }).click();
    await expect(story.locator('.storySticky')).toBeHidden();
    await expect(story.getByRole('button', { name: 'Return to visual story' })).toBeVisible();
    await expect(
      story.getByRole('heading', { name: 'One known technological world.' }),
    ).toBeVisible();
  });

  test('supports a complete keyboard path and restart', async ({ page }) => {
    await page.goto('/');

    const story = page.getByRole('region', { name: storyName });
    const steps = story.getByLabel('Story chapters').getByRole('article');
    await steps.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
    await expect(steps.nth(1)).toBeFocused();
    await expect(story.locator('.storyStage')).toHaveAttribute(
      'data-active-step',
      'possibility-space',
    );

    await page.keyboard.press('ArrowUp');
    await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step');
    await expect(steps.nth(0)).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await story.getByRole('button', { name: 'Restart story' }).click();
    await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step');
    await expect(story.locator('.storyStage')).toHaveAttribute('data-active-step', 'present');
  });

  test('keeps one 3D world mounted from Earth through the system handoff', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });

    const story = page.getByRole('region', { name: storyName });
    const stage = story.locator('.earthStage');
    const canvas = stage.locator('canvas');
    const steps = story.getByLabel('Story chapters').getByRole('article');

    await expect(stage).toHaveAttribute('data-world-lifecycle', 'persistent', { timeout: 20_000 });
    await expect(canvas).toHaveCount(1, { timeout: 20_000 });
    await page.evaluate(
      (element) => {
        (window as Window & { __janusStoryCanvas?: Element }).__janusStoryCanvas = element;
      },
      await canvas.elementHandle(),
    );

    for (const [index, kind] of [
      [1, 'branches'],
      [3, 'scenario'],
      [13, 'observer'],
      [14, 'ocular'],
      [17, 'system'],
    ] as const) {
      await steps.nth(index).scrollIntoViewIfNeeded();
      await expect(stage).toHaveAttribute('data-scene-kind', kind);
      if (kind === 'observer') {
        await expect(steps.nth(index)).toHaveAttribute('data-scroll-anchor', 'observer');
        await expect(stage).toHaveAttribute('data-observer-asset', 'fab-animated-v3');
        await expect(stage).toHaveAttribute('data-observer-motion', 'six-clip-scroll-scrub');
        await expect(stage).toHaveAttribute('data-observer-camera', 'shoulder-eyepiece-ocular');
      }
      const sameCanvas = await page.evaluate(
        (element) =>
          (window as Window & { __janusStoryCanvas?: Element }).__janusStoryCanvas === element,
        await canvas.elementHandle(),
      );
      expect(sameCanvas).toBe(true);
    }
  });

  test('honors reduced motion without losing story content', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.locator('.heroSpline')).toHaveCount(0);
    const story = page.getByRole('region', { name: storyName });
    await expect(story.locator('.earthStage')).toHaveAttribute('data-observer-motion', 'reduced');
    await expect(story.getByText('Motion reduced')).toBeVisible();
    await expect(story.getByLabel('Story chapters').getByRole('article')).toHaveCount(18);
    await expect(story.getByText(/Current visual state:/)).toContainText(
      'One known technological world.',
    );
  });

  test('keeps the spatial story usable when WebGL is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function getContext(
        this: HTMLCanvasElement,
        contextId: string,
        options?: unknown,
      ) {
        if (contextId.startsWith('webgl')) return null;
        return originalGetContext.call(this, contextId, options as never);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    await page.goto('/');

    await expect(page.locator('.heroSpline')).toHaveCount(0);
    const story = page.getByRole('region', { name: storyName });
    const steps = story.getByLabel('Story chapters').getByRole('article');
    await steps.nth(0).focus();
    await page.keyboard.press('ArrowDown');

    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
    await expect(story.locator('.stageFallback')).toBeVisible();
    await expect(story.locator('.fallbackFutureWorld')).toHaveCount(10);
    await expect(story.locator('.fallbackFutureWorld').first()).toBeVisible();
  });
});
