import { expect, test } from '@playwright/test';

const storyName = 'Watch one Earth become ten possible worlds.';

test.describe('guided story', () => {
  test('starts as a scroll story and offers Read and Skip paths', async ({ page }) => {
    await page.goto('/');

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
    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
    await expect(story.locator('.storyStage')).toHaveAttribute(
      'data-active-step',
      'possibility-space',
    );
    await expect(story.locator('.earthStage')).toHaveAttribute('data-scene-kind', 'branches');

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

  test('honors reduced motion without losing story content', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const story = page.getByRole('region', { name: storyName });
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
