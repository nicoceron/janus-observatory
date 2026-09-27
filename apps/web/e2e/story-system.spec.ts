import { expect, test } from '@playwright/test';
import { allScenarioProfiles } from '../lib/canonical-core';
import { systemPortrait } from '../lib/system-portrait';
import { selectionName, systemSelections } from '../app/voyage/inspection';

test('every published destination is visible together and opens its own inspector without replacing the system', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(180000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready', {
    timeout: 45000,
  });
  const canvas = page.locator('canvas');
  const original = await canvas.elementHandle();
  for (let i = 0; i < 10; i++) {
    await page.getByRole('button', { name: 'Index +', exact: true }).click();
    await page
      .getByRole('button', { name: `${String(i + 2).padStart(2, '0')} S${i + 1} ↗`, exact: true })
      .click();
    await expect(canvas).toHaveAttribute('data-scene', `${i + 2}.000`);
    await expect(canvas).toHaveAttribute('data-story-body', 'system');
    const ids = systemSelections(systemPortrait(allScenarioProfiles[i]).art);
    const region = page.getByLabel(`Explore S${i + 1} models`, { exact: true });
    await expect(region.getByRole('button')).toHaveCount(ids.length);
    await expect
      .poll(
        async () =>
          JSON.parse((await canvas.getAttribute('data-blender-libraries')) ?? '[]').filter(
            (a: { url: string; state: string }) =>
              a.url.includes(`/s${i + 1}/`) && a.state === 'ready',
          ).length,
        { timeout: 45000 },
      )
      .toBe(ids.length);
    for (const id of ids) {
      const button = region.getByRole('button', {
        name: `Inspect ${selectionName(id)}`,
        exact: true,
      });
      await expect(button).toBeInViewport({ ratio: 0.999 });
      const box = await button.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(70);
      expect(box!.y + box!.height).toBeLessThan(page.viewportSize()!.height - 60);
      expect(await button.getAttribute('aria-pressed')).toBeNull();
    }
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `docs/qa/spatial-systems/${info.project.name}-s${i + 1}.png` });
    // A pointer click on the miniature's hit region opens the correct body; keyboard returns there.
    const target = ids.at(-1)!;
    const button = region.getByRole('button', {
      name: `Inspect ${selectionName(target)}`,
      exact: true,
    });
    const scrollBefore = await page.evaluate(() => scrollY);
    await button.click();
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: selectionName(target), exact: true }),
    ).toBeVisible();
    await expect(canvas).toHaveAttribute('data-inspection', target);
    await expect(page.locator('[data-voyage] > header')).toHaveCSS('visibility', 'hidden');
    await expect(
      page.locator('[data-voyage] > [inert]').filter({ has: page.locator('#s1') }),
    ).toHaveCSS('visibility', 'hidden');
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
    await expect(canvas).toHaveAttribute('data-story-body', 'system');
    expect(await original?.evaluate((el) => el === document.querySelector('canvas'))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (!isMobile) await expect(page.locator(`#s${i + 1} h2`)).toBeInViewport();
    if (info.project.name === 'chromium' && [0, 1, 6, 7].includes(i)) {
      await region.getByRole('button', { name: 'Inspect Earth', exact: true }).click();
      await expect(canvas).toHaveAttribute('data-inspection', 'Earth');
      await page.screenshot({ path: `docs/qa/spatial-systems/road-s${i + 1}-inspector.png` });
      await page.getByRole('button', { name: 'Rotate model right', exact: true }).click();
      await page.screenshot({ path: `docs/qa/spatial-systems/road-s${i + 1}-turned.png` });
      await page.keyboard.press('Escape');
    }
  }
  expect(errors).toEqual([]);
});
