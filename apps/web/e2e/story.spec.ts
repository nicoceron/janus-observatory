import { expect, test, type Page } from '@playwright/test';

export async function jump(page: Page, label: string, id: string) {
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Story index' })
    .getByRole('button', { name: label })
    .click();
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', id);
}

test('the story is complete before WebGL and links every scenario to its data', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ten futures.One question.');
  await expect(page.locator('[data-world]')).toHaveCount(10);
  for (let i = 1; i <= 10; i++) {
    const world = page.locator(`[data-world="S${i}"]`);
    await expect(world.getByRole('link', { name: 'Explore this civilization ↗' })).toHaveAttribute(
      'href',
      `/atlas/s${i}`,
    );
    await expect(world.locator('a[href*="arxiv.org"]')).toHaveCount(0);
  }
  await expect(
    page.getByText('These are possibilities, not forecasts.', { exact: false }),
  ).toBeAttached();
  await expect(
    page.getByText('No detected signature by this method does not mean no technology.', {
      exact: true,
    }),
  ).toBeAttached();
});

test('keyboard jumps and fast reversals reconcile to the final chapter', async ({ page }) => {
  await page.goto('/');
  await jump(page, '10 S9 ↗', 's9');
  await page.locator('#s9').press('ArrowUp');
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', 's8');
  await page.locator('#s8').press('ArrowDown');
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', 's9');
  await page.locator('#s9').press('PageDown');
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', 's10');
  await page.locator('#s10').press('PageUp');
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', 's9');
  await jump(page, '00 First light ↗', 'first-light');
  await page.locator('#first-light').press('ArrowUp');
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', 'first-light');
});

test('the complete story retains its native data table without a reading-mode toolbar', async ({
  page,
}) => {
  await page.goto('/');
  await jump(page, '15 Civilizations breathe ↗', 'endurance');
  await page.getByText('Read the data table', { exact: true }).click();
  await expect(
    page
      .getByRole('table', { name: 'Published scenario population and annual energy use' })
      .getByRole('row'),
  ).toHaveCount(11);
  await expect(page.getByLabel('Story controls')).toHaveCount(0);
});

test('matrix preserves blanks and reports the selected canonical signatures', async ({ page }) => {
  await page.goto('/');
  await jump(page, '14 Ways of seeing ↗', 'signals');
  const matrix = page.locator('#signals table');
  await expect(matrix.getByRole('row')).toHaveCount(11);
  await expect(matrix.locator('tbody td')).toHaveCount(50);
  await expect(
    matrix.getByRole('link', { name: /S9, Habitable Worlds Observatory: no signature listed/ }),
  ).toHaveText('—');
  await matrix.getByRole('button', { name: 'S1', exact: false }).first().click();
  await expect(page.locator('[class*="signalReadout"]')).toContainText('CO2 + NO2');
  await expect(page.locator('[class*="signalReadout"]')).toContainText('radio beacon');
});

test('log chart selection exposes exact canonical values', async ({ page }) => {
  await page.goto('/');
  await jump(page, '15 Civilizations breathe ↗', 'endurance');
  await page
    .getByRole('group', { name: 'Inspect a civilization' })
    .getByRole('button', { name: 'S4', exact: true })
    .click();
  await expect(page.locator('[class*="chartReadout"]')).toContainText('400M');
  await expect(page.locator('[class*="chartReadout"]')).toContainText('3e+19 J');
  await page
    .getByRole('group', { name: 'Inspect a civilization' })
    .getByRole('button', { name: 'S9', exact: true })
    .click();
  await expect(page.locator('[class*="chartReadout"]')).toContainText('200T');
  await expect(page.locator('[class*="chartReadout"]')).toContainText('1e+25 J');
});

test('index closes with Escape and restores focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Story index' })
    .getByRole('button', { name: '10 S9 ↗' })
    .focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Story index' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Index +', exact: true })).toBeFocused();
});

test('the homepage uses full motion without changing the saved preference for research pages', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('janus-motion-preference', 'reduced'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-voyage]')).toHaveAttribute('data-mode', 'full');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  await expect(page.getByLabel('Motion preference')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('janus-motion-preference'))).toBe(
    'reduced',
  );
});

test('WebGL failure preserves story and offers a retry', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes('webgl')) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute(
    'data-stage-status',
    'fallback',
    { timeout: 20000 },
  );
  await expect(page.locator('[data-space-backdrop]')).toBeVisible();
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry 3D' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry 3D' }).click();
  await expect(page.locator('[data-stage-status]')).toHaveAttribute(
    'data-stage-status',
    'fallback',
  );
  await page.keyboard.press('Escape');
  await jump(page, '10 S9 ↗', 's9');
  await expect(page.locator('#s9')).toContainText('200T');
});

test('core narrative and source tables survive JavaScript being unavailable', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('[data-world]')).toHaveCount(10);
  await expect(page.locator('#signals table tbody tr')).toHaveCount(10);
  await expect(page.locator('#s9')).toContainText('200T');
  await context.close();
});
