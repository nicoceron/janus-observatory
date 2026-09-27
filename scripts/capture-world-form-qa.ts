import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { chapters } from '../apps/web/app/voyage/worlds';

const output = resolve(process.argv[2] ?? 'docs/qa/low-poly/forms');
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3200';
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=metal'] });
const errors: string[] = [];
const images: string[] = [];
await mkdir(output, { recursive: true });
try {
  for (const mobile of [false, true]) {
    const name = mobile ? 'portrait' : 'desktop';
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('request', (request) => {
      if (/earth-(day|night|bump)/.test(request.url()))
        errors.push('Legacy Earth map requested: ' + request.url());
    });
    await page.goto(baseURL);
    await expect(page.locator('[data-stage-status]')).toHaveAttribute(
      'data-stage-status',
      'ready',
      { timeout: 30000 },
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1800);
    for (const chapter of chapters.filter((entry) => entry.index < 14)) {
      await page.getByRole('button', { name: 'Index +', exact: true }).click();
      await page
        .getByRole('navigation', { name: 'Story index' })
        .getByRole('button', {
          name: String(chapter.index).padStart(2, '0') + ' ' + chapter.label + ' ↗',
          exact: true,
        })
        .click();
      await expect(page.locator('canvas')).toHaveAttribute('data-scene', chapter.index.toFixed(3));
      const filename = name + '-' + chapter.id + '.png';
      await page.screenshot({ path: resolve(output, filename) });
      images.push(filename);
      if (!mobile && chapter.index === 0)
        await page
          .locator('canvas')
          .screenshot({ path: resolve(output, 'origin-canvas.png'), omitBackground: true });
      if (chapter.id === 'invisible') {
        await expect(page.locator('canvas')).toHaveAttribute('data-optical-view', 'eyepiece');
        await page.getByRole('link', { name: 'Step back from the eyepiece', exact: true }).click();
        await expect(page.locator('canvas')).toHaveAttribute('data-optical-view', 'exterior');
        await page.getByRole('link', { name: 'Look through the telescope', exact: true }).click();
        await expect(page.locator('canvas')).toHaveAttribute('data-optical-view', 'eyepiece');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await context.close();
  }
  await writeFile(
    resolve(output, 'capture.json'),
    JSON.stringify({ baseURL, images, errors, checkedAt: new Date().toISOString() }, null, 2) +
      '\n',
  );
  expect(errors).toEqual([]);
} finally {
  await browser.close();
}
