import { expect, test } from '@playwright/test';

test('the atlas previews all ten current worlds and opens the matching record', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const legacyAssets: string[] = [];
  page.on('request', (request) => {
    if (/\/assets\/(scenarios|planets|observer)\//.test(request.url()))
      legacyAssets.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/atlas');
  const gallery = page.getByRole('region', { name: 'Explore the ten worlds' });
  for (let i = 1; i <= 10; i++) {
    const choice = gallery.getByRole('button', { name: new RegExp(`^S${i}:`) });
    await choice.focus();
    await page.keyboard.press('Enter');
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(gallery.locator('[data-world-portrait]')).toHaveAttribute(
      'data-world-portrait',
      `S${i}`,
    );
    await expect(gallery.getByRole('link', { name: 'Explore this civilization' })).toHaveAttribute(
      'href',
      `/atlas/s${i}`,
    );
  }
  await gallery.getByRole('link', { name: 'Explore this civilization' }).click();
  await expect(page).toHaveURL(/\/atlas\/s10$/);
  await expect(page.locator('[data-world-portrait="S10"] canvas')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Observatory', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'See what survives the distance.',
  );
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Story', exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  expect(legacyAssets).toEqual([]);
});

test('all ten records serve the current portrait and remain available without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (let i = 1; i <= 10; i++) {
    const response = await page.goto(`/atlas/s${i}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator(`[data-world-portrait="S${i}"]`)).toBeVisible();
    await expect(page.getByRole('region', { name: `S${i} canonical overview` })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
  }
  await context.close();
});

test('the new explorers retain usable controls when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto('/atlas');
  const choices = page.getByRole('group', { name: 'Preview a world' });
  await choices.getByRole('button', { name: /^S6:/ }).click();
  await expect(page.locator('[data-world-portrait="S6"]')).toBeVisible();
  await page
    .getByRole('region', { name: 'Explore the ten worlds' })
    .getByRole('link', { name: 'Explore this civilization' })
    .click();
  await expect(page).toHaveURL(/\/atlas\/s6$/);
  await page.goto('/observatory?scenario=S4&instrument=habitable_worlds_observatory');
  await page
    .getByRole('group', { name: /Select future/ })
    .getByRole('button', { name: /^S9:/ })
    .click();
  await expect(page.locator('[data-world-portrait="S9"]')).toBeVisible();
  await page.getByRole('button', { name: 'Open data view' }).click();
  await expect(
    page.getByRole('table', { name: 'Five-method Figure 6 result for S9' }),
  ).toBeVisible();
});

test('desktop world rotation is keyboard accessible while reduced motion stays selected', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('janus-motion-preference', 'reduced'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/atlas');
  test.skip(
    !(await page.evaluate(() => matchMedia('(pointer: fine)').matches)),
    'Touch previews preserve vertical scrolling.',
  );
  const canvas = page.locator('[data-world-portrait] canvas');
  await expect(canvas).toHaveAttribute('data-planet-state', 'ready');
  await expect(canvas).toHaveAttribute('tabindex', '0');
  await expect(canvas).toHaveAttribute('aria-label', /Shift and arrow keys/);
  await canvas.focus();
  const before = await canvas.screenshot();
  for (let i = 0; i < 8; i++) await page.keyboard.press('Shift+ArrowRight');
  const after = await canvas.screenshot();
  expect(before.equals(after)).toBe(false);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
});
