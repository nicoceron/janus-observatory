import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { selectionName } from '../apps/web/app/voyage/inspection';
const out = resolve(process.argv[2] ?? 'docs/qa/purposeful-worlds/motion');
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3200';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=metal'] });
const errors: string[] = [],
  captures: unknown[] = [];
const studies = process.env.JANUS_QA_ROADS
  ? [0, 1, 6, 7].map((world) => ({ world, selection: 'Earth', seconds: 5, frames: 7 }))
  : [
      { world: 1, selection: 'Earth', seconds: 4.2, frames: 7 },
      { world: 2, selection: 'Earth', seconds: 4.2, frames: 7 },
      { world: 7, selection: 'Earth', seconds: 4.2, frames: 7 },
      { world: 3, selection: 'animal:deer', seconds: 2.3, frames: 6 },
      { world: 5, selection: 'machine:maintenance-walker', seconds: 2.3, frames: 6 },
      { world: 4, selection: 'animal:bio-ray', seconds: 2.3, frames: 6 },
      { world: 9, selection: 'vessel:sail-barge', seconds: 2.3, frames: 6 },
    ];
try {
  for (const study of studies) {
    const id = 's' + (study.world + 1) + '-' + study.selection.replace(':', '-');
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: resolve(out, 'videos'), size: { width: 1152, height: 720 } },
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base);
    await page.getByRole('button', { name: 'Full', exact: true }).click();
    await expect(page.locator('[data-stage-status]')).toHaveAttribute(
      'data-stage-status',
      'ready',
      { timeout: 45000 },
    );
    await page.getByRole('button', { name: 'Index +', exact: true }).click();
    await page
      .getByRole('button', {
        name: String(study.world + 2).padStart(2, '0') + ' S' + (study.world + 1) + ' ↗',
        exact: true,
      })
      .click();
    await page
      .getByRole('button', { name: 'Explore this world', exact: true })
      .nth(study.world)
      .click();
    if (study.selection !== 'Earth')
      await page
        .getByRole('dialog')
        .getByRole('button', { name: selectionName(study.selection), exact: true })
        .click();
    await expect(page.locator('canvas')).toHaveAttribute('data-inspection', study.selection);
    await page.waitForTimeout(350);
    for (let frame = 0; frame < study.frames; frame++) {
      if (frame) await page.waitForTimeout(study.seconds * 1000);
      const file = id + '-' + frame + '.png';
      await page.screenshot({ path: resolve(out, file) });
      captures.push({
        file,
        world: study.world + 1,
        selection: study.selection,
        frame,
        elapsed: frame * study.seconds,
      });
    }
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Pause motion', exact: true })
      .click();
    await page.waitForTimeout(150);
    const stopped = await page.locator('canvas').screenshot();
    await page.waitForTimeout(350);
    expect(stopped.equals(await page.locator('canvas').screenshot())).toBe(true);
    const video = page.video();
    await context.close();
    await video?.saveAs(resolve(out, id + '.webm'));
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(out, 'capture.json'),
  JSON.stringify(
    {
      base,
      captures,
      errors,
      pauseChecks: studies.length,
      scope:
        'Real-time local Chromium captures. Full-world trips include arrival and task pauses; close-up studies show articulation. Pause checks compare exact canvas pixels.',
    },
    null,
    2,
  ) + '\n',
);
expect(errors).toEqual([]);
console.log(`${captures.length} real-time frames and ${studies.length} pause checks passed.`);
