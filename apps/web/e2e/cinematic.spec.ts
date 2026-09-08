import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { allScenarioProfiles } from '../lib/canonical-core';
import { systemPortrait } from '../lib/system-portrait';

async function indexJump(page: import('@playwright/test').Page, label: string, id: string) {
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Story index' })
    .getByRole('button', { name: label })
    .click();
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', id);
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
    await page.screenshot({ path: 'docs/qa/first-light/eyepiece.png' });
});

test('the telescope can be entered, exited, and reversed during travel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Full', exact: true }).click();
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
  await page.getByRole('button', { name: 'Reduced', exact: true }).click();
  await enter.click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', '13.000');
  await expect(page.locator('canvas')).toHaveAttribute('data-optical-view', 'eyepiece');
  await page.getByRole('button', { name: 'Previous chapter', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', '12.000');
  await expect(page.locator('canvas')).toHaveAttribute('data-optical-view', 'exterior');
});

test('observer continues moving while scroll stays still and reduced motion freezes it', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'One GPU motion capture is sufficient; navigation and fallback run on all engines.',
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Full', exact: true }).click();
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
  await page.getByRole('button', { name: 'Reduced', exact: true }).click();
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-mode', 'reduced');
  await page.waitForTimeout(200);
  const still = await page.locator('canvas').screenshot();
  await page.waitForTimeout(350);
  expect(still.equals(await page.locator('canvas').screenshot())).toBe(true);
});

test('desktop and mobile compositions have no page overflow and retain readable profiles', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready', {
    timeout: 30000,
  });
  await mkdir('docs/qa/first-light', { recursive: true });
  const entries: [string, string][] = [
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
  for (const [id, label] of entries) {
    await indexJump(page, label, id);
    if (/^s\d+$/.test(id)) {
      await expect(page.locator('canvas')).toHaveAttribute(
        'data-scene',
        `${Number(id.slice(1)) + 1}.000`,
      );
      const portrait = systemPortrait(allScenarioProfiles[Number(id.slice(1)) - 1]).art;
      await expect
        .poll(() =>
          page
            .locator('[data-system-label]')
            .evaluateAll(
              (els) => els.filter((el) => Number(getComputedStyle(el).opacity) > 0.99).length,
            ),
        )
        .toBe(portrait.bodies.length + portrait.features.length);
      const layout = await page.evaluate((world) => {
        const visible = [...document.querySelectorAll<HTMLElement>('[data-system-label]')].filter(
          (el) => Number(getComputedStyle(el).opacity) > 0.99,
        );
        const index = document.querySelector(`[data-world="${world}"] [class*="worldIndex"]`)!;
        return {
          width: innerWidth,
          height: innerHeight,
          copyTop: index.getBoundingClientRect().top,
          labels: visible.map((el) => ({
            id: el.dataset.systemLabel!,
            rect: el.getBoundingClientRect().toJSON() as {
              left: number;
              right: number;
              top: number;
              bottom: number;
            },
          })),
        };
      }, id.toUpperCase());
      for (const item of layout.labels) {
        expect(item.id.startsWith(id.toUpperCase() + ':'), item.id).toBe(true);
        expect(item.rect.left, item.id).toBeGreaterThanOrEqual(0);
        expect(item.rect.right, item.id).toBeLessThanOrEqual(layout.width);
        expect(item.rect.top, item.id).toBeGreaterThanOrEqual(76);
        expect(item.rect.bottom, item.id).toBeLessThan(layout.height - 70);
        if (layout.width <= 760)
          expect(item.rect.bottom, item.id).toBeLessThan(layout.copyTop - 15);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (testInfo.project.name === 'chromium' || testInfo.project.name === 'mobile-chromium') {
      await page.screenshot({ path: `docs/qa/first-light/${testInfo.project.name}-${id}.png` });
    }
  }
});
