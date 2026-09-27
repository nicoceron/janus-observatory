import { chromium, webkit } from '@playwright/test';
for (const [name, engine, viewport] of [
  ['desktop', chromium, { width: 1440, height: 1000 }],
  ['mobile', webkit, { width: 390, height: 844 }],
]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport });
    for (const route of ['/', '/atlas', '/observatory']) {
      await page.goto('http://localhost:3000' + route);
      await page.evaluate(() => document.fonts.ready);
      if (route === '/') await page.locator('[data-stage-status="ready"]').waitFor();
      else await page.locator('canvas').waitFor();
      await page.screenshot({
        path: `docs/qa/navigation-performance/${name}-${route === '/' ? 'story' : route.slice(1)}.png`,
      });
    }
    if (name === 'desktop') {
      await page.goto('http://localhost:3000/');
      await page.locator('[data-stage-status="ready"]').waitFor();
      await page.getByRole('button', { name: 'Index +', exact: true }).click();
      await page.getByRole('button', { name: '01 Ten possible worlds ↗', exact: true }).click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'docs/qa/navigation-performance/overview.png' });
    }
  } finally {
    await browser.close();
  }
}
