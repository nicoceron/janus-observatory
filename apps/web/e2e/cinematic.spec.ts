import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const output = resolve('docs/qa/cinematic-rebuild/browser');

test('chapter menu preserves position and previous/next settle on adjacent steps', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start story', exact: true }).click();
  const summary = page.getByLabel('Choose story chapter');
  await summary.click();
  await page.getByRole('button', { name: 'Chapter 03: Observer', exact: true }).click();
  const stage = page.locator('.storyStage');
  await expect(stage).toHaveAttribute('data-active-step', 'observer-turn');
  await page.waitForTimeout(2000);
  const position = await page.evaluate(() => scrollY);
  await summary.click();
  await expect(page.getByRole('button', { name: /^Chapter / })).toHaveCount(9);
  await expect(stage).toHaveAttribute('data-active-step', 'observer-turn');
  expect(Math.abs((await page.evaluate(() => scrollY)) - position)).toBeLessThan(2);
  await page.keyboard.press('Escape');
  await expect(summary).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Chapter 03: Observer', exact: true }),
  ).toBeHidden();
  await summary.click();
  await page.getByRole('button', { name: 'Chapter 02: Worlds', exact: true }).click();
  await expect(page.locator('#story-step-4')).toHaveAttribute('aria-current', 'step');
  await page.getByRole('button', { name: 'Next story step', exact: true }).click();
  await expect(page.locator('#story-step-5')).toHaveAttribute('aria-current', 'step');
  await page.getByRole('button', { name: 'Previous story step', exact: true }).click();
  await expect(page.locator('#story-step-4')).toHaveAttribute('aria-current', 'step');
});

for (const [name, width, height] of [
  ['desktop', 1440, 900],
  ['portrait', 390, 844],
] as const) {
  test(`${name}: all 31 complete visual states, reverse scrub, and reload`, async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'chromium',
      'The two explicit frame sizes share one deterministic capture run.',
    );
    test.setTimeout(300_000);
    await mkdir(output, { recursive: true });
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const assets: { path: string; bytes: number }[] = [];
    page.on('response', async (response) => {
      if (new URL(response.url()).pathname.startsWith('/assets/')) {
        const bytes = Number(response.headers()['content-length'] ?? 0);
        assets.push({ path: new URL(response.url()).pathname, bytes });
      }
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start story', exact: true }).click();
    const optional = page.getByRole('button', { name: 'Open interactive view' });
    await expect(page.locator('.earthStage')).toHaveAttribute(
      'data-spatial-consent',
      /^(required|granted)$/,
    );
    if ((await page.locator('.earthStage').getAttribute('data-spatial-consent')) === 'required')
      await optional.click();
    await expect(page.locator('.earthStage')).toHaveAttribute('data-render-state', 'ready', {
      timeout: 40_000,
    });
    const steps = page.locator('.storyStep');
    await expect(steps).toHaveCount(31);
    const captures = [];
    for (let index = 0; index < 31; index++) {
      await steps.nth(index).evaluate((element) =>
        element.scrollIntoView({
          behavior: 'instant',
          block: element.getAttribute('data-scroll-anchor') === 'observer' ? 'start' : 'center',
        }),
      );
      await expect(steps.nth(index)).toHaveAttribute('aria-current', 'step');
      await page.waitForTimeout(1350);
      await expect(page.locator('.story')).toHaveAttribute('data-motion-phase', 'settled');
      const stageBox = await page.locator('.storyStage').boundingBox();
      expect(stageBox?.x).toBe(0);
      expect(stageBox?.width).toBe(width);
      const id = await steps.nth(index).getAttribute('data-telemetry-chapter');
      await expect(page.locator('.storyStage')).toHaveAttribute('data-active-step', id!);
      await page.screenshot({
        path: resolve(output, `${name}-${String(index + 1).padStart(2, '0')}.png`),
      });
      captures.push({
        index,
        id,
        scene: await page.locator('.earthStage').getAttribute('data-scene-kind'),
        stageBox,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    for (const progress of [0, 0.25, 0.5, 0.75, 0.95, 0.75, 0.5, 0.25, 0]) {
      await steps.nth(13).evaluate((element, progress) => {
        const bounds = element.getBoundingClientRect();
        scrollTo({
          top:
            scrollY +
            bounds.top -
            innerHeight * 0.1 +
            progress * (bounds.height - innerHeight * 0.96),
          behavior: 'instant',
        });
      }, progress);
      await expect(page.locator('.storyStage')).toHaveAttribute(
        'data-active-step',
        'observer-turn',
      );
      await page.waitForTimeout(500);
      await expect(page.locator('.earthCanvas')).toHaveCSS('opacity', '1');
      await page.screenshot({
        path: resolve(output, `${name}-observer-${String(progress).replace('.', '-')}.png`),
      });
    }
    // Restoration must reconcile from current geometry, not stale intersection ratios.
    await page.reload();
    await expect(page.locator('.storyStage')).toHaveAttribute('data-active-step', 'observer-turn');
    await page.getByRole('button', { name: 'Read without animation', exact: true }).click();
    const paragraph = page.locator('#story-step-1 .storyStepCard > p:not(.storyStepKicker)');
    const normalSize = await paragraph.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    expect(
      await paragraph.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    ).toBeCloseTo(normalSize * 2, 1);
    const overflowingText = await page
      .locator('.storyStepCard, .storyStepCard p, .storyCitation')
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
          })
          .map((element) => element.className),
      );
    expect(overflowingText).toEqual([]);
    await page.locator('#story-step-1').scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(output, `${name}-read-200.png`) });
    expect(errors).toEqual([]);
    await writeFile(
      resolve(output, `${name}-receipt.json`),
      JSON.stringify(
        {
          viewport: { width, height },
          captures,
          errors,
          assets,
          capturedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  });
}

test('the long observer owns its reading line on slow forward and backward scroll', async ({
  page,
}, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start story', exact: true }).click();
  await page.getByLabel('Choose story chapter').click();
  await page.getByRole('button', { name: 'Chapter 03: Observer', exact: true }).click();
  const observer = page.locator('#story-step-14');
  await expect(observer).toHaveAttribute('aria-current', 'step');
  for (const delta of [80, 100, -90, -80]) {
    if (info.project.name === 'mobile-webkit') {
      await page.evaluate((delta) => scrollBy({ top: delta, behavior: 'instant' }), delta);
    } else await page.mouse.wheel(0, delta);
    await expect(page.locator('.storyStage')).toHaveAttribute('data-active-step', 'observer-turn');
  }
  // Method controls clear the optical approach and return on backscroll.
  for (const progress of [0.95, 0]) {
    await observer.evaluate((element, progress) => {
      const bounds = element.getBoundingClientRect();
      scrollTo({
        top:
          scrollY +
          bounds.top -
          innerHeight * 0.1 +
          progress * (bounds.height - innerHeight * 0.96),
        behavior: 'instant',
      });
    }, progress);
    const controls = page.getByRole('region', { name: 'Choose an observing method' });
    if (progress > 0.8) await expect(controls).toBeHidden();
    else await expect(controls).toBeVisible();
  }
});
