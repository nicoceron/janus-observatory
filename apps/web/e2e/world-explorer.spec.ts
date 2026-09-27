import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { allScenarioProfiles } from '../lib/canonical-core';
import { systemPortrait } from '../lib/system-portrait';
import { selectionName, systemSelections } from '../app/voyage/inspection';

// The complete ten-world inspection sweep includes serial model preparation.
test.setTimeout(90000);

test('full-motion story text stays out of planet and asset inspection and returns on close', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#s2');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', '3.000', { timeout: 45000 });
  const copy = page.locator('#s2 [data-chapter-copy]');
  const paintedOpacity = () =>
    copy.evaluate((node) => {
      if (getComputedStyle(node).visibility !== 'visible') return 0;
      let opacity = 1;
      for (let el: Element | null = node; el; el = el.parentElement)
        opacity *= Number(getComputedStyle(el).opacity);
      return opacity;
    });
  await expect.poll(paintedOpacity).toBe(1);
  const origin = await page.evaluate(() => ({ y: scrollY, height: document.body.scrollHeight }));
  const trigger = page.getByRole('button', { name: 'Inspect Earth', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (const name of ['Earth', 'Mining hauler', 'Luna']) {
    await dialog.getByRole('button', { name, exact: true }).click();
    await expect(dialog.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect.poll(paintedOpacity).toBe(0);
    await page.screenshot({ path: `docs/qa/inspector-text/${info.project.name}-${name}.png` });
    expect(await page.evaluate(() => ({ y: scrollY, height: document.body.scrollHeight }))).toEqual(
      origin,
    );
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect.poll(paintedOpacity).toBe(1);
  await expect(trigger).toBeFocused();
  await expect(canvas).toHaveAttribute('data-scene', '3.000');
  await trigger.click();
  await expect.poll(paintedOpacity).toBe(0);
  await page.getByRole('button', { name: 'Close world explorer', exact: true }).click();
  await expect.poll(paintedOpacity).toBe(1);
  await expect(trigger).toBeFocused();
  await expect(canvas).toHaveCount(1);
});

async function enter(page: import('@playwright/test').Page, index = 0) {
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Story index' })
    .getByRole('button', {
      name: `${String(index + 2).padStart(2, '0')} S${index + 1} ↗`,
      exact: true,
    })
    .click();
  const trigger = page
    .locator(`[aria-label="Explore S${index + 1} models"]`)
    .getByRole('button', { name: 'Inspect Earth', exact: true });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  return trigger;
}
test('every world can be inspected independently and closing restores the same story canvas and focus', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready', {
    timeout: 30000,
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const canvas = await page.locator('canvas').elementHandle();
  for (let i = 0; i < 10; i++) {
    const trigger = await enter(page, i),
      dialog = page.getByRole('dialog'),
      system = systemPortrait(allScenarioProfiles[i]).art;
    for (const id of systemSelections(system)) {
      await dialog.getByRole('button', { name: selectionName(id), exact: true }).click();
      await expect(page.locator('canvas')).toHaveAttribute('data-inspection', id);
      await expect(
        dialog.getByRole('heading', { name: selectionName(id), exact: true }),
      ).toBeVisible();
    }
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(await canvas?.evaluate((el) => el === document.querySelector('canvas'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator('canvas')).toHaveAttribute('data-scene', `${i + 2}.000`);
  }
  expect(errors).toEqual([]);
});
test('explorer keyboard loop, model controls and accessible dialog work', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready', {
    timeout: 30000,
  });
  await enter(page, 3);
  const dialog = page.getByRole('dialog');
  const close = dialog.getByRole('button', { name: 'Close world explorer', exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('link', { name: 'Read the scenario & sources ↗' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await dialog.getByRole('button', { name: 'Woodland deer', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-inspection', 'animal:deer');
  const first = await page.locator('canvas').screenshot();
  await page.waitForTimeout(250);
  expect(first.equals(await page.locator('canvas').screenshot())).toBe(false);
  await dialog.getByRole('button', { name: 'Rotate model right', exact: true }).click();
  expect(first.equals(await page.locator('canvas').screenshot())).toBe(false);
  if (info.project.name === 'chromium' || info.project.name === 'mobile-chromium') {
    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});
