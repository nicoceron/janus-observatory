import { chromium, webkit } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
const results = [];
for (const [name, engine, viewport] of [
  ['desktop', chromium, { width: 1440, height: 1000 }],
  ['mobile', webkit, { width: 390, height: 844 }],
]) {
  const browser = await engine.launch();
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const route of [
    '/',
    '/atlas',
    '/atlas/s6',
    '/observatory?scenario=S9&instrument=deep_space_probes',
    '/methods',
    '/sources',
  ]) {
    await page.goto('http://localhost:3000' + route);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    const file = name + '-' + route.split('?')[0].replaceAll('/', '-');
    await page.screenshot({ path: `docs/qa/release-polish/${file}.png` });
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    results.push({
      name,
      route,
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      violations: axe.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
      errors: [...errors],
    });
  }
  await browser.close();
}
await writeFile('docs/qa/release-polish/review.json', JSON.stringify(results, null, 2));
console.log(
  results.map((r) => ({
    route: r.route,
    name: r.name,
    overflow: r.overflow,
    violations: r.violations.map((v) => ({ id: v.id, n: v.nodes.length })),
    errors: r.errors,
  })),
);
