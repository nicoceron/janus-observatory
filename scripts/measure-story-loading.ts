import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=metal'] });
const output = resolve(process.argv[2] ?? 'docs/qa/refinement/loading.json');
await mkdir(resolve(output, '..'), { recursive: true });
const results = [];
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const started = Date.now();
  await page.goto(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000/', {
    waitUntil: 'domcontentloaded',
  });
  await page.getByRole('button', { name: 'Start story', exact: true }).waitFor();
  const articleMs = Date.now() - started;
  const clickAt = Date.now();
  await page.getByRole('button', { name: 'Start story', exact: true }).click();
  await page.locator('.earthStage[data-render-state]').waitFor();
  const optIn = page.getByRole('button', { name: 'Open interactive view', exact: true });
  if (await optIn.isVisible()) await optIn.click();
  await page.locator('.earthStage[data-render-state="ready"]').waitFor({ timeout: 90000 });
  const spatialMs = Date.now() - clickAt;
  const observerAt = Date.now();
  await page
    .locator('#story-step-14')
    .evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await page.locator('.storyStage[data-active-step="observer-turn"]').waitFor();
  await page.locator('.observerPoster').waitFor({ state: 'hidden', timeout: 90000 });
  const observerMs = Date.now() - observerAt;
  await page.waitForTimeout(1500);
  await page.screenshot({ path: output.replace('.json', `-${width}.png`) });
  const resources = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => {
      const resource = entry as PerformanceResourceTiming;
      return {
        name: new URL(resource.name).pathname,
        duration: Math.round(resource.duration),
        bytes: resource.transferSize,
      };
    }),
  );
  results.push({ width, articleMs, spatialMs, observerMs, errors, resources });
  await page.close();
}
await writeFile(
  output,
  JSON.stringify(
    {
      baseUrl: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000/',
      scope:
        'Cold browser contexts; local network; unthrottled Apple Metal. Not physical-phone or field CWV.',
      results,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    results.map(({ resources, ...result }) => ({
      ...result,
      bytes: resources.reduce((sum, resource) => sum + resource.bytes, 0),
      longest: resources.toSorted((a, b) => b.duration - a.duration).slice(0, 5),
    })),
    null,
    2,
  ),
);
await browser.close();
