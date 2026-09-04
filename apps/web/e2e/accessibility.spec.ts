import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const axeTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function analyzeStablePage(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await new AxeBuilder({ page }).withTags(axeTags).analyze();
    } catch (error) {
      const wasNavigationRace =
        error instanceof Error &&
        (error.message.includes('Execution context was destroyed') ||
          error.message.includes('window.axe.utils'));

      if (!wasNavigationRace || attempt === 2) {
        throw error;
      }

      await page.waitForLoadState('domcontentloaded');
    }
  }

  throw new Error('Accessibility scan did not complete');
}

const routes = [
  '/observatory?scenario=S9&instrument=deep_space_probes',
  '/atlas?compare=S1,S4,S9',
  '/atlas/s9',
  '/methods',
  '/sources',
  '/accessibility',
  '/research',
  '/research/resilience',
  '/research/concordia',
  '/privacy',
  '/this-route-does-not-exist',
] as const;

for (const route of routes) {
  test(`${route} has no automatically detectable WCAG A/AA violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route);

    const results = await analyzeStablePage(page);

    expect(results.violations).toEqual([]);
  });
}

test('/ guided mode has no automatically detectable WCAG A/AA violations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.story-guided')).toBeVisible();

  const results = await analyzeStablePage(page);

  expect(results.violations).toEqual([]);
});

test('/ reading mode is entered and axe-scanned as the complete article', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await page.getByRole('button', { name: 'Read without animation' }).click();
  await expect(page.locator('.story-reading')).toBeVisible();
  await expect(page.locator('.storySticky')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Return to visual story' })).toBeVisible();
  await expect(page.getByLabel('Story chapters').getByRole('article')).toHaveCount(31);

  const results = await analyzeStablePage(page);

  expect(results.violations).toEqual([]);
});
