import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3000/');
await page.locator('[data-stage-status="ready"]').waitFor({ timeout: 60000 });
await page.getByRole('button', { name: 'Index +', exact: true }).click();
await page.getByRole('button', { name: '04 S3 ↗', exact: true }).click();
await page.waitForTimeout(1500);
const stats = await page.evaluate(async () => {
  const canvas = document.querySelector('canvas');
  let mutations = 0,
    frames = 0;
  const deltas = [];
  const observer = new MutationObserver((records) => (mutations += records.length));
  observer.observe(canvas, { attributes: true });
  const start = performance.now();
  let last = start;
  await new Promise((resolve) => {
    function frame(t) {
      deltas.push(t - last);
      last = t;
      frames++;
      if (t - start < 2500) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
  observer.disconnect();
  deltas.sort((a, b) => a - b);
  return {
    mutations,
    frames,
    medianFrameMs: deltas[Math.floor(deltas.length * 0.5)],
    p95FrameMs: deltas[Math.floor(deltas.length * 0.95)],
    canvasCount: document.querySelectorAll('canvas').length,
    cacheBytes: canvas.dataset.blenderCacheBytes,
  };
});
await writeFile(
  `docs/qa/release-polish/${process.argv[2] ?? 'baseline'}-performance.json`,
  JSON.stringify(stats, null, 2),
);
console.log(stats);
await browser.close();
