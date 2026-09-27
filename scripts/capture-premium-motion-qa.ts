import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect, type Page } from '@playwright/test';
import { chapters } from '../apps/web/app/voyage/worlds';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3200';
const outputRoot = resolve(process.argv[2] ?? 'docs/qa/low-poly/motion');
const hardwareGpu = process.env.JANUS_QA_HARDWARE_GPU === '1';
const issues: { kind: string; detail: string }[] = [];
const captures: unknown[] = [];
const cadence: unknown[] = [];

async function jump(page: Page, id: string) {
  const index = chapters.findIndex((chapter) => chapter.id === id);
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Story index' })
    .getByRole('button', {
      name: String(index).padStart(2, '0') + ' ' + chapters[index].label + ' ↗',
      exact: true,
    })
    .click();
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', id);
}

async function capture(page: Page, file: string) {
  await page.screenshot({ path: resolve(outputRoot, file) });
  captures.push({
    file,
    chapter: await page.locator('[data-voyage]').getAttribute('data-active-chapter'),
    scene: await page.locator('canvas').getAttribute('data-scene'),
    observerTime: await page.locator('canvas').getAttribute('data-observer-time'),
  });
}

async function measure(page: Page, label: string, travel: boolean) {
  // A string expression avoids tsx's injected __name helper in the browser isolate.
  const result = await page.evaluate<{
    times: number[];
    scenes: string[];
    initialY: number;
    finalY: number;
  }>(`
    new Promise((resolve) => {
      const times = [], scenes = new Set(), initialY = scrollY;
      const distance = document.querySelector('#s2').getBoundingClientRect().top - document.querySelector('#s1').getBoundingClientRect().top;
      let first = 0, previous = 0;
      const frame = (now) => {
        if (!first) first = previous = now;
        else times.push(now - previous);
        previous = now;
        const t = Math.min(1, (now - first) / 6000);
        if (${travel}) scrollTo({ top: initialY + distance * (1 - Math.cos(t * Math.PI * 2)) / 2, behavior: 'instant' });
        scenes.add(document.querySelector('[data-voyage]').getAttribute('data-active-chapter'));
        if (t < 1) requestAnimationFrame(frame);
        else resolve({ times, scenes: [...scenes], initialY, finalY: scrollY });
      };
      requestAnimationFrame(frame);
    })
  `);
  const sorted = result.times.toSorted((a, b) => a - b);
  cadence.push({
    label,
    samples: sorted.length,
    p50Ms: sorted[Math.floor(sorted.length * 0.5)],
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
    p99Ms: sorted[Math.floor(sorted.length * 0.99)],
    longestMs: sorted.at(-1),
    meanHz: (1000 * sorted.length) / sorted.reduce((a, b) => a + b, 0),
    scenes: result.scenes,
    returnsToStartingScroll: Math.abs(result.initialY - result.finalY) < 1,
  });
}

function observe(page: Page) {
  page.on('pageerror', (error) => issues.push({ kind: 'pageerror', detail: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.push({ kind: 'console', detail: message.text() });
  });
  page.on('requestfailed', (request) => {
    const error = request.failure()?.errorText ?? '';
    if (!error.includes('ERR_ABORTED') && !error.includes('cancelled'))
      issues.push({ kind: 'requestfailed', detail: error + ' ' + request.url() });
  });
}

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: hardwareGpu
    ? ['--enable-gpu', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : [])]
    : [],
});
let graphics: unknown;
try {
  for (const mobile of [false, true]) {
    const name = mobile ? 'portrait' : 'desktop';
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    observe(page);
    await page.goto(baseUrl);
    await page.getByRole('button', { name: 'Full', exact: true }).click();
    await expect(page.locator('[data-stage-status]')).toHaveAttribute(
      'data-stage-status',
      'ready',
      { timeout: 30000 },
    );
    await page.evaluate(() => document.fonts.ready);
    if (!mobile)
      graphics = await page.evaluate(() => {
        const gl = document.querySelector('canvas')?.getContext('webgl2');
        const extension = gl?.getExtension('WEBGL_debug_renderer_info');
        return {
          renderer:
            extension && gl ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'unavailable',
          userAgent: navigator.userAgent,
        };
      });
    await jump(page, 's1');
    await page.waitForTimeout(700);
    await measure(page, name + ' native forward/reverse world transition', true);
    await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', 's1');
    await jump(page, 'observer');
    await page.waitForTimeout(700);
    await measure(page, name + ' autonomous organism, stationary scroll', false);
    for (let frame = 0; frame < 20; frame++) {
      await capture(page, name + '-organism-' + String(frame).padStart(2, '0') + '.png');
      await page.waitForTimeout(1000);
    }
    await page.getByRole('link', { name: 'Look through the telescope', exact: true }).click();
    await expect(page.locator('canvas')).toHaveAttribute('data-optical-view', 'eyepiece');
    await capture(page, name + '-eyepiece.png');
    await page.getByRole('link', { name: 'Step back from the eyepiece', exact: true }).click();
    await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', 'observer');
    await expect(page.locator('canvas')).toHaveAttribute('data-optical-view', 'exterior');
    // The active chapter changes halfway through travel; freeze only after native travel settles.
    await expect(page.locator('canvas')).toHaveAttribute('data-scene', '12.000');
    await page.getByRole('button', { name: 'Reduced', exact: true }).click();
    await expect(page.locator('[data-voyage]')).toHaveAttribute('data-mode', 'reduced');
    await page.waitForTimeout(150);
    const frozen = await page.locator('canvas').screenshot();
    await page.waitForTimeout(450);
    expect(frozen.equals(await page.locator('canvas').screenshot())).toBe(true);
    await capture(page, name + '-reduced-observer.png');
    await page
      .locator('canvas')
      .evaluate((canvas) =>
        canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
      );
    await expect(page.locator('[data-stage-status]')).toHaveAttribute(
      'data-stage-status',
      'fallback',
    );
    await expect(page.getByRole('button', { name: 'Retry 3D' })).toBeVisible();
    await page.getByRole('button', { name: 'Retry 3D' }).click();
    await expect(page.locator('[data-stage-status]')).toHaveAttribute(
      'data-stage-status',
      'ready',
      { timeout: 30000 },
    );
    await jump(page, 's9');
    await page.setViewportSize(mobile ? { width: 844, height: 390 } : { width: 1100, height: 850 });
    await jump(page, 's9');
    await expect(page.locator('canvas')).toHaveAttribute('data-scene', '10.000');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
const report = {
  baseUrl,
  hardwareGpuRequested: hardwareGpu,
  graphics,
  captures,
  cadence,
  issues,
  scope:
    'Unthrottled local headless Chromium requestAnimationFrame cadence; desktop and mobile viewport emulation. This is not GPU presentation timing, physical mobile-device certification, or field Core Web Vitals. Context-loss, retry, resize, autonomous motion, and reduced-motion stability are exercised.',
};
await writeFile(resolve(outputRoot, 'capture-report.json'), JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify({ cadence, issues, outputRoot }, null, 2) + '\n');
if (issues.length) throw new Error('Motion QA captured ' + issues.length + ' runtime issues.');
