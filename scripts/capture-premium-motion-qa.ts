import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium, type Page } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const outputRoot = resolve(process.argv[2] ?? 'docs/qa/premium-motion-2026-08-31');
const hardwareGpu = process.env.JANUS_QA_HARDWARE_GPU === '1';

type FrameRecord = {
  description: string;
  file: string;
  state: {
    activeStep: string | null;
    branchProgress: string;
    motionPhase: string | null;
    observerProgress: string | null;
    renderState: string | null;
    sceneHandoff: string | null;
    scrollDirection: string | null;
    transitionDirection: string | null;
  };
};

type RuntimeIssue = {
  detail: string;
  kind: 'console' | 'pageerror' | 'requestfailed';
};

const frames: FrameRecord[] = [];
const issues: RuntimeIssue[] = [];
const frameCadence: unknown[] = [];

async function sampleObserverCadence(page: Page, viewport: string) {
  await positionStep(page, 13, 0.1);
  await page.waitForTimeout(1400);
  // A documented string expression keeps tsx's injected __name helper out of
  // Playwright's isolated browser context. No production page globals are patched.
  const { times, states } = await page.evaluate<{ times: number[]; states: string[] }>(`
      new Promise((resolve) => {
        const element = document.querySelector('#story-step-14');
        const bounds = element.getBoundingClientRect();
        const start = scrollY + bounds.top - innerHeight * 0.1;
        const travel = bounds.height - innerHeight * 0.96;
        const times = [];
        const states = new Set();
        let first = 0,
          previous = 0;
        const frame = (now) => {
          states.add(document.querySelector('.storyStage')?.getAttribute('data-active-step'));
          if (!first) first = previous = now;
          else times.push(now - previous);
          previous = now;
          const t = Math.min(1, (now - first) / 6000);
          scrollTo({
            top: start + (travel * (1 - Math.cos(t * Math.PI * 2))) / 2,
            behavior: 'instant',
          });
          if (t < 1) requestAnimationFrame(frame);
          else resolve({times, states: [...states]});
        };
        requestAnimationFrame(frame);
      })
  `);
  if (states.some((state) => state !== 'observer-turn')) {
    issues.push({
      kind: 'pageerror',
      detail: `Cadence sample left the observer: ${states.join(', ')}`,
    });
  }
  const sorted = times.toSorted((a, b) => a - b);
  const percentile = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  frameCadence.push({
    viewport,
    samples: times.length,
    activeStates: states,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    p99Ms: percentile(0.99),
    longestMs: sorted.at(-1),
    meanCadenceHz: (1000 * times.length) / times.reduce((a, b) => a + b, 0),
    browser: await page.evaluate(() => navigator.userAgent),
    graphics: await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      return {
        webglDriver: gl && info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unavailable',
        stage: document.querySelector('.earthStage')?.getAttribute('data-render-state'),
      };
    }),
    hardwareGpuRequested: hardwareGpu,
    scope:
      'Unthrottled headless Chromium requestAnimationFrame cadence during six-second native forward/reverse scroll after asset warm-up. Not GPU presentation timing or physical mobile-device certification.',
  });
}

async function waitForPaint(page: Page, delay = 70) {
  await page.evaluate(
    () =>
      new Promise<void>((resolvePaint) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolvePaint()));
      }),
  );
  if (delay > 0) await page.waitForTimeout(delay);
}

async function capture(page: Page, file: string, description: string, delay = 70) {
  await waitForPaint(page, delay);
  await page.screenshot({ animations: 'allow', path: resolve(outputRoot, file) });
  const state = await page.evaluate(() => {
    const story = document.querySelector<HTMLElement>('.story');
    const stage = document.querySelector<HTMLElement>('.storyStage');
    const earth = document.querySelector<HTMLElement>('.earthStage');
    return {
      activeStep: stage?.dataset.activeStep ?? null,
      branchProgress: earth?.dataset.branchProgress ?? '',
      motionPhase: story?.dataset.motionPhase ?? null,
      observerProgress: earth?.dataset.observerProgress ?? null,
      renderState: earth?.dataset.renderState ?? null,
      sceneHandoff: stage?.dataset.sceneHandoff ?? null,
      scrollDirection: story?.dataset.scrollDirection ?? null,
      transitionDirection: story?.dataset.transitionDirection ?? null,
    };
  });
  frames.push({ description, file, state });
}

async function positionStep(page: Page, index: number, topViewportRatio: number) {
  const step = page.locator(`#story-step-${index + 1}`);
  await step.waitFor({ state: 'attached' });
  await step.evaluate((element, ratio) => {
    const target =
      window.scrollY + element.getBoundingClientRect().top - window.innerHeight * Number(ratio);
    window.scrollTo({ left: 0, top: Math.max(0, target), behavior: 'instant' });
  }, topViewportRatio);
}

function observeRuntime(page: Page) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      issues.push({ detail: message.text(), kind: 'console' });
    }
  });
  page.on('pageerror', (error) => {
    issues.push({ detail: error.message, kind: 'pageerror' });
  });
  page.on('requestfailed', (request) => {
    const detail = `${request.failure()?.errorText ?? 'request failed'} ${request.url()}`;
    if (!detail.includes('ERR_ABORTED') && !detail.includes('webpack-hmr')) {
      issues.push({ detail, kind: 'requestfailed' });
    }
  });
}

async function startStory(page: Page) {
  await page.getByRole('button', { exact: true, name: 'Start story' }).click();
  await page.locator('.earthStage[data-spatial-consent]').waitFor();
  if ((await page.locator('.earthStage').getAttribute('data-spatial-consent')) === 'required') {
    await page.getByRole('button', { name: 'Open interactive view' }).click();
  }
  await page.waitForFunction(
    () => {
      const state = document.querySelector('.earthStage')?.getAttribute('data-render-state');
      return state === 'ready' || state === 'failed';
    },
    undefined,
    { timeout: 30_000 },
  );
}

await mkdir(outputRoot, { recursive: true });
// Chromium documents --enable-gpu as the opt-in that disables forced software
// rendering in headless mode. Keep the software receipt separate for comparison.
// https://chromium.googlesource.com/chromium/src/+/HEAD/docs/gpu/using-gpu-hardware-in-headless-chrome.md
const browser = await chromium.launch({
  headless: true,
  args: hardwareGpu
    ? ['--enable-gpu', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : [])]
    : [],
});

try {
  const page = await browser.newPage({ viewport: { height: 900, width: 1440 } });
  observeRuntime(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => window.sessionStorage.clear());
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-motion-source="native-svg-gsap"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(1_100);
  await capture(
    page,
    '01-hero-settle.png',
    'Local hero orbital field after its authored settle.',
    0,
  );
  await page.evaluate(() => window.scrollTo(0, 260));
  await capture(page, '02-hero-parallax.png', 'Hero after passive native-scroll parallax.', 40);
  await page.evaluate(() => window.scrollTo(0, 0));

  await startStory(page);

  for (const [suffix, ratio, description] of [
    ['03-branch-early.png', 0.62, 'Branch trunk begins before the families arrive.'],
    ['04-branch-mid.png', 0.4, 'Family paths separate at mid-draw.'],
    ['05-branch-late.png', 0.12, 'Scenario limbs and worlds arrive with stagger.'],
    ['06-branch-settle.png', -0.1, 'Complete branch target state.'],
  ] as const) {
    await positionStep(page, 1, ratio);
    await capture(page, suffix, description, 55);
  }

  await positionStep(page, 2, 0.35);
  await capture(
    page,
    '07-branch-all.png',
    'All ten worlds in their complete authored branch state.',
    280,
  );
  await positionStep(page, 1, 0.24);
  await capture(
    page,
    '08-branch-reverse.png',
    'Reverse scroll redraws toward the same deterministic state.',
    20,
  );

  const captureWorldHandoff = async (file: string, description: string, delay: number) => {
    await positionStep(page, 1, 0.24);
    await page.waitForFunction(
      () =>
        document.querySelector('.storyStage')?.getAttribute('data-active-step') ===
        'possibility-families',
    );
    await page.waitForTimeout(1_550);

    await positionStep(page, 3, 0.2);
    await page.waitForFunction(
      () =>
        document.querySelector('.storyStage')?.getAttribute('data-active-step') === 'scenario-s1',
    );
    await capture(page, file, description, delay);
  };

  await captureWorldHandoff(
    '09-world-handoff-early.png',
    'Selected world handoff while native chapter travel settles.',
    0,
  );
  await captureWorldHandoff(
    '10-world-handoff-mid.png',
    'Selected world handoff during eased travel.',
    420,
  );
  await captureWorldHandoff(
    '11-world-handoff-settle.png',
    'Selected world in its complete target state.',
    1_650,
  );

  await page.getByLabel('Choose story chapter').click();
  await page.getByRole('button', { exact: true, name: 'Chapter 03: Observer' }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('.storyStage')?.getAttribute('data-active-step') === 'observer-turn',
  );
  await page.waitForTimeout(1_600);

  for (const [suffix, ratio, description] of [
    ['12-observer-establish.png', -0.18, 'Observer silhouette and camera establish first.'],
    ['13-observer-focus.png', -0.48, 'Observer focus and reach enter after camera establishment.'],
    [
      '14-observer-follow-through.png',
      -1.08,
      'Authored focus settles before the optical-axis camera move.',
    ],
    ['15-observer-settle.png', -1.48, 'Observer sequence converges on its complete state.'],
  ] as const) {
    await positionStep(page, 13, ratio);
    await page.waitForFunction(
      () =>
        document.querySelector('.storyStage')?.getAttribute('data-active-step') === 'observer-turn',
    );
    await capture(page, suffix, description, 95);
    if (frames.at(-1)?.state.activeStep !== 'observer-turn') {
      throw new Error(`Observer frame ${suffix} captured outside its authored chapter.`);
    }
  }

  await sampleObserverCadence(page, '1440x900, DPR 1');
  await positionStep(page, 5, 0.2);
  await capture(
    page,
    '17-system-context.png',
    'Canonical S9 system signature staged separately from Earth; hypothetical geometry.',
    1400,
  );

  const externalSplineRequests = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((url) => url.includes('spline')),
  );
  if (externalSplineRequests.length > 0) {
    issues.push({ detail: externalSplineRequests.join('\n'), kind: 'requestfailed' });
  }
  await page.close();

  const reducedPage = await browser.newPage({ viewport: { height: 900, width: 1440 } });
  observeRuntime(reducedPage);
  await reducedPage.emulateMedia({ reducedMotion: 'reduce' });
  await reducedPage.addInitScript(() => window.sessionStorage.clear());
  await reducedPage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await reducedPage.evaluate(() => document.fonts.ready);
  await startStory(reducedPage);
  await reducedPage.getByLabel('Choose story chapter').click();
  await reducedPage.getByRole('button', { exact: true, name: 'Chapter 02: Worlds' }).click();
  await reducedPage.waitForFunction(
    () => document.querySelector('.storyStage')?.getAttribute('data-active-step') === 'scenario-s1',
  );
  await capture(
    reducedPage,
    '16-reduced-motion.png',
    'Reduced motion resolves directly to the same complete S1 target state.',
    0,
  );
  await reducedPage.close();

  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  observeRuntime(mobilePage);
  await mobilePage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await startStory(mobilePage);
  await sampleObserverCadence(mobilePage, '390x844, DPR 1, touch emulation');
  await capture(
    mobilePage,
    '18-portrait-observer.png',
    'Portrait observer after native forward/reverse scrub.',
    500,
  );
  await mobilePage.close();
} finally {
  await browser.close();
}

await writeFile(
  resolve(outputRoot, 'capture-report.json'),
  `${JSON.stringify({ baseUrl, frames, issues, frameCadence }, null, 2)}\n`,
);

if (issues.length > 0) {
  throw new Error(`Premium motion QA captured ${issues.length} runtime issue(s).`);
}

process.stdout.write(`Captured ${frames.length} premium-motion frames in ${outputRoot}\n`);
