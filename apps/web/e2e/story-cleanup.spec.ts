import { expect, test } from '@playwright/test';

test('story cleanup keeps full animation, spatial exploration and a quiet interface', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (/THREE.Clock|hydrated|hydration/i.test(message.text())) errors.push(message.text());
  });
  await page.addInitScript(() => localStorage.setItem('janus-motion-preference', 'reduced'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready', {
    timeout: 45000,
  });
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-mode', 'full');
  await expect(page.getByLabel('Motion preference')).toHaveCount(0);
  await expect(page.getByLabel('Story controls')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Read without animation' })).toHaveCount(0);
  for (const text of [
    'AN EXPEDITION INTO POSSIBILITY',
    'EARTH / SOL SYSTEM',
    'A VISUAL FIELD GUIDE',
    'TEN SCENARIOS / ARTISTIC INTERPRETATIONS',
    'SELECTED OFF-WORLD FOOTPRINT',
    'PROJECT JANUS SCENARIO',
  ]) {
    await expect(page.getByText(text, { exact: true })).toHaveCount(0);
  }
  await page.screenshot({ path: `docs/qa/story-cleanup/${info.project.name}-hero.png` });
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page.getByRole('button', { name: '04 S3 ↗', exact: true }).click();
  await expect
    .poll(async () => Number(await page.locator('canvas').getAttribute('data-scene')))
    .toBeCloseTo(4, 2);
  const region = page.getByLabel('Explore S3 models', { exact: true });
  await expect(region.getByRole('button')).toHaveCount(5);
  await page.screenshot({ path: `docs/qa/story-cleanup/${info.project.name}-s3.png` });
  const luna = region.getByRole('button', { name: 'Inspect Luna', exact: true });
  await luna.click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Luna', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Rotate model right', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(luna).toBeFocused();
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page.getByRole('button', { name: '12 The other side ↗', exact: true }).click();
  await expect
    .poll(async () => Number(await page.locator('canvas').getAttribute('data-scene')))
    .toBeCloseTo(12, 2);
  const before = await page.locator('canvas').screenshot();
  await page.waitForTimeout(400);
  expect(before.equals(await page.locator('canvas').screenshot())).toBe(false);
  await page.screenshot({ path: `docs/qa/story-cleanup/${info.project.name}-observer.png` });
  await page.getByRole('link', { name: 'Look through the telescope', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-optical-view', 'eyepiece');
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
