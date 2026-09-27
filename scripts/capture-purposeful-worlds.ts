import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { worlds } from '../apps/web/app/voyage/worlds';
import { lifePlans } from '../apps/web/app/voyage/life-plan';
import { selectionName } from '../apps/web/app/voyage/inspection';
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3200';
const out = resolve(process.argv[2] ?? 'docs/qa/purposeful-worlds/views');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=metal'] });
const errors: string[] = [],
  images: string[] = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      reducedMotion: 'reduce',
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto(base);
    await expect(page.locator('[data-stage-status]')).toHaveAttribute(
      'data-stage-status',
      'ready',
      { timeout: 45000 },
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    const capture = async (id: string) => {
      const file = (mobile ? 'portrait' : 'desktop') + '-' + id + '.png';
      await page.screenshot({ path: resolve(out, file) });
      images.push(file);
    };
    await capture('origin');
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: 'Index +', exact: true }).click();
      await page
        .getByRole('button', {
          name: String(i + 2).padStart(2, '0') + ' S' + (i + 1) + ' ↗',
          exact: true,
        })
        .click();
      await expect(page.locator('canvas')).toHaveAttribute('data-scene', (i + 2).toFixed(3));
      // The canvas grows back from the inspector before R3F updates its projection.
      await expect
        .poll(async () => (await page.locator('canvas').boundingBox())?.height)
        .toBe(page.viewportSize()!.height);
      await page.waitForTimeout(350);
      await capture('s' + (i + 1) + '-story');
      await page.getByRole('button', { name: 'Explore this world', exact: true }).nth(i).click();
      const dialog = page.getByRole('dialog');
      await expect(page.locator('canvas')).toHaveAttribute('data-inspection', 'Earth');
      await page.waitForTimeout(300);
      await capture('s' + (i + 1) + '-Earth');
      for (const job of lifePlans[worlds[i].form]) {
        const id = job.subject.type + ':' + job.subject.kind;
        await dialog.getByRole('button', { name: selectionName(id), exact: true }).click();
        await expect(page.locator('canvas')).toHaveAttribute('data-inspection', id);
        await page.waitForTimeout(200);
        await capture('s' + (i + 1) + '-' + job.subject.kind);
        const frozen = await page.locator('canvas').screenshot();
        await page.waitForTimeout(180);
        expect(frozen.equals(await page.locator('canvas').screenshot())).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await dialog.getByRole('button', { name: 'Close world explorer', exact: true }).click();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(out, 'capture.json'),
  JSON.stringify({ base, images, errors }, null, 2) + '\n',
);
expect(errors).toEqual([]);
console.log(
  images.length + ' captures, no runtime errors, every activity freezes under reduced motion.',
);
