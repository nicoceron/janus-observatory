import { expect, test, type Page } from '@playwright/test';

test.setTimeout(120000);

async function chapter(page: Page, scenario: number) {
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page
    .getByRole('button', {
      name: `${String(scenario + 1).padStart(2, '0')} S${scenario} ↗`,
      exact: true,
    })
    .click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', `${scenario + 1}.000`);
}

test('Blender models decode on this browser and source-selected Venus keeps its surface identity', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-blender-state', 'ready', {
    timeout: 45000,
  });
  await chapter(page, 6);
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute(
    'data-blender-asset',
    `/assets/blender/v1/s6/earth${isMobile ? '-mobile' : ''}.glb`,
  );
  await expect(canvas).toHaveAttribute('data-blender-state', 'ready', { timeout: 45000 });
  await page
    .getByLabel('Explore S6 models', { exact: true })
    .getByRole('button', { name: 'Inspect Venus', exact: true })
    .click();
  await expect(canvas).toHaveAttribute('data-blender-asset', '/assets/blender/v1/s6/Venus.glb');
  await expect(canvas).toHaveAttribute('data-blender-state', 'ready', { timeout: 45000 });

  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Inspect venus surface facility/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Venus surface facility', exact: true }),
  ).toBeVisible();
  await expect(canvas).toHaveAttribute('data-blender-asset', '/assets/blender/v1/s6/earth.glb');
  await expect(canvas).toHaveAttribute('data-blender-state', 'ready', { timeout: 45000 });
  await expect(canvas).toHaveAttribute('data-blender-missing-parts', '');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('an unavailable Blender asset retains an interactive procedural world and retries on a later visit', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/assets/blender/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveAttribute('data-blender-state', 'fallback', {
    timeout: 45000,
  });
  await chapter(page, 4);
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-blender-asset',
    `/assets/blender/v1/s4/earth${isMobile ? '-mobile' : ''}.glb`,
  );
  await expect(page.locator('canvas')).toHaveAttribute('data-blender-state', 'fallback', {
    timeout: 45000,
  });
  await page
    .getByLabel('Explore S4 models', { exact: true })
    .getByRole('button', { name: 'Inspect Earth', exact: true })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Wooden canoe', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Wooden canoe', exact: true })).toBeVisible();
  await expect(page.locator('canvas')).toHaveAttribute('data-inspection', 'vessel:canoe');
  await page.keyboard.press('Escape');
  await page.unroute('**/assets/blender/**');
  await chapter(page, 7);
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-blender-asset',
    `/assets/blender/v1/s7/earth${isMobile ? '-mobile' : ''}.glb`,
  );
  await expect(page.locator('canvas')).toHaveAttribute('data-blender-state', 'ready', {
    timeout: 45000,
  });
  await chapter(page, 4);
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-blender-asset',
    `/assets/blender/v1/s4/earth${isMobile ? '-mobile' : ''}.glb`,
  );
  await expect(page.locator('canvas')).toHaveAttribute('data-blender-state', 'ready', {
    timeout: 45000,
  });
});

test('S9 system inspection preserves the story position and opens its Venus machinery', async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    'Desktop two-row footer regression; all destinations have separate mobile coverage.',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('canvas')).toHaveAttribute('data-blender-state', 'ready', {
    timeout: 45000,
  });
  await chapter(page, 9);
  const region = page.getByLabel('Explore S9 models', { exact: true });
  const trigger = region.getByRole('button', { name: 'Inspect Earth', exact: true });
  const before = await page.evaluate(() => scrollY);
  await trigger.click();
  await page.getByRole('button', { name: 'Close world explorer', exact: true }).click();
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await expect(page.locator('#s9 h2')).toBeInViewport({ ratio: 1 });
  await region.getByRole('button', { name: 'Inspect Venus', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute(
    'data-blender-asset',
    '/assets/blender/v1/s9/Venus.glb',
  );
  await expect(page.locator('canvas')).toHaveAttribute('data-blender-state', 'ready', {
    timeout: 45000,
  });
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Inspect venus surface facility/ })
    .click();
  await expect(page.locator('canvas')).toHaveAttribute('data-inspection', 'venus-facility');
  await expect(page.locator('canvas')).toHaveAttribute('data-blender-state', 'ready', {
    timeout: 45000,
  });
  await expect(page.locator('canvas')).toHaveAttribute('data-blender-missing-parts', '');
});

test('a native static landmark can be rotated and reset without losing its model', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await chapter(page, 6);
  await page
    .getByLabel('Explore S6 models', { exact: true })
    .getByRole('button', { name: 'Inspect Earth', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Life-support manifold', exact: true }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-inspection', 'landmark:manifold');
  await expect(canvas).toHaveAttribute('data-blender-asset', '/assets/blender/v1/s6/earth.glb');
  await expect(canvas).toHaveAttribute('data-blender-state', 'ready', { timeout: 45000 });
  await expect(canvas).toHaveAttribute('data-blender-missing-parts', '');
  // Keep hover decoration outside the canvas rectangle while comparing the model view.
  await page.mouse.move(1, 1);
  const initial = await canvas.screenshot();
  await dialog.getByRole('button', { name: 'Rotate model right', exact: true }).click();
  await page.mouse.move(1, 1);
  expect(initial.equals(await canvas.screenshot())).toBe(false);
  await dialog.getByRole('button', { name: 'Reset view', exact: true }).click();
  await page.mouse.move(1, 1);
  expect(initial.equals(await canvas.screenshot())).toBe(true);
});
