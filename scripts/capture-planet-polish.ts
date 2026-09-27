import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const out = resolve(process.argv[2] ?? 'docs/qa/planet-polish-2026-09-20/after');
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=metal'] });
const mobile = process.env.JANUS_QA_MOBILE === '1';
const page = await browser.newPage({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
  deviceScaleFactor: mobile ? 3 : 1,
  isMobile: mobile,
  hasTouch: mobile,
});
const errors: string[] = [];
const receipts: unknown[] = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(base);
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-blender-state', 'ready', { timeout: 60000 });
  const frames = Number(process.env.JANUS_QA_FRAMES ?? 5);
  const frameInterval = Number(process.env.JANUS_QA_FRAME_INTERVAL ?? 2500);
  for (let i = 0; i < frames; i++) {
    await page.screenshot({ path: resolve(out, `origin-motion-${i}.png`) });
    await page.waitForTimeout(frameInterval);
  }
  const cadence = await page.evaluate(`(async () => {
    const intervals = [];
    let previous = 0;
    await new Promise((resolve) => {
      const started = performance.now();
      const frame = (now) => {
        if (previous) intervals.push(now - previous);
        previous = now;
        if (now - started < 6000) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    intervals.sort((a, b) => a - b);
    const canvas = document.querySelector('canvas');
    return {
      samples: intervals.length,
      medianMs: intervals[Math.floor(intervals.length * 0.5)],
      p95Ms: intervals[Math.floor(intervals.length * 0.95)],
      framesOver50Ms: intervals.filter((n) => n > 50).length,
      buffer: [canvas.width, canvas.height],
      css: [canvas.clientWidth, canvas.clientHeight],
      devicePixelRatio,
      renderer: { ...canvas.dataset },
    };
  })()`);
  for (let world = 1; world <= 10; world++) {
    if (
      process.env.JANUS_QA_WORLDS &&
      !process.env.JANUS_QA_WORLDS.split(',').includes(String(world))
    )
      continue;
    await page.getByRole('button', { name: 'Index +', exact: true }).click();
    await page
      .getByRole('button', {
        name: `${String(world + 1).padStart(2, '0')} S${world} ↗`,
        exact: true,
      })
      .click();
    await expect(canvas).toHaveAttribute('data-scene', `${world + 1}.000`, { timeout: 15000 });
    await page
      .getByLabel(`Explore S${world} models`, { exact: true })
      .getByRole('button', { name: 'Inspect Earth', exact: true })
      .click();
    await expect(canvas).toHaveAttribute('data-blender-state', 'ready', { timeout: 60000 });
    await page.waitForTimeout(800);

    await page.screenshot({ path: resolve(out, `s${world}-earth.png`) });
    receipts.push(await canvas.evaluate((el) => ({ ...el.dataset })));
    if (process.env.JANUS_QA_ALL_BODIES === '1') {
      const labels = await page.getByRole('dialog').getByRole('button').allTextContents();
      for (const name of [
        'Luna',
        'Mars',
        'Venus',
        'Asteroid works',
        'Outer settlements',
        'Kuiper outpost',
        'Solar collectors',
      ]) {
        if (!labels.some((text) => text.trim().startsWith(name))) continue;
        await page
          .getByRole('dialog')
          .getByRole('navigation', { name: 'Select a world' })
          .getByRole('button', { name: new RegExp('^' + name) })
          .click();
        await expect(canvas).toHaveAttribute('data-blender-state', 'ready', { timeout: 60000 });
        await page.waitForTimeout(400);
        await page.screenshot({ path: resolve(out, `s${world}-${name.replaceAll(' ', '-')}.png`) });
        receipts.push(await canvas.evaluate((el) => ({ ...el.dataset })));
      }
    }
    await page.getByRole('button', { name: 'Close world explorer', exact: true }).click();
  }
  await writeFile(
    resolve(out, 'receipt.json'),
    JSON.stringify({ base, mobile, cadence, errors, receipts }, null, 2),
  );
  expect(errors).toEqual([]);
} finally {
  await browser.close();
}
