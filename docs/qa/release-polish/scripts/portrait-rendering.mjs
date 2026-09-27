import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    window.__portraitDraws = 0;
    for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
      for (const name of [
        'drawArrays',
        'drawElements',
        'drawArraysInstanced',
        'drawElementsInstanced',
      ]) {
        const original = type.prototype[name];
        if (!original) continue;
        type.prototype[name] = function (...args) {
          window.__portraitDraws++;
          return original.apply(this, args);
        };
      }
    }
  });
  await page.goto((process.env.BASE_URL ?? 'http://localhost:3000') + '/atlas');
  const canvas = page.locator('canvas');
  await canvas.waitFor();
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  async function draws() {
    const start = await page.evaluate(() => window.__portraitDraws);
    await page.waitForTimeout(1000);
    return await page.evaluate((start) => window.__portraitDraws - start, start);
  }
  const visible = await draws();
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(1200);
  const offscreen = await draws();
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const resumed = await draws();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(1200);
  const reduced = await draws();
  const report = {
    visibleDrawsPerSecond: visible,
    offscreenDrawsPerSecond: offscreen,
    resumedDrawsPerSecond: resumed,
    reducedMotionDrawsPerSecond: reduced,
    canvasCount: await canvas.count(),
  };
  await writeFile(
    'docs/qa/release-polish/portrait-rendering.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(report);
  if (visible === 0 || offscreen !== 0 || resumed === 0 || reduced !== 0)
    throw Error('Portrait render parking failed');
} finally {
  await browser.close();
}
