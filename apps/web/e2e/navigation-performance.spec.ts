import { expect, test } from '@playwright/test';

test('every main route uses the same navigation and a working story index', async ({ page }) => {
  let reference: unknown;
  for (const route of [
    '/',
    '/atlas',
    '/observatory',
    '/atlas/s6',
    '/methods',
    '/sources',
    '/this-route-does-not-exist',
  ]) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    const header = page.locator('[data-site-header]');
    await expect(header).toBeVisible();
    const appearance = await header.evaluate((element) => {
      const r = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        padding: css.padding,
        background: css.backgroundImage,
        links: [...element.querySelectorAll('nav[aria-label="Primary navigation"] a')].map((a) => ({
          text: a.textContent,
          href: a.getAttribute('href'),
          font: getComputedStyle(a).font,
          x: Math.round(a.getBoundingClientRect().x),
        })),
      };
    });
    if (!reference) reference = appearance;
    expect(appearance).toEqual(reference);
    await header.getByRole('button', { name: 'Index +', exact: true }).click();
    const index = page.getByRole('navigation', { name: 'Story index' });
    await expect(index).toBeVisible();
    await expect(index.getByText('Ten possible worlds', { exact: false })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(index).toHaveCount(0);
    await expect(header.getByRole('button', { name: 'Index +', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  }
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Atlas', exact: true })
    .click();
  await expect(page).toHaveURL(/\/atlas$/);
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Story index' })
    .getByRole('link', { name: '04 S3 ↗', exact: true })
    .click();
  await expect(page).toHaveURL(/\/#s3$/);
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready');
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', 's3');
});

test('render resolution remains fixed while the model animates', async ({ page }) => {
  await page.goto('/atlas');
  const canvas = page.locator('[data-world-portrait] canvas');
  await expect(canvas).toHaveAttribute('data-planet-state', 'ready');
  await canvas.scrollIntoViewIfNeeded();
  const size = await canvas.evaluate((c) => ({
    buffer: (c as HTMLCanvasElement).width,
    css: c.clientWidth,
    dpr: Math.min(devicePixelRatio, 1.5),
  }));
  expect(Math.abs(size.buffer - size.css * size.dpr)).toBeLessThanOrEqual(1);
  // Exercise several of the old adaptive-resolution sampling windows.
  await page.waitForTimeout(6000);
  expect(await canvas.evaluate((c) => (c as HTMLCanvasElement).width)).toBe(size.buffer);
});
