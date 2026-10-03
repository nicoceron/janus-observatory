import { expect, test } from '@playwright/test';

test('anchor travel is interruptible, lands accurately and survives browser history', async ({
  page,
}, info) => {
  await page.clock.install();
  await page.goto('/');
  const root = page.locator('[data-voyage]');
  await expect(page.locator('canvas')).toHaveAttribute('data-planet-state', 'ready', {
    timeout: 60000,
  });
  await expect(page.locator('[data-space-backdrop]')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  const jump = async (label: string) => {
    await page.getByRole('button', { name: 'Index +', exact: true }).click();
    await page.getByRole('button', { name: label, exact: true }).click();
  };
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  // Hold the tween while sending input so a slow software renderer cannot
  // complete the trip between the moving assertion and the interrupt gesture.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60_000));
  await page.getByRole('button', { name: '04 S3 ↗', exact: true }).click();
  await expect(root).toHaveAttribute('data-anchor-travel', 'moving');
  if (info.project.name === 'chromium') await page.mouse.wheel(0, 150);
  else await page.evaluate(() => window.dispatchEvent(new Event('touchstart')));
  await expect(root).toHaveAttribute('data-anchor-travel', 'idle');
  expect(await page.evaluate(() => location.hash)).toBe('');
  await page.clock.resume();
  await jump('04 S3 ↗');
  await expect(page).toHaveURL(/#s3$/);
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', '4.000');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('s3');
  await jump('06 S5 ↗');
  await expect(page).toHaveURL(/#s5$/);
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', '6.000');
  await page.goBack();
  await expect(page).toHaveURL(/#s3$/);
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', '4.000');
  await expect
    .poll(async () =>
      Number(await page.locator('[data-space-backdrop]').getAttribute('data-sky-progress')),
    )
    .toBeCloseTo(4, 2);
  await page.goBack();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', '0.000');
});

test('deep links align portraits after reload and reduced motion skips anchor tweening', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#s5');
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', '6.000', { timeout: 60000 });
  await page.reload();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', '6.000', { timeout: 60000 });
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page.getByRole('button', { name: '02 S1 ↗', exact: true }).click();
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-anchor-travel', 'idle');
  await expect(page).toHaveURL(/#s1$/);
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', '2.000');
});

test('native scrolling settles near a portrait and releases it on the next gesture', async ({
  page,
}, info) => {
  await page.goto('/#s3');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', '4.000', { timeout: 60000 });
  const anchor = await page.evaluate(() => scrollY);
  const gesture = async (delta: number) => {
    if (info.project.name === 'chromium') {
      await page.mouse.move(200, 300);
      await page.mouse.wheel(0, delta);
    } else {
      await page.evaluate((d) => {
        window.dispatchEvent(new Event('touchstart'));
        scrollBy({ top: d, behavior: 'instant' });
        window.dispatchEvent(new Event('touchend'));
      }, delta);
    }
  };
  // Approach from outside the release radius, then stop inside the capture zone.
  await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), anchor - 650);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(anchor - 650, 0);
  await gesture(470);
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-anchor-travel', 'settling');
  await expect(canvas).toHaveAttribute('data-scene', '4.000');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(anchor, 0);
  // Passive settling must not push history or steal focus.
  await expect(page).toHaveURL(/#s3$/);
  await gesture(120);
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(anchor + 100);
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-anchor-travel', 'idle');
  await expect(page.locator('[data-space-galaxy]')).toBeVisible();
});

test('reduced motion does not magnetize native scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#s3');
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', '4.000', { timeout: 60000 });
  const y = await page.evaluate(() => scrollY);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('wheel'));
    scrollBy({ top: -140, behavior: 'instant' });
  });
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(y - 140, 0);
});

test('held touch defers settling and fresh input cancels an active settle', async ({ page }) => {
  await page.goto('/#s3');
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', '4.000', { timeout: 60000 });
  const anchor = await page.evaluate(() => scrollY);
  await page.evaluate((y) => scrollTo({ top: y - 650, behavior: 'instant' }), anchor);
  await expect
    .poll(async () => Number(await page.locator('canvas').getAttribute('data-scene')))
    .toBeLessThan(3.9);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('touchstart'));
    scrollBy({ top: 470, behavior: 'instant' });
  });
  await page.waitForTimeout(450);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(anchor - 180, 0);
  await page.evaluate(() => window.dispatchEvent(new Event('touchend')));
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-anchor-travel', 'settling');
  await page.evaluate(() => window.dispatchEvent(new Event('wheel')));
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-anchor-travel', 'idle');
  await page.keyboard.press('Escape');
});
