import { expect, test } from '@playwright/test';

test('the story sky hydrates without console mismatches across browser engines', async ({
  page,
}, info) => {
  test.setTimeout(60000);
  const hydrationErrors: string[] = [];
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /hydrat|server rendered|server-rendered|did not match/i.test(message.text())
    )
      hydrationErrors.push(message.text());
  });
  page.on('pageerror', (error) => hydrationErrors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const response = await page.goto('/');
  const markup = await response!.text();
  expect(markup).toBeTruthy();
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready', {
    timeout: 45000,
  });
  const stars = page.locator('svg[data-space-stars] circle');
  await expect(stars).toHaveCount(365);
  const equal = await page.evaluate((svg) => {
    const server = new DOMParser()
      .parseFromString(svg, 'text/html')
      .querySelectorAll('svg[data-space-stars] circle');
    const client = document.querySelectorAll('svg[data-space-stars] circle');
    return (
      server.length === client.length &&
      [...server].every((star, i) =>
        ['cx', 'cy', 'r', 'fill', 'opacity'].every(
          (a) => star.getAttribute(a) === client[i].getAttribute(a),
        ),
      )
    );
  }, markup!);
  expect(equal).toBe(true);
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page.getByRole('button', { name: '04 S3 ↗', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', '4.000');
  await expect(
    page
      .getByLabel('Explore S3 models', { exact: true })
      .getByRole('button', { name: 'Inspect Earth', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: `docs/qa/galactic-settle/${info.project.name}-s3.png` });
  expect(hydrationErrors).toEqual([]);
});
