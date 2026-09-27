import { expect, test, type Locator, type Page } from '@playwright/test';

async function installDeterministicClientState(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('janus-motion-preference', 'reduced');
    Object.defineProperty(window.navigator, 'deviceMemory', {
      configurable: true,
      get: () => 8,
    });
    Object.defineProperty(window.navigator, 'hardwareConcurrency', {
      configurable: true,
      get: () => 8,
    });
  });
}

async function settleDocument(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded');
  await page.addStyleTag({
    content: `
      html { scroll-behavior: auto !important; }
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
      a[href='#content'], a[href='#main-content'],
      aside[aria-label='Motion preference'],
      nav[aria-label='Primary navigation'],
      nextjs-portal { visibility: hidden !important; }
    `,
  });
}

async function screenshot(locator: Locator, name: string, maxDiffPixels = 120) {
  await expect(locator).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixels,
    scale: 'css',
    threshold: 0.1,
  });
}

test.beforeEach(async ({ page }) => {
  await installDeterministicClientState(page);
});

test('First light preserves the reduced-motion composition', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready', {
    timeout: 60000,
  });
  await settleDocument(page);
  await screenshot(page.locator('[data-chapter="0"]'), 'first-light-earth.png', 120);
});

test('The complete story remains legible as an article', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Read without animation' }).click();
  await expect(page.locator('[data-mode="reading"]')).toBeVisible();
  await settleDocument(page);
  await screenshot(page.locator('[data-chapter="2"]'), 'first-light-reading-s1.png', 60);
});

test('Observatory preserves all fourteen independently scaled atmosphere rows', async ({
  page,
}) => {
  await page.goto('/observatory?scenario=S9&instrument=deep_space_probes');
  const atmosphere = page.getByRole('region', {
    name: 'One atmosphere. Fourteen separate measures.',
  });
  const chart = page.getByRole('img', { name: 'Atmospheric fingerprint for S9' });

  await expect(atmosphere).toBeVisible();
  await expect(chart).toBeVisible();
  await expect(chart.getByRole('group')).toHaveCount(14);
  await expect(atmosphere).toContainText('Not listed in Table 1');
  await settleDocument(page);

  await screenshot(atmosphere, 'observatory-s9-atmosphere-fingerprint.png', 40);
});

test('Atlas keeps all five categorical mission cells separate for every scenario', async ({
  page,
}) => {
  await page.goto('/atlas?compare=S1,S4,S9&lens=observability');
  const analysis = page.getByRole('region', { name: 'One dimension at a time.' });

  await expect(analysis.getByRole('button', { name: 'Observing matrix' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    analysis.getByRole('heading', { name: 'Five mission cells, kept separate' }),
  ).toBeVisible();
  await expect(analysis.locator('[class*="missionCells"]')).toHaveCount(10);
  await expect(analysis.locator('[class*="missionCell"][data-state]')).toHaveCount(50);
  await expect(analysis).not.toContainText('Count of filled Figure 6 cells');
  await settleDocument(page);

  await screenshot(analysis, 'atlas-categorical-observing-matrix.png', 60);
});
