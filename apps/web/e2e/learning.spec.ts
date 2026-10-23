import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
});

test('complete the investigation with the keyboard, reload it, then return to the explorer', async ({
  page,
}) => {
  await page.goto('/observatory');
  const start = page.getByRole('button', { name: 'Start guided observation' });
  await start.focus();
  await page.keyboard.press('Enter');
  const choiceHeading = page.getByRole('heading', { name: 'What could an alien observer notice?' });
  await expect(choiceHeading).toBeFocused();
  await expect(page.getByRole('combobox', { name: 'Choose a scenario', exact: true })).toHaveValue(
    'S9',
  );
  await expect(page.getByRole('region', { name: 'Choose how to look' })).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
  const guess = page.getByRole('button', { name: 'Yes, it will pick something up', exact: true });
  await guess.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Now look at the evidence.' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Nothing is listed here.' })).toBeVisible();
  await expect(
    page.getByText('It does not establish that technology is absent.', { exact: false }),
  ).toBeVisible();
  const compare = page.getByRole('button', { name: 'Try another instrument' });
  await compare.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Same civilization. Another way to look.' }),
  ).toBeFocused();
  await expect(page.getByRole('combobox', { name: 'Compare with', exact: true })).toHaveValue(
    'deep_space_probes',
  );
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'The study lists these signs.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Nothing is listed here.' })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole('button', { name: 'Continue to free exploration' }).click();
  await expect(page.getByRole('heading', { name: 'Choose how to look' })).toBeFocused();
  await expect(page.getByRole('button', { name: /Visiting space probe/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(new URL(page.url()).searchParams.has('lesson')).toBe(false);
});

test('changing the scenario clears the previous guess and works without WebGL', async ({
  page,
}) => {
  await page.goto(
    '/observatory?scenario=S9&instrument=deep_space_probes&first=habitable_worlds_observatory&lesson=compare&guess=listed',
  );
  await page.getByRole('button', { name: 'Try another scenario' }).click();
  await page.getByRole('combobox', { name: 'Choose a scenario', exact: true }).selectOption('S4');
  await page
    .getByRole('combobox', { name: 'Choose an observing method', exact: true })
    .selectOption('large_interferometer_for_exoplanets');
  await page.getByRole('button', { name: 'I’m not sure yet' }).click();
  await expect(page.getByText('Target: S4', { exact: false })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('Infrared telescope array');
  await page.getByRole('button', { name: 'Skip to free exploration' }).click();
  await expect(page.getByRole('heading', { name: 'Choose how to look' })).toBeFocused();
  await expect(page.getByRole('button', { name: /Infrared telescope array/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('malformed lesson URLs keep the comparison methods distinct', async ({ page }) => {
  await page.goto(
    '/observatory?lesson=compare&instrument=habitable_worlds_observatory&first=INVALID',
  );
  await expect(page.getByRole('combobox', { name: 'Compare with', exact: true })).toHaveValue(
    'deep_space_probes',
  );
  await expect(page.getByRole('article').first()).toContainText('Optical space telescope');
  await page.goto('/observatory?lesson=INVALID');
  await expect(page.getByRole('heading', { name: 'Choose how to look' })).toBeVisible();
});

test('quantity tokens explain their model reference and retain the exact values', async ({
  page,
}) => {
  await page.goto('/atlas?lens=population');
  const chart = page.getByRole('region', { name: 'One dimension at a time.' });
  await expect(chart).toContainText('200 trillion');
  await expect(chart).toContainText('25 thousand × the study’s Earth population');
  await chart.getByRole('button', { name: 'Energy use', exact: true }).click();
  await expect(chart).toContainText('17 thousand × the study’s Earth energy use');
  await chart.getByText('What is “the study’s Earth”?').click();
  await expect(chart).toContainText('592.5 EJ per year');
  await expect(chart).toContainText('not a measurement of Earth today');
  await chart.getByText('Show as a table').click();
  await expect(chart.getByRole('table')).toContainText('1 × 10²⁵ joules a year');
  await page.goto('/atlas/s4');
  await expect(page.getByRole('region', { name: 'S4 at a glance' })).toContainText('400 million');
  await expect(page.getByRole('region', { name: 'S4 at a glance' })).toContainText(
    '0.051 × the study’s Earth energy use',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('new learning surfaces reflow at 320px without horizontal overflow', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const routes = [
    ['/observatory?lesson=predict&scenario=S9', 'What could an alien observer notice?'],
    [
      '/observatory?lesson=compare&scenario=S9&first=habitable_worlds_observatory&instrument=deep_space_probes',
      'Same civilization. Another way to look.',
    ],
    ['/atlas?lens=energy', 'One dimension at a time.'],
  ];
  for (const [route, name] of routes) {
    await page.goto(route!);
    const region = page.getByRole('region', { name, exact: true });
    await expect(region).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(dimensions.viewport).toBe(320);
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
    if (testInfo.project.name === 'chromium') {
      await region.screenshot({
        path: `docs/qa/observer-learning/${route!.startsWith('/atlas') ? 'mobile-energy' : route!.includes('compare') ? 'mobile-comparison' : 'mobile-choice'}.png`,
      });
    }
  }
});
