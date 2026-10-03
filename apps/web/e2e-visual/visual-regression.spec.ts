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

async function settleDocument(page: Page, motion = 'reduced', pausedClock = false) {
  await page.evaluate(() => document.fonts.ready);
  if (pausedClock) await page.clock.runFor(32);
  else
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await expect(page.locator('html')).toHaveAttribute('data-motion', motion);
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
      [data-site-header],
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

test('First light preserves the approved full-motion composition at a paused frame', async ({
  page,
}) => {
  // Decision 023 keeps the homepage in full motion while preserving the saved
  // research-page preference. Playwright's clock freezes the visual test only.
  const start = new Date('2026-09-14T12:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto('/');
  await expect
    .poll(
      async () => {
        await page.clock.runFor(16);
        return page.locator('[data-stage-status]').getAttribute('data-stage-status');
      },
      { timeout: 60000 },
    )
    .toBe('ready');
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-mode', 'full');
  await expect(page.getByRole('button', { name: 'Read without animation' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('janus-motion-preference'))).toBe(
    'reduced',
  );
  await settleDocument(page, 'full', true);
  await screenshot(page.locator('[data-chapter="0"]'), 'first-light-earth.png', 120);
});

test('The complete story remains legible as an article when WebGL is unavailable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes('webgl')) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('[data-mode="reading"]')).toBeVisible();
  await expect(page.locator('[data-chapter]')).toHaveCount(17);
  await expect(page.locator('canvas')).toHaveCount(0);
  await settleDocument(page, 'full');
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
