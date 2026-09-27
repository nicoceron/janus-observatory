import { chromium, expect, type BrowserContext, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { allScenarioProfiles } from '../apps/web/lib/canonical-core';
import { systemPortrait } from '../apps/web/lib/system-portrait';
import {
  companionStudy,
  objectSelections,
  selectionName,
  systemSelections,
} from '../apps/web/app/voyage/inspection';

// Run only against a finished asset build. One context/page at a time; no videos or parallel tabs.
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3200';
const out = resolve(process.argv[2] ?? 'docs/qa/blender-worlds/views');
const prefix = (process.env.JANUS_QA_PREFIX ?? '').replace(/[^a-zA-Z0-9_-]/g, '-');
const selected = process.env.JANUS_QA_SCENARIOS?.split(',').map((id) =>
  Number(id.replace(/^s/i, '')),
);
const profiles = (process.env.JANUS_QA_VIEWPORTS ?? 'desktop,portrait').split(',');
const includeObjects = process.env.JANUS_QA_OBJECTS !== '0';
const includeMotion = process.env.JANUS_QA_MOTION !== '0';
const earthOnly = process.env.JANUS_QA_EARTH_ONLY === '1';
const eligible = (world: number) => !selected || selected.includes(world + 1);
const filename = (id: string) => `${prefix ? prefix + '-' : ''}${id.replace(/:/g, '-')}.png`;
const hash = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');
const expectedAsset = (world: number, selection: string, mobile = false) =>
  `/assets/blender/v1/${world < 0 ? 'origin' : 's' + (world + 1)}/${selection === 'Earth' ? (mobile ? 'earth-mobile' : 'earth') : selection}.glb`;
const errors: string[] = [];
const images: { file: string; profile: string; world: number; selection: string; kind: string }[] =
  [];
const requests: {
  profile: string;
  url: string;
  status: number;
  bodyBytes: number;
  transferredBytes: number;
}[] = [];
const failedRequests: { profile: string; url: string; error: string | null }[] = [];
const requestsInProgress = new Set<Promise<void>>();
const assetStates: {
  profile: string;
  world: number;
  selection: string;
  url: string;
  count: number;
  bytes: number;
  parts: number;
}[] = [];
const motionFrames: {
  world: number;
  selection: string;
  frame: number;
  sha256: string;
  file: string;
}[] = [];
const stillChecks: { profile: string; world: number; selection: string; sha256: string }[] = [];
let failure: string | null = null;
let currentPage: Page | null = null;
let currentContext: BrowserContext | null = null;
let storyPortraits = 0;
const inspectionScroll = new WeakMap<Page, number>();
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=metal'] });

function monitor(page: Page, profile: string) {
  page.on('pageerror', (error) => errors.push(`${profile}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${profile}: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    if (request.url().includes('/assets/blender/v1/'))
      failedRequests.push({
        profile,
        url: request.url(),
        error: request.failure()?.errorText ?? null,
      });
  });
  page.on('response', (response) => {
    if (!response.url().includes('/assets/blender/v1/')) return;
    const pending = (async () => {
      await response.finished();
      const sizes = await response.request().sizes();
      requests.push({
        profile,
        url: response.url(),
        status: response.status(),
        bodyBytes: sizes.responseBodySize,
        transferredBytes: sizes.responseBodySize + sizes.responseHeadersSize,
      });
    })()
      .catch((error) => errors.push(`${profile}: asset receipt ${String(error)}`))
      .then(() => undefined);
    requestsInProgress.add(pending);
    void pending.finally(() => requestsInProgress.delete(pending));
  });
}

async function ready(
  page: Page,
  profile: string,
  world: number,
  selection: string,
  mobile = false,
) {
  const canvas = page.locator('canvas');
  const url = expectedAsset(world, selection, mobile);
  await expect(canvas).toHaveAttribute('data-blender-asset', url, { timeout: 45000 });
  await expect(
    canvas,
    `${profile} S${world + 1} ${selection} must display the Blender model`,
  ).toHaveAttribute('data-blender-state', 'ready', { timeout: 45000 });
  await expect(canvas).toHaveAttribute('data-blender-missing-parts', '');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-blender-cache-count')), {
      timeout: 10000,
    })
    .toBeLessThanOrEqual(2);
  const count = Number(await canvas.getAttribute('data-blender-cache-count'));
  const bytes = Number(await canvas.getAttribute('data-blender-cache-bytes'));
  const parts = Number(await canvas.getAttribute('data-blender-part-count'));
  expect(count).toBeGreaterThan(0);
  expect(bytes).toBeGreaterThan(0);
  expect(bytes).toBeLessThanOrEqual(48 * 1024 * 1024);
  expect(parts).toBeGreaterThan(0);
  assetStates.push({ profile, world: world + 1, selection, url, count, bytes, parts });
  await page.waitForTimeout(200);
}

async function goToWorld(page: Page, world: number, reduced = true) {
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page
    .getByRole('button', {
      name: `${String(world + 2).padStart(2, '0')} S${world + 1} ↗`,
      exact: true,
    })
    .click();
  if (reduced)
    await expect(page.locator('canvas')).toHaveAttribute('data-scene', `${world + 2}.000`);
  else
    await expect
      .poll(async () =>
        Math.abs(Number(await page.locator('canvas').getAttribute('data-scene')) - world - 2),
      )
      .toBeLessThan(0.02);
}

async function capture(
  page: Page,
  profile: string,
  world: number,
  selection: string,
  kind: string,
) {
  const file = filename(
    `${profile}-${world < 0 ? 'origin' : 's' + (world + 1)}-${kind}-${selection}`,
  );
  if (kind === 'story' && world >= 0 && profile === 'desktop') {
    const heading = await page.locator(`#s${world + 1} h2`).boundingBox();
    const controls = await page
      .getByLabel(`Explore S${world + 1} models`, { exact: true })
      .boundingBox();
    expect(
      heading?.y,
      'Story heading remains visible after destination/inspector changes',
    ).toBeGreaterThanOrEqual(0);
    expect(
      controls!.y + controls!.height,
      'Destination panel clears the fixed footer',
    ).toBeLessThanOrEqual(page.viewportSize()!.height - 60);
  }
  await page.screenshot({ path: resolve(out, file) });
  images.push({ file, profile, world: world + 1, selection, kind });
}

async function still(page: Page, profile: string, world: number, selection: string) {
  const before = await page.locator('canvas').screenshot();
  await page.waitForTimeout(240);
  const after = await page.locator('canvas').screenshot();
  expect(
    before.equals(after),
    `${profile} S${world + 1} ${selection} must stop under reduced/paused motion`,
  ).toBe(true);
  stillChecks.push({ profile, world: world + 1, selection, sha256: hash(after) });
}

async function openCurrent(page: Page, world: number) {
  if (page.viewportSize()!.width > 760)
    inspectionScroll.set(page, await page.evaluate(() => scrollY));
  await page
    .getByLabel(`Explore S${world + 1} models`, { exact: true })
    .getByRole('button', { name: 'Explore this world', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

async function closeCurrent(page: Page) {
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close world explorer', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  if (inspectionScroll.has(page)) {
    expect(
      await page.evaluate(() => scrollY),
      'Inspector preserves the desktop story scroll position',
    ).toBe(inspectionScroll.get(page));
    inspectionScroll.delete(page);
  }
  await expect
    .poll(async () => (await page.locator('canvas').boundingBox())?.height)
    .toBe(page.viewportSize()!.height);
}

try {
  for (const profile of profiles) {
    const mobile = profile === 'portrait';
    currentContext = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      reducedMotion: 'reduce',
      isMobile: mobile,
      hasTouch: mobile,
    });
    currentPage = await currentContext.newPage();
    const page = currentPage;
    monitor(page, profile);
    await page.goto(base);
    await expect(page.locator('[data-stage-status]')).toHaveAttribute(
      'data-stage-status',
      'ready',
      { timeout: 45000 },
    );
    await page.evaluate(() => document.fonts.ready);
    const originalCanvas = await page.locator('canvas').elementHandle();
    await ready(page, profile, -1, 'Earth', mobile);
    await capture(page, profile, -1, 'Earth', 'story');
    await still(page, profile, -1, 'Earth');
    await page.getByRole('button', { name: 'Index +', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Story index', exact: true })
      .getByRole('button', { name: /^01 / })
      .click();
    await expect(page.locator('canvas')).toHaveAttribute('data-scene', '1.000');
    await page.waitForTimeout(350);
    await Promise.all([...requestsInProgress]);
    expect(
      requests.filter(
        (request) => request.profile === profile && !request.url.includes('/origin/'),
      ),
      'The ten-world overview must not preload the full asset catalog',
    ).toEqual([]);
    for (let world = 0; world < 10; world++) {
      if (!eligible(world)) continue;
      await goToWorld(page, world);
      const region = page.getByLabel(`Explore S${world + 1} models`, { exact: true });
      const system = systemPortrait(allScenarioProfiles[world]).art;
      const selections = earthOnly ? ['Earth'] : systemSelections(system);
      for (const selection of selections) {
        if (systemSelections(system).length > 1)
          await region
            .getByRole('navigation')
            .getByRole('button', { name: selectionName(selection), exact: true })
            .click();
        await expect(page.locator('canvas')).toHaveAttribute('data-story-body', selection);
        await ready(page, profile, world, selection, mobile);
        await capture(page, profile, world, selection, 'story');
        storyPortraits++;
        await still(page, profile, world, selection);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (selection === 'Earth' && !mobile && includeObjects) {
          await openCurrent(page, world);
          await ready(page, profile, world, 'Earth');
          for (const object of objectSelections(world)) {
            await page
              .getByRole('dialog')
              .getByRole('button', { name: selectionName(object), exact: true })
              .click();
            await expect(page.locator('canvas')).toHaveAttribute('data-inspection', object);
            await expect(
              page
                .getByRole('dialog')
                .getByRole('heading', { name: selectionName(object), exact: true }),
            ).toBeVisible();
            await ready(page, profile, world, 'Earth');
            await capture(page, profile, world, object, 'object');
            await still(page, profile, world, object);
          }
          await closeCurrent(page);
          await ready(page, profile, world, selection, mobile);
        }
        const study = companionStudy(world, selection, system);
        if (study) {
          await openCurrent(page, world);
          await expect(page.locator('canvas')).toHaveAttribute('data-inspection', selection);
          await ready(page, profile, world, selection);
          await page
            .getByRole('dialog')
            .getByRole('button', {
              name: new RegExp(`^Inspect ${selectionName(study).toLowerCase()}`),
            })
            .click();
          await expect(page.locator('canvas')).toHaveAttribute('data-inspection', study);
          await expect(
            page
              .getByRole('dialog')
              .getByRole('heading', { name: selectionName(study), exact: true }),
          ).toBeVisible();
          await ready(page, profile, world, 'Earth');
          await capture(page, profile, world, `${selection}-${study}`, 'study');
          await still(page, profile, world, study);
          await closeCurrent(page);
          await ready(page, profile, world, selection, mobile);
        }
        expect(
          await originalCanvas?.evaluate((element) => element === document.querySelector('canvas')),
        ).toBe(true);
      }
    }
    await Promise.all([...requestsInProgress]);
    await currentContext.close();
    currentPage = null;
    currentContext = null;
  }

  const studies = [
    { world: 3, selection: 'vessel:canoe' },
    { world: 2, selection: 'aircraft:regional-plane' },
    { world: 2, selection: 'vessel:ferry' },
    { world: 3, selection: 'animal:deer' },
    { world: 5, selection: 'machine:maintenance-walker' },
    { world: 9, selection: 'vessel:sail-barge' },
  ].filter((study) => eligible(study.world));
  if (includeMotion && studies.length) {
    currentContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'no-preference',
    });
    currentPage = await currentContext.newPage();
    const page = currentPage;
    monitor(page, 'motion');
    await page.goto(base);
    await page.getByRole('button', { name: 'Full', exact: true }).click();
    await expect(page.locator('[data-stage-status]')).toHaveAttribute(
      'data-stage-status',
      'ready',
      { timeout: 45000 },
    );
    await ready(page, 'motion', -1, 'Earth');
    for (const study of studies) {
      await goToWorld(page, study.world, false);
      await openCurrent(page, study.world);
      const resume = page
        .getByRole('dialog')
        .getByRole('button', { name: 'Play motion', exact: true });
      if (await resume.count()) await resume.click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: selectionName(study.selection), exact: true })
        .click();
      await expect(page.locator('canvas')).toHaveAttribute('data-inspection', study.selection);
      await ready(page, 'motion', study.world, 'Earth');
      const fingerprints = new Set<string>();
      for (let frame = 0; frame < (study.selection === 'vessel:canoe' ? 24 : 5); frame++) {
        if (frame) await page.waitForTimeout(650);
        const bytes = await page.locator('canvas').screenshot();
        const file = filename(`motion-s${study.world + 1}-${study.selection}-${frame}`);
        await writeFile(resolve(out, file), bytes);
        const sha256 = hash(bytes);
        fingerprints.add(sha256);
        motionFrames.push({
          world: study.world + 1,
          selection: study.selection,
          frame,
          sha256,
          file,
        });
      }
      expect(
        fingerprints.size,
        `${study.selection} must visibly articulate or move`,
      ).toBeGreaterThan(1);
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Pause motion', exact: true })
        .click();
      await page.waitForTimeout(200);
      await still(page, 'paused', study.world, study.selection);
      await closeCurrent(page);
    }
    await Promise.all([...requestsInProgress]);
    await currentContext.close();
    currentPage = null;
    currentContext = null;
  }
  expect(errors).toEqual([]);
} catch (error) {
  failure = error instanceof Error ? (error.stack ?? error.message) : String(error);
  if (currentPage && !currentPage.isClosed()) {
    await currentPage
      .screenshot({ path: resolve(out, filename('failure')) })
      .catch(() => undefined);
    await writeFile(
      resolve(out, `${prefix ? prefix + '-' : ''}failure-state.json`),
      JSON.stringify(
        await currentPage
          .locator('canvas')
          .evaluate((canvas) => ({ ...canvas.dataset }))
          .catch(() => ({})),
        null,
        2,
      ) + '\n',
    );
  }
} finally {
  await Promise.all([...requestsInProgress]);
  await currentContext?.close();
  await browser.close();
  await writeFile(
    resolve(out, `${prefix ? prefix + '-' : ''}capture.json`),
    JSON.stringify(
      {
        status: failure ? 'failed' : 'passed',
        base,
        selected,
        profiles,
        storyPortraits,
        images,
        motionFrames,
        stillChecks,
        assetStates,
        requests,
        failedRequests,
        downloadedBytes: requests.reduce((sum, request) => sum + request.bodyBytes, 0),
        peakSettledLibraries: Math.max(0, ...assetStates.map((state) => state.count)),
        peakSettledDecodedBytes: Math.max(0, ...assetStates.map((state) => state.bytes)),
        errors,
        failure,
        scope:
          'Serial local browser QA: Blender readiness and named part gates, sourced story portraits and companion studies, desktop Earth objects, articulated motion, exact reduced/paused canvas identity. Memory figures estimate decoded GLB buffers/textures, not total process memory.',
      },
      null,
      2,
    ) + '\n',
  );
}
if (failure) {
  console.error(failure);
  process.exitCode = 1;
} else
  console.log(
    `${storyPortraits} Blender story portraits, ${images.length} screenshots, ${motionFrames.length} motion frames and ${stillChecks.length} stillness checks passed.`,
  );
