import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium, type Page } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const outputRoot = resolve(process.argv[2] ?? 'docs/qa/first-light/routes');

const storyFrames = [
  ['first-light', '00 First light ↗'],
  ['possibilities', '01 Ten possible worlds ↗'],
  ...Array.from({ length: 10 }, (_, i) => [
    's' + (i + 1),
    String(i + 2).padStart(2, '0') + ' S' + (i + 1) + ' ↗',
  ]),
  ['observer', '12 The other side ↗'],
  ['invisible', '13 Hidden in plain sight ↗'],
  ['signals', '14 Ways of seeing ↗'],
  ['endurance', '15 Civilizations breathe ↗'],
  ['beyond', '16 Keep looking ↗'],
];

async function waitForFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
}

async function captureStory(page: Page, directory: string) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await waitForFonts(page);
  await page.locator('[data-stage-status="ready"]').waitFor({ timeout: 30000 });
  for (const [id, label] of storyFrames) {
    await page.getByRole('button', { name: 'Index +', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Story index' })
      .getByRole('button', { name: label, exact: true })
      .click();
    await page.locator('[data-active-chapter="' + id + '"]').waitFor();
    await page.waitForTimeout(650);
    await page.screenshot({ path: resolve(directory, id + '.png') });
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
