import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { allScenarioProfiles } from '../apps/web/lib/canonical-core';
import { systemPortrait } from '../apps/web/lib/system-portrait';
import { selectionName, systemSelections } from '../apps/web/app/voyage/inspection';

const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3200';
const out = resolve(process.argv[2] ?? 'docs/qa/connected-worlds/views');
const selected = process.env.JANUS_QA_SCENARIOS?.split(',').map(Number);
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
    await page.goto(base);
    await expect(page.locator('[data-stage-status]')).toHaveAttribute(
      'data-stage-status',
      'ready',
      { timeout: 45000 },
    );
    await page.evaluate(() => document.fonts.ready);
    for (let i = 0; i < 10; i++) {
      if (selected && !selected.includes(i + 1)) continue;
      await page.getByRole('button', { name: 'Index +', exact: true }).click();
      await page
        .getByRole('button', { name: `${String(i + 2).padStart(2, '0')} S${i + 1} ↗`, exact: true })
        .click();
      await expect(page.locator('canvas')).toHaveAttribute('data-scene', `${i + 2}.000`);
      const region = page.getByLabel(`Explore S${i + 1} models`, { exact: true });
      const ids = process.env.JANUS_QA_EARTH_ONLY
        ? ['Earth']
        : systemSelections(systemPortrait(allScenarioProfiles[i]).art);
      for (const id of ids) {
        if (id !== 'Earth')
          await region
            .getByRole('navigation')
            .getByRole('button', { name: selectionName(id), exact: true })
            .click();
        await expect(page.locator('canvas')).toHaveAttribute('data-story-body', id);
        await page.waitForTimeout(400);
        const file = `${mobile ? 'portrait' : 'desktop'}-s${i + 1}-${id}.png`;
        await page.screenshot({ path: resolve(out, file) });
        images.push(file);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const frozen = await page.locator('canvas').screenshot();
      await page.waitForTimeout(180);
      expect(frozen.equals(await page.locator('canvas').screenshot())).toBe(true);
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
  `${images.length} story portraits captured; no page errors, no horizontal overflow, reduced-motion canvas remains still.`,
);
