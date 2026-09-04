import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium, type Page } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const outputRoot = resolve(process.argv[2] ?? 'docs/qa/final-release-2026-08-30');

const storyFrames = [
  [0, '01-present', 'one-earth'],
  [1, '02-branches', 'possibility-families'],
  [3, '03-s1-world', 'scenario-s1'],
  [13, '04-observer', 'observer-turn'],
  [14, '05-s1-hwo', 'observe-s1'],
  [15, '06-s9-hwo-blank', 'observe-s9-hwo-blank'],
  [17, '07-s9-sgl', 'observe-s9-sgl'],
  [26, '08-matrix', 'observing-ladder'],
  [27, '09-collapse', 'civilizations-breathe'],
  [29, '10-handoff', 'explore-handoff'],
  [30, '11-epilogue', 'absence-of-evidence'],
] as const;

async function waitForFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}

async function captureStory(page: Page, directory: string) {
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await waitForFonts(page);
  await page.getByRole('button', { name: 'Start story', exact: true }).click();

  await page.waitForFunction(
    () => {
      const state = document.querySelector('.earthStage')?.getAttribute('data-render-state');
      return state === 'ready' || state === 'failed';
    },
    undefined,
    { timeout: 30_000 },
  );

  const stage = page.locator('.storyStage');
  const articles = page.getByLabel('Story chapters').getByRole('article');
  for (const [index, filename, stepId] of storyFrames) {
    await articles.nth(index).scrollIntoViewIfNeeded();
    await stage.waitFor({ state: 'visible' });
    await page.waitForFunction(
      (expectedStep) =>
        document.querySelector('.storyStage')?.getAttribute('data-active-step') === expectedStep,
      stepId,
    );
    await page.waitForTimeout(650);
    await page.screenshot({ path: resolve(directory, `${filename}.png`) });
  }
}

async function captureRouteSection(page: Page, route: string, heading: string, filename: string) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  await waitForFonts(page);
  const sectionHeading = page.getByRole('heading', { name: heading });
  await sectionHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.screenshot({ path: resolve(outputRoot, filename), fullPage: false });
}

async function captureRoute(page: Page, route: string, filename: string) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  await waitForFonts(page);
  await page.getByRole('navigation', { name: 'Primary navigation' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(250);
  await page.screenshot({ path: resolve(outputRoot, filename), fullPage: false });
}

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.emulateMedia({ reducedMotion: 'no-preference' });
  await captureStory(desktop, outputRoot);
  await captureRoute(
    desktop,
    '/observatory?scenario=S9&instrument=deep_space_probes',
    '12-observatory.png',
  );
  await captureRouteSection(
    desktop,
    '/observatory?scenario=S9&instrument=deep_space_probes',
    'One atmosphere. Fourteen separate measures.',
    '12a-observatory-atmosphere.png',
  );
  await captureRouteSection(
    desktop,
    '/observatory?scenario=S9&instrument=deep_space_probes',
    'One matrix. Different evidence.',
    '12b-observatory-modalities.png',
  );
  await captureRoute(desktop, '/atlas?compare=S1,S4,S9', '13-atlas.png');
  await captureRoute(desktop, '/research', '14-research.png');
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 412, height: 915 }, isMobile: true });
  await mobile.emulateMedia({ reducedMotion: 'reduce' });
  await captureRoute(mobile, '/', '15-mobile-home.png');
  await captureRoute(
    mobile,
    '/observatory?scenario=S9&instrument=deep_space_probes',
    '16-mobile-observatory.png',
  );
  await captureRoute(mobile, '/atlas?compare=S1,S4,S9', '17-mobile-atlas.png');
  await mobile.close();
} finally {
  await browser.close();
}

process.stdout.write(`Captured release QA frames in ${outputRoot}\n`);
