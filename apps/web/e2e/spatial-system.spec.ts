import { expect, test } from '@playwright/test';

test.setTimeout(60000);

test('names appear only on demand and interaction follows the scene through motion and backscroll', async ({
  page,
  isMobile,
}, info) => {
  await page.goto('/');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready', {
    timeout: 45000,
  });
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page.getByRole('button', { name: '04 S3 ↗', exact: true }).click();
  const region = page.getByLabel('Explore S3 models', { exact: true });
  const earth = region.getByRole('button', { name: 'Inspect Earth', exact: true });
  const moon = region.getByRole('button', { name: 'Inspect Luna', exact: true });
  const mars = region.getByRole('button', { name: 'Inspect Mars', exact: true });
  await expect(earth).toHaveAttribute('data-spatial-visible', 'true');
  await page.mouse.move(0, 0);
  const label = earth.locator('span[aria-hidden]');
  await expect(label).toHaveCSS('opacity', '0');
  expect(Number(await moon.getAttribute('data-depth'))).toBeGreaterThan(
    Number(await earth.getAttribute('data-depth')),
  );
  expect(Number(await mars.getAttribute('data-depth'))).toBeLessThan(
    Number(await earth.getAttribute('data-depth')),
  );
  if (!isMobile) {
    await earth.hover();
    await expect(label).toHaveCSS('opacity', '1');
    await page.mouse.move(0, 0);
    await expect(label).toHaveCSS('opacity', '0');
  }
  await page.keyboard.press('Tab');
  await expect(earth).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(moon).toBeFocused();
  await expect(moon.locator('span[aria-hidden]')).toHaveCSS('opacity', '1');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Luna', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(moon).toBeFocused();
  const original = await earth.boundingBox();
  const scroll = await page.evaluate(() => scrollY);
  const travel = await page
    .locator('#s3')
    .evaluate((el) => el.getBoundingClientRect().height * 0.25);
  await page.evaluate((distance) => window.scrollBy(0, distance), travel);
  await expect
    .poll(async () => {
      const current = (await earth.boundingBox())!;
      return Math.hypot(current.x - original!.x, current.y - original!.y);
    })
    .toBeGreaterThan(1);
  // Compare in canvas coordinates: mobile Safari can offset the visual viewport while scrolling.
  // Read both rectangles in the same task to catch stale targets without mixing coordinate spaces.
  const offsets = await region.locator('[data-spatial-visible="true"]').evaluateAll((elements) =>
    elements.map((el) => {
      const [x, y] = (el as HTMLElement).dataset.projectedCenter!.split(',').map(Number);
      const r = el.getBoundingClientRect();
      const canvasRect = document.querySelector('canvas')!.getBoundingClientRect();
      return {
        error: Math.hypot(
          r.x + r.width / 2 - x - canvasRect.x,
          r.y + r.height / 2 - y - canvasRect.y,
        ),
        name: el.getAttribute('aria-label'),
        projected: [x, y],
        rect: [r.x, r.y, r.width, r.height],
        transform: getComputedStyle(el).transform,
        viewport: [visualViewport?.offsetLeft, visualViewport?.offsetTop],
        scroll: scrollY,
      };
    }),
  );
  expect(Math.max(...offsets.map((p) => p.error)), JSON.stringify(offsets)).toBeLessThan(0.05);
  await page.evaluate((y) => window.scrollTo(0, y), scroll);
  await expect
    .poll(async () => Number(await page.locator('canvas').getAttribute('data-scene')))
    .toBeCloseTo(4, 2);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `docs/qa/spatial-systems/${info.project.name}-interaction.png` });
});
