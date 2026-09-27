import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
const out = resolve(process.argv[2] ?? 'docs/qa/world-explorer/life-motion');
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3200';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=metal'] });
const errors: string[] = [],
  checks: unknown[] = [];
try {
  for (const mobile of [false, true]) {
    const name = mobile ? 'portrait' : 'desktop';
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base);
    await page.getByRole('button', { name: 'Full', exact: true }).click();
    await expect(page.locator('[data-stage-status]')).toHaveAttribute(
      'data-stage-status',
      'ready',
      { timeout: 30000 },
    );
    for (const [i, id, label] of [
      [1, 'vehicle:haul-truck', 'Loaded mine truck'],
      [3, 'animal:deer', 'Woodland deer'],
      [3, 'animal:crane', 'Flying crane'],
      [4, 'animal:bio-ray', 'Biosynthetic glider'],
      [6, 'landmark:watermill', 'Restored watermill'],
      [6, 'landmark:windmill', 'Wind-powered mill'],
      [6, 'vessel:cutter', 'Sailing cutter'],
    ] as const) {
      await page.getByRole('button', { name: 'Index +', exact: true }).click();
      await page
        .getByRole('navigation', { name: 'Story index' })
        .getByRole('button', { name: `${String(i + 2).padStart(2, '0')} S${i + 1} ↗`, exact: true })
        .click();
      if (id.startsWith('vehicle:') || id === 'animal:deer') {
        const canvas = page.locator('canvas');
        const start = await canvas.screenshot();
        await page.waitForTimeout(1300);
        expect(start.equals(await canvas.screenshot())).toBe(false);
        await page.screenshot({ path: resolve(out, `${name}-s${i + 1}-surface.png`) });
      }
      await page
        .locator(`[aria-label="Explore S${i + 1} models"]`)
        .getByRole('button', { name: 'Explore this world', exact: true })
        .click();
      await page.getByRole('dialog').getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator('canvas')).toHaveAttribute('data-inspection', id);
      // The reused canvas resizes from the story viewport into the model pane.
      // Sample the animation only once its drawing-buffer and CSS dimensions agree.
      await expect
        .poll(async () =>
          page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
            const bounds = canvas.getBoundingClientRect();
            return Math.abs(canvas.width / canvas.height - bounds.width / bounds.height);
          }),
        )
        .toBeLessThan(0.01);
      await page.waitForTimeout(180);
      const frames: Buffer[] = [];
      for (let frame = 0; frame < 6; frame++) {
        const image = await page.locator('canvas').screenshot();
        frames.push(image);
        await writeFile(resolve(out, `${name}-${id.replace(':', '-')}-${frame}.png`), image);
        await page.waitForTimeout(180);
      }
      expect(frames[0].equals(frames[5]), id).toBe(false);
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Pause motion', exact: true })
        .click();
      await page.waitForTimeout(160);
      const still = await page.locator('canvas').screenshot();
      await page.waitForTimeout(300);
      expect(still.equals(await page.locator('canvas').screenshot()), id + ' pause').toBe(true);
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Play motion', exact: true })
        .click();
      checks.push({ mobile, id, moving: true, pausedStill: true });
      await page.keyboard.press('Escape');
    }
    await context.close();
  }
  await writeFile(
    resolve(out, 'capture.json'),
    JSON.stringify({ base, checks, errors }, null, 2) + '\n',
  );
  expect(errors).toEqual([]);
} finally {
  await browser.close();
}
