import { expect, test } from '@playwright/test';

test('model loading works without compression streams or background workers', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'DecompressionStream', { value: undefined });
    Object.defineProperty(window, 'Worker', { value: undefined });
  });
  await page.goto('/atlas');
  const canvas = page.locator('[data-world-portrait] canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-blender-state', 'ready');
  await expect(canvas).toHaveAttribute('data-blender-missing-parts', '');
});

test('decompression worker is released after loading and keeps the model available', async ({
  page,
}) => {
  const started: string[] = [];
  const closed: string[] = [];
  page.on('worker', (worker) => {
    started.push(worker.url());
    worker.on('close', () => closed.push(worker.url()));
  });
  await page.goto('/atlas');
  const canvas = page.locator('[data-world-portrait] canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-blender-state', 'ready');
  await expect.poll(() => started.length).toBeGreaterThan(0);
  await expect.poll(() => closed.length, { timeout: 10000 }).toBe(started.length);
  await expect(canvas).toHaveAttribute('data-blender-state', 'ready');
});

test('downloads retain their exact published hashes on the deployment runtime', async ({
  request,
}) => {
  for (const route of [
    '/atlas/data?format=json',
    '/atlas/data?format=csv',
    '/api/downloads/independent-validation',
  ]) {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
    const { createHash } = await import('node:crypto');
    expect(
      createHash('sha256')
        .update(await response.body())
        .digest('hex'),
    ).toBe(response.headers()['x-janus-artifact-sha256']);
    expect(response.headers()['content-disposition']).toContain('attachment;');
  }
  expect((await request.get('/atlas/data?format=invalid')).status()).toBe(400);
});

test('idle navigation never starts a speculative prefetch loop', async ({ page }) => {
  const prefetches: string[] = [];
  page.on('request', (request) => {
    if (request.headers()['next-router-prefetch']) prefetches.push(request.url());
  });
  await page.goto('/atlas');
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(5000);
  expect(prefetches).toEqual([]);
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Observatory', exact: true })
    .click();
  await expect(page).toHaveURL(/\/observatory$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(prefetches).toEqual([]);
});
