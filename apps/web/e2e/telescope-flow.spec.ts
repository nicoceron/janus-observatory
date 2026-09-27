import { expect, test } from '@playwright/test';
test('telescope passage is continuous and the closing Earth scrolls with its section', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready', {
    timeout: 45000,
  });
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page.getByRole('button', { name: '12 The other side ↗', exact: true }).click();
  const anchors = await page.evaluate(() =>
    ['observer', 'invisible'].map((id) => {
      const el = document.getElementById(id)!;
      return (
        el.getBoundingClientRect().top + scrollY + Math.max(0, (el.offsetHeight - innerHeight) / 2)
      );
    }),
  );
  const canvas = page.locator('canvas');
  for (const phase of [12, 12.35, 12.65, 12.85, 13, 12.85, 12.35, 12]) {
    await page.evaluate(
      ({ anchors, phase }) => scrollTo(0, anchors[0] + (anchors[1] - anchors[0]) * (phase - 12)),
      { anchors, phase },
    );
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-scene')))
      .toBeCloseTo(phase, 2);
    await page.screenshot({ path: `docs/qa/telescope-flow/${info.project.name}-${phase}.png` });
    const travel = JSON.parse((await canvas.getAttribute('data-optical-travel'))!);
    if (phase === 13) expect(travel.telescopeVisible).toBe(false);
  }
  await expect(page.locator('[class*="targetReticle"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page.getByRole('button', { name: '16 Keep looking ↗', exact: true }).click();
  await expect.poll(async () => Number(await canvas.getAttribute('data-scene'))).toBeCloseTo(16, 2);
  const start = await page.evaluate(() => scrollY);
  const positions: number[] = [];
  for (const delta of [0, 160, 320, 160, 0]) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), start + delta);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(start + delta, 0);
    await expect
      .poll(async () => {
        const rendered = JSON.parse((await canvas.getAttribute('data-closing-center'))!);
        return page.locator('[data-closing-portrait]').evaluate((el, rendered) => {
          const r = el.getBoundingClientRect(),
            c = document.querySelector('canvas')!.getBoundingClientRect();
          return Math.hypot(
            r.x + r.width / 2 - c.x - rendered[0],
            r.y + r.height / 2 - c.y - rendered[1],
          );
        }, rendered);
      })
      .toBeLessThan(1);
    positions.push(
      await canvas.evaluate((el) => {
        const center = JSON.parse(el.getAttribute('data-closing-center')!);
        return center[1] + el.getBoundingClientRect().top;
      }),
    );
    await page.screenshot({
      path: `docs/qa/telescope-flow/${info.project.name}-closing-${delta}.png`,
    });
  }
  expect(positions[0] - positions[2]).toBeCloseTo(320, 0);
  expect(positions[0]).toBeCloseTo(positions[4], 0);
  expect(errors).toEqual([]);
});
