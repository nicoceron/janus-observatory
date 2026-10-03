import { expect, test } from '@playwright/test';
import { storyHandoff } from './helpers/story-handoff';
test('companions emerge continuously behind Earth across the old midpoint and retrace on backscroll', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.goto('/');
  await expect(page.locator('[data-stage-status]')).toHaveAttribute('data-stage-status', 'ready', {
    timeout: 45000,
  });
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page.getByRole('button', { name: '03 S2 ↗', exact: true }).click();
  const anchors = await storyHandoff(page, 's2', 's3');
  const canvas = page.locator('canvas');
  const samples: { phase: number; reveal: number; position: number[] }[] = [];
  for (const phase of [3.3, 3.49, 3.51, 3.75, 4, 3.75, 3.51, 3.49, 3.3]) {
    await page.evaluate(
      ({ anchors, phase }) =>
        window.scrollTo(0, anchors[0] + (anchors[1] - anchors[0]) * (phase - 3)),
      { anchors, phase },
    );
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-scene')))
      .toBeCloseTo(phase, 2);
    const bodies = JSON.parse((await canvas.getAttribute('data-companion-reveal'))!);
    const moon = bodies.find((body: { id: string }) => body.id === '2:Moon');
    expect(moon).toBeDefined();
    expect(moon.visible).toBe(true);
    expect(moon.hasEarth).toBe(true);
    samples.push({ phase, reveal: moon.reveal, position: moon.position });
    if (info.project.name === 'chromium')
      await page.screenshot({
        path: `docs/qa/organic-reveal/frame-${samples.length}-${phase}.png`,
      });
    expect(await canvas.count()).toBe(1);
  }
  expect(samples[0].reveal).toBeLessThan(0.1);
  expect(samples[1].reveal).toBeGreaterThan(0.2);
  expect(samples[2].reveal).toBeLessThan(0.6);
  expect(samples[2].reveal - samples[1].reveal).toBeLessThan(0.08);
  expect(samples[4].reveal).toBe(1);
  for (let i = 0; i < 4; i++) expect(samples[i].reveal).toBeCloseTo(samples[8 - i].reveal, 1);
  await page.getByRole('button', { name: 'Index +', exact: true }).click();
  await page.getByRole('button', { name: '04 S3 ↗', exact: true }).click();
  await expect.poll(async () => Number(await canvas.getAttribute('data-scene'))).toBeCloseTo(4, 2);
  await expect(
    page.getByLabel('Explore S3 models', { exact: true }).getByRole('button'),
  ).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Inspect Luna', exact: true })).toBeVisible();
});
