import { expect, test, type Locator, type Page } from '@playwright/test';

const storyName = 'Watch one Earth become ten possible worlds.';

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

test('Story renders the reduced-motion Earth through the pinned SwiftShader path', async ({
  page,
}) => {
  await page.goto('/');
  const story = page.getByRole('region', { name: storyName });
  await story.getByRole('button', { name: 'Start story', exact: true }).click();

  const stage = story.locator('.earthStage');
  await expect(stage).toHaveAttribute('data-earth-device-tier', 'medium');
  await expect(stage).toHaveAttribute('data-earth-texture-tier', '2k');
  await expect(stage).toHaveAttribute('data-render-loop', 'demand');
  await expect(stage).toHaveAttribute('data-render-state', 'ready', { timeout: 60_000 });
  await expect(stage).toHaveAttribute('data-scene-kind', 'present');
  await expect(stage.locator('canvas')).toHaveCount(1);
  await expect(story.getByText('Spatial stage ready')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const probe = document.createElement('canvas');
        const context = probe.getContext('webgl2');
        if (!context) return 'unavailable';
        const debug = context.getExtension('WEBGL_debug_renderer_info');
        return String(
          debug
            ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL)
            : context.getParameter(context.RENDERER),
        );
      }),
    )
    .toMatch(/SwiftShader/);
  await settleDocument(page);

  await screenshot(story.locator('.storyStage'), 'story-webgl-earth-ready.png', 120);
});

test('Story preserves its complete structured state when WebGL2 is unavailable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(
      this: HTMLCanvasElement,
      contextId: string,
      ...options: unknown[]
    ) {
      if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') {
        return null;
      }
      return Reflect.apply(originalGetContext, this, [contextId, ...options]) as RenderingContext;
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  await page.goto('/');
  const story = page.getByRole('region', { name: storyName });
  await story.getByRole('button', { name: 'Start story', exact: true }).click();

  const stage = story.locator('.earthStage');
  await expect(stage).toHaveAttribute('data-render-state', 'failed');
  await expect(stage.locator('canvas')).toHaveCount(0);
  await expect(
    stage.getByText(
      'Spatial rendering could not initialize. The complete 2D view remains available.',
    ),
  ).toBeVisible();
  await expect(story.getByText(/Current visual state: One world\. Your pace\./)).toBeAttached();
  await expect(story.getByLabel('Story chapters').getByRole('article')).toHaveCount(31);
  await settleDocument(page);

  await screenshot(story.locator('.storyStage'), 'story-structured-webgl-fallback.png', 40);
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
