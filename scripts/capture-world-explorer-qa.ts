import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { allScenarioProfiles } from '../apps/web/lib/canonical-core';
import { systemPortrait } from '../apps/web/lib/system-portrait';
import {
  objectSelections,
  selectionName,
  systemSelections,
} from '../apps/web/app/voyage/inspection';
const out = resolve(process.argv[2] ?? 'docs/qa/world-explorer/inspection');
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3200';
const quick = process.argv.includes('--quick');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=metal'] });
const errors: string[] = [],
  images: string[] = [],
  checks: unknown[] = [];
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
    await page.goto(base);
    await expect(page.locator('[data-stage-status]')).toHaveAttribute(
      'data-stage-status',
      'ready',
      { timeout: 45000 },
    );
    const canvas = await page.locator('canvas').elementHandle();
    for (const i of quick ? [0, 3, 4, 6, 9] : Array.from({ length: 10 }, (_, i) => i)) {
      await page.getByRole('button', { name: 'Index +', exact: true }).click();
      await page
        .getByRole('navigation', { name: 'Story index' })
        .getByRole('button', { name: `${String(i + 2).padStart(2, '0')} S${i + 1} ↗`, exact: true })
        .click();
      const trigger = page
        .locator(`[aria-label="Explore S${i + 1} models"]`)
        .getByRole('button', { name: 'Explore this world' });
      await trigger.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const system = systemPortrait(allScenarioProfiles[i]).art;
      const selections = quick
        ? [
            'Earth',
            ...(i === 0
              ? ['Moon', 'lunar-base']
              : i === 3
                ? ['animal:deer', 'vessel:canoe']
                : i === 4
                  ? ['Mars', 'Venus', 'aerostat', 'animal:bio-ray']
                  : i === 6
                    ? ['vessel:cutter', 'vehicle:cargo-cycle']
                    : ['orbital-habitat']),
          ]
        : [
            ...systemSelections(system).flatMap((id) => {
              const body = system.bodies.find((b) => b.body === id);
              const child = body
                ? body.activity === 'orbital'
                  ? i === 8
                    ? 'machine-station'
                    : 'orbital-habitat'
                  : i === 8
                    ? 'machine-facility'
                    : id === 'Moon'
                      ? 'lunar-base'
                      : id === 'Mars'
                        ? 'mars-base'
                        : 'aerostat'
                : null;
              return child ? [id, child] : [id];
            }),
            ...objectSelections(i),
          ];
      for (const id of selections) {
        const direct = dialog.getByRole('button', { name: selectionName(id), exact: true });
        if (await direct.count()) await direct.click();
        else
          await dialog
            .getByRole('button', {
              name: `Inspect ${selectionName(id).toLowerCase()} ↗`,
              exact: true,
            })
            .click();
        await expect(page.locator('canvas')).toHaveAttribute('data-inspection', id);
        await page.waitForTimeout(120);
        const file = `${mobile ? 'portrait' : 'desktop'}-s${i + 1}-${id.replace(':', '-')}.png`;
        await page.screenshot({ path: resolve(out, file) });
        images.push(file);
        expect(await canvas?.evaluate((el) => el === document.querySelector('canvas'))).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
      const before = await page.locator('canvas').screenshot();
      await dialog.getByRole('button', { name: 'Rotate model right', exact: true }).click();
      expect(before.equals(await page.locator('canvas').screenshot())).toBe(false);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(page.locator('canvas')).toHaveAttribute('data-scene', `${i + 2}.000`);
      checks.push({
        world: i + 1,
        mobile,
        models: selections.length,
        oneCanvas: true,
        escapeRestoresFocus: true,
        viewControl: true,
      });
    }
    await context.close();
  }
  await writeFile(
    resolve(out, 'capture.json'),
    JSON.stringify({ base, images, errors, checks }, null, 2) + '\n',
  );
  expect(errors).toEqual([]);
} finally {
  await browser.close();
}
