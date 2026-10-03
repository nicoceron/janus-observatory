import { observingMissionIds } from '@janus/domain/scientific-dataset';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function geometry(page: Page) {
  return page.evaluate(() => {
    const portrait = document.querySelector<HTMLElement>('[data-world-portrait]')!;
    const controls = document.querySelector<HTMLElement>('[class*="__controls"]')!;
    const rect = (element: Element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y: y + scrollY, width, height };
    };
    return {
      scrollY,
      controls: rect(controls),
      portrait: rect(portrait),
      viewport: rect(portrait.parentElement!),
    };
  });
}

function expectStable(actual: Awaited<ReturnType<typeof geometry>>, baseline: typeof actual) {
  expect(
    Math.abs(actual.scrollY - baseline.scrollY),
    'page must not scroll on selection',
  ).toBeLessThan(1);
  for (const area of ['controls', 'portrait', 'viewport'] as const) {
    for (const dimension of ['x', 'y', 'width', 'height'] as const) {
      expect(
        Math.abs(actual[area][dimension] - baseline[area][dimension]),
        `${area}.${dimension}`,
      ).toBeLessThan(1);
    }
  }
}

for (const instrument of observingMissionIds) {
  test(`all ten planets keep their stage and selectors stationary with ${instrument}`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(`/observatory?scenario=S3&instrument=${instrument}`);
    await page.evaluate(() => document.fonts.ready);
    const futures = page.getByRole('group', { name: '01 · Select future' });
    const methods = page.getByRole('group', { name: '02 · Select observing concept' });
    const method = methods.locator(`[data-telemetry-value="${instrument}"]`);
    await expect(method).toHaveAttribute('aria-pressed', 'true');
    await futures.evaluate((element) =>
      element.scrollIntoView({ block: 'center', behavior: 'instant' }),
    );
    await futures.getByRole('button', { name: /^S3:/ }).click();
    await expect(futures.getByRole('button', { name: /^S3:/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const baseline = await geometry(page);
    for (const id of [1, 9, 2, 4, 5, 6, 7, 8, 10, 3]) {
      const button = futures.getByRole('button', { name: new RegExp(`^S${id}:`) });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator(`[data-world-portrait="S${id}"]`)).toHaveCount(1);
      expectStable(await geometry(page), baseline);
      const result = page.locator(`[data-scenario-evidence="S${id}"]`);
      await expect(result.getByRole('heading')).toBeVisible();
      await expect(page.locator('[aria-live="polite"]').getByRole('link')).toHaveCount(1);
      const bounds = await result.evaluate((element) => {
        const panel = element.getBoundingClientRect();
        return [...element.children].every((child) => {
          const rect = child.getBoundingClientRect();
          return (
            rect.left >= panel.left - 1 &&
            rect.right <= panel.right + 1 &&
            rect.bottom <= panel.bottom + 1
          );
        });
      });
      expect(bounds, 'all evidence must fit without clipping').toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test('320px keyboard switching stays stable with reduced motion and no WebGL', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto('/observatory?scenario=S3');
  await page.evaluate(() => document.fonts.ready);
  const futures = page.getByRole('group', { name: '01 · Select future' });
  await futures.evaluate((element) =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  await futures.getByRole('button', { name: /^S3:/ }).focus();
  const baseline = await geometry(page);
  for (const id of [4, 5, 6, 7, 8, 9, 10]) {
    const button = futures.getByRole('button', { name: new RegExp(`^S${id}:`) });
    await button.focus();
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toBeFocused();
    expectStable(await geometry(page), baseline);
  }
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Out of Eden', exact: true })).toHaveCount(1);
  const results = await new AxeBuilder({ page })
    .include('[aria-labelledby="alien-console-title"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('selectors remain reachable at both sides of the stacked layout breakpoint', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/observatory?scenario=S1');
  const explorer = page.getByRole('region', { name: 'Choose how to look', exact: true });
  for (const width of [1080, 1081, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const clipped = await explorer.evaluate((element) => {
      const panel = element.getBoundingClientRect();
      return [...element.querySelectorAll('button')]
        .filter((button) => {
          const rect = button.getBoundingClientRect();
          return rect.left < panel.left || rect.right > panel.right;
        })
        .map((button) => button.textContent);
    });
    expect(clipped, `selectors at ${width}px`).toEqual([]);
  }
});
