import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const session = await page.context().newCDPSession(page);
  await session.send('Profiler.enable');
  for (const route of ['atlas', 'story']) {
    await page.goto('http://localhost:3000/' + (route === 'atlas' ? 'atlas' : ''));
    if (route === 'story') {
      await page.locator('[data-stage-status="ready"]').waitFor();
      await page.getByRole('button', { name: 'Index +', exact: true }).click();
      await page.getByRole('button', { name: '04 S3 ↗', exact: true }).click();
    } else await page.locator('canvas').scrollIntoViewIfNeeded();
    await page.waitForTimeout(3500);
    await session.send('Profiler.start');
    const frames = await page.evaluate(async () => {
      const ticks = [];
      const end = performance.now() + 4000;
      await new Promise((r) => {
        let last = performance.now();
        function f(t) {
          ticks.push(t - last);
          last = t;
          if (t < end) requestAnimationFrame(f);
          else r();
        }
        requestAnimationFrame(f);
      });
      ticks.sort((a, b) => a - b);
      return {
        count: ticks.length,
        p50: ticks[Math.floor(ticks.length * 0.5)],
        p95: ticks[Math.floor(ticks.length * 0.95)],
      };
    });
    const { profile } = await session.send('Profiler.stop');
    const map = new Map(profile.nodes.map((n) => [n.id, n]));
    const samples = new Map();
    profile.samples.forEach((id, i) =>
      samples.set(id, (samples.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)),
    );
    const hot = [...samples]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 35)
      .map(([id, time]) => ({ ms: time / 1000, ...map.get(id).callFrame }));
    await writeFile(
      `docs/qa/navigation-performance/${process.argv[2] ?? 'before'}-${route}.json`,
      JSON.stringify({ frames, hot }, null, 2),
    );
    await writeFile(`tmp/lag/${route}.cpuprofile`, JSON.stringify(profile));
    console.log(route, frames, hot.slice(0, 12));
  }
} finally {
  await browser.close();
}
