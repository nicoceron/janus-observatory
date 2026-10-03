import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { allScenarioProfiles } from '../lib/canonical-core';
import { systemPortrait } from '../lib/system-portrait';

// Serial native-GPU model preparation on WebKit can exceed the default 30-second sweep.
test.setTimeout(90000);

async function indexJump(page: import('@playwright/test').Page, label: string, id: string) {
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Story index' })
    .getByRole('button', { name: label })
    .click();
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', id);
  // The chapter becomes active before the travel eases to rest; measure from the resting state.
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-anchor-travel', 'idle');
}

test('one canvas survives every world, reverse jumps, and the observer', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/earth-(day|night|bump|portrait)/.test(request.url()))
      errors.push('The new story requested an old Earth image: ' + request.url());
  });
  await page.goto('/');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready', {
    timeout: 30000,
  });
  const canvas = await page.locator('canvas').elementHandle();
  for (const [index, id] of [
    [2, 's1'],
    [5, 's4'],
    [10, 's9'],
    [11, 's10'],
    [2, 's1'],
    [12, 'observer'],
    [13, 'invisible'],
  ] as const) {
    const label =
      id === 'observer'
        ? 'The other side'
        : id === 'invisible'
          ? 'Hidden in plain sight'
          : id.toUpperCase();
    await indexJump(page, `${String(index).padStart(2, '0')} ${label} ↗`, id);
    await expect(page.locator('canvas')).toHaveAttribute('data-scene', `${index}.000`);
    expect(await canvas?.evaluate((el) => el === document.querySelector('canvas'))).toBe(true);
  }
  expect(errors).toEqual([]);
  if (testInfo.project.name === 'chromium')
    await page.screenshot({ path: 'docs/qa/spatial-systems/eyepiece.png' });
});

test('the telescope can be entered, exited, and reversed during travel', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready', {
    timeout: 30000,
  });
  await indexJump(page, '12 The other side ↗', 'observer');
  const enter = page.getByRole('link', { name: 'Look through the telescope', exact: true });
  await enter.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('canvas')).toHaveAttribute('data-optical-view', 'eyepiece');
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', 'invisible');
  await page.getByRole('link', { name: 'Step back from the eyepiece', exact: true }).click();
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', 'observer');
  await expect(page.locator('canvas')).toHaveAttribute('data-optical-view', 'exterior');
  await enter.click();
  await indexJump(page, '12 The other side ↗', 'observer');
  await expect(page.locator('canvas')).toHaveAttribute('data-optical-view', 'exterior');
  await enter.click();
  await expect
    .poll(async () => Number(await page.locator('canvas').getAttribute('data-scene')))
    .toBeCloseTo(13, 2);
  await expect(page.locator('canvas')).toHaveAttribute('data-optical-view', 'eyepiece');
  await indexJump(page, '12 The other side ↗', 'observer');
  await expect
    .poll(async () => Number(await page.locator('canvas').getAttribute('data-scene')))
    .toBeCloseTo(12, 2);
  await expect(page.locator('canvas')).toHaveAttribute('data-optical-view', 'exterior');
});

test('observer continues moving while scroll stays still', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'One GPU motion capture is sufficient; navigation and fallback run on all engines.',
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready', {
    timeout: 30000,
  });
  await indexJump(page, '12 The other side ↗', 'observer');
  const y = await page.evaluate(() => scrollY);
  const first = await page.locator('canvas').screenshot();
  await page.waitForTimeout(1300);
  const second = await page.locator('canvas').screenshot();
  expect(first.equals(second)).toBe(false);
  expect(await page.evaluate(() => scrollY)).toBe(y);
});

const compositionEntries: [string, string][] = [
  ['first-light', '00 First light ↗'],
  ['possibilities', '01 Ten possible worlds ↗'],
  ...Array.from({ length: 10 }, (_, i): [string, string] => [
    `s${i + 1}`,
    `${String(i + 2).padStart(2, '0')} S${i + 1} ↗`,
  ]),
  ['observer', '12 The other side ↗'],
  ['invisible', '13 Hidden in plain sight ↗'],
  ['signals', '14 Ways of seeing ↗'],
  ['endurance', '15 Civilizations breathe ↗'],
];

// Keep each sweep bounded on software-rendered Safari while retaining all
// chapter, canonical portrait, overflow, and native index-jump assertions.
for (let start = 0; start < compositionEntries.length; start += 4) {
  const entries = compositionEntries.slice(start, start + 4);
  test(`desktop and mobile compositions stay readable from ${entries[0][0]} to ${entries.at(-1)![0]}`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('[data-stage-status]')).toHaveAttribute(
      'data-stage-status',
      'ready',
      {
        timeout: 30000,
      },
    );
    await mkdir('docs/qa/spatial-systems', { recursive: true });
    for (const [id, label] of entries) {
      await indexJump(page, label, id);
      if (/^s\d+$/.test(id)) {
        await expect(page.locator('canvas')).toHaveAttribute(
          'data-scene',
          `${Number(id.slice(1)) + 1}.000`,
        );
        const portrait = systemPortrait(allScenarioProfiles[Number(id.slice(1)) - 1]).art;
        const explore = page.locator(`[aria-label="Explore ${id.toUpperCase()} models"]`);
        await expect(
          explore.getByRole('button', { name: 'Inspect Earth', exact: true }),
        ).toBeVisible();
        const destinations = 1 + portrait.bodies.length + portrait.features.length;
        await expect(explore.getByRole('button')).toHaveCount(destinations);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (testInfo.project.name === 'chromium' || testInfo.project.name === 'mobile-chromium') {
        await page.screenshot({
          path: `docs/qa/spatial-systems/${testInfo.project.name}-${id}.png`,
        });
      }
    }
  });
}
