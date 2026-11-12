import { expect, test, type Locator, type Page } from '@playwright/test';

const motionStorageKey = 'janus-motion-preference';

/** One animation frame of the paused clock, in milliseconds. */
const frame = 16;
/**
 * Frames drawn between the stage's first frame and the opening capture (1.6 s of story time):
 * long enough for the hero copy's entrance to finish, and always the same, so the slowly turning
 * star field is captured at one fixed moment.
 */
const openingFrames = 100;

const savedMotionPreference = (page: Page) =>
  page.evaluate((key) => window.localStorage.getItem(key), motionStorageKey);

/**
 * Select reduced motion the way a reader does since Decision 023: with the Motion control on the
 * accessibility page, which saves the choice for every research page. The homepage has no such
 * control and always runs in full motion.
 */
async function chooseReducedMotion(page: Page) {
  await page.goto('/accessibility');
  const html = page.locator('html');
  // The attribute appears once the control has hydrated and applied the saved preference.
  await expect(html).toHaveAttribute('data-motion', /^(system|reduced|full)$/);
  const reduced = page
    .getByRole('group', { name: 'Animation amount' })
    .getByRole('button', { name: 'Reduced', exact: true });
  await reduced.click();
  await expect(reduced).toHaveAttribute('aria-pressed', 'true');
  await expect(html).toHaveAttribute('data-motion', 'reduced');
  expect(await savedMotionPreference(page)).toBe('reduced');
}

/** Decision 023: the homepage ignores the reader's reduced-motion choice but does not erase it. */
async function expectHomepageMotionPolicy(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  await expect(page.getByLabel('Motion preference')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Read without animation' })).toHaveCount(0);
  expect(await savedMotionPreference(page)).toBe('reduced');
}

/** Draw `count` frames of the paused clock, one browser task at a time as a real page would. */
async function advanceFrames(page: Page, count: number) {
  for (let drawn = 0; drawn < count; drawn++) await page.clock.runFor(frame);
}

async function nextPaint(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

/**
 * Remove what would differ between two captures of the same state: pending font loads, focus
 * rings, and running transitions. The fixed site header is hidden for captures of a section,
 * where it would otherwise be painted across the section wherever the viewport happens to sit.
 */
async function settleDocument(page: Page, { hideHeader }: { hideHeader: boolean }) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
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
      a[href='#content'], nextjs-portal${hideHeader ? ', [data-site-header]' : ''} {
        visibility: hidden !important;
      }
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
  await chooseReducedMotion(page);
});

test('First light keeps its opening composition at a fixed story time', async ({ page }) => {
  // The homepage always animates (Decision 023), so there is no reduced-motion composition to
  // compare. The clock is paused instead and advanced one frame at a time, which makes the
  // capture a fixed moment of the full-motion story rather than whatever a slow machine reached.
  const start = new Date('2026-11-12T12:00:00Z');
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto('/');

  const stage = page.locator('[data-stage-status]');
  const canvas = stage.locator('canvas');
  // The stage writes this attribute while drawing a frame, so it marks the first frame exactly.
  const drawn = stage.locator('canvas[data-optical-view]');
  let waited = 0;
  while ((await drawn.count()) === 0) {
    expect(waited++, 'the stage should draw its first frame').toBeLessThan(600);
    await advanceFrames(page, 1);
  }
  await advanceFrames(page, openingFrames);

  await expect(stage).toHaveAttribute('data-stage-status', 'ready');
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-mode', 'full');
  await expectHomepageMotionPolicy(page);
  // The opening Earth is built from the core kit pack, not a loading state.
  await expect(canvas).toHaveAttribute('data-planet-state', 'ready');
  await expect(canvas).toHaveAttribute('data-planet-models', /"world:present"/);
  // The hero copy's entrance has finished and released its temporary transform and opacity.
  expect(
    await page.locator('[data-chapter="0"] [data-intro]').evaluateAll(
      (elements) =>
        elements.length > 0 &&
        elements.every((element) => {
          const style = (element as HTMLElement).style;
          return style.transform === '' && style.opacity === '';
        }),
    ),
    'the hero entrance should have finished',
  ).toBe(true);

  // A world's sway, clouds and satellites advance with every frame drawn since it was built, and
  // that count depends on when its pack arrived. For the capture only, the site's own
  // motion-change event asks every world to hold its authored rest pose. This is a capture
  // device: the homepage offers no such state, as asserted above.
  await page.evaluate(() => {
    document.documentElement.dataset.motion = 'reduced';
    window.dispatchEvent(new CustomEvent('janus:motion-change'));
  });
  await advanceFrames(page, 4);
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-mode', 'full');

  await settleDocument(page, { hideHeader: false });
  await screenshot(page.locator('[data-chapter="0"]'), 'first-light-earth.png', 120);
});

test('The complete story remains legible as an article when WebGL is unavailable', async ({
  page,
}) => {
  // Decision 023 removed the "Read without animation" button. The article presentation is now
  // what a reader gets when the 3D stage cannot start.
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

  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-mode', 'reading');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute(
    'data-stage-status',
    'fallback',
  );
  await expect(page.locator('[data-chapter]')).toHaveCount(17);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expectHomepageMotionPolicy(page);
  await nextPaint(page);
  await settleDocument(page, { hideHeader: true });

  await screenshot(page.locator('[data-chapter="2"]'), 'first-light-reading-s1.png', 60);
});

test.describe('Research sections, each whole in one viewport', () => {
  // Both sections are taller than the suite's 1000 px viewport. Captured there, the page's fixed
  // star backdrop would be painted across only the part of the section the viewport covers.
  test.use({ viewport: { width: 1440, height: 2000 } });

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
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await nextPaint(page);
    await settleDocument(page, { hideHeader: true });

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
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await nextPaint(page);
    await settleDocument(page, { hideHeader: true });

    await screenshot(analysis, 'atlas-categorical-observing-matrix.png', 60);
  });
});
