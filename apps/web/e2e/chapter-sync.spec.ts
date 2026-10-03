import { expect, test } from '@playwright/test';

test('scenario copy and worlds share arrivals, holds and reverse transitions', async ({
  page,
  isMobile,
}, info) => {
  // Eleven forward/reverse samples plus diagnostic captures use one WebGL
  // context; allow a bounded minute on Safari's software renderer.
  test.setTimeout(60000);
  await page.goto('/#s3');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene', '4.000', { timeout: 60000 });
  const copy = page.locator('#s3 [data-chapter-copy]');
  await expect(copy).toHaveCount(1);
  const phone = isMobile;
  await expect(page.locator('#s3 [data-copy-slot]')).toHaveAttribute(
    'data-copy-layout',
    phone ? 'flow' : 'staged',
  );
  const start = await page.evaluate(() => scrollY);
  if (phone) {
    const end = await page
      .locator('#s3 [data-copy-slot]')
      .evaluate((el) => el.getBoundingClientRect().bottom + scrollY - innerHeight * 0.45);
    const y = (start + end) / 2;
    await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);
    await expect(canvas).toHaveAttribute('data-scene', '4.000');
    await expect(copy).toBeVisible();
    await page.screenshot({ path: `docs/qa/chapter-sync/${info.project.name}-reading.png` });
  } else {
    const anchor = await page
      .locator('#s4')
      .evaluate(
        (el) =>
          el.getBoundingClientRect().top +
          scrollY +
          ((el as HTMLElement).offsetHeight - innerHeight) / 2,
      );
    const read = async () =>
      page.evaluate(() => ({
        progress: Number(
          document.querySelector('[data-voyage]')!.getAttribute('data-presentation-progress'),
        ),
        sky: Number(
          document.querySelector('[data-space-backdrop]')!.getAttribute('data-sky-progress'),
        ),
        visible: [...document.querySelectorAll<HTMLElement>('[data-chapter-copy]')]
          .filter((el) => Number(getComputedStyle(el).opacity) > 0.5)
          .map((el) => el.closest('section')!.id),
      }));
    for (const fraction of [0, 0.08, 0.25, 0.45, 0.55, 0.75, 0.92, 1, 0.75, 0.25, 0]) {
      await page.evaluate(
        (y) => scrollTo({ top: y, behavior: 'instant' }),
        start + (anchor - start) * fraction,
      );
      await expect
        .poll(async () => Number(await canvas.getAttribute('data-scene')))
        .toBeCloseTo(4 + fraction, 2);
      const state = await read();
      expect(state.progress).toBeCloseTo(4 + fraction, 2);
      expect(state.sky).toBe(state.progress);
      if (fraction <= 0.25) expect(state.visible).toEqual(['s3']);
      if (fraction >= 0.75) expect(state.visible).toEqual(['s4']);
      if (fraction === 0.08) {
        expect(
          await copy.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return Math.abs(r.y + r.height / 2 - innerHeight / 2);
          }),
        ).toBeLessThan(1);
      }
      if ([0, 0.25, 0.55, 0.75, 1].includes(fraction))
        await page.screenshot({
          path: `docs/qa/chapter-sync/${info.project.name}-${fraction}.png`,
        });
    }
    await expect(page.locator('#s4 [data-chapter-copy]')).toHaveAttribute('inert', '');
    await expect(page.locator('#s3 [data-chapter-copy]')).not.toHaveAttribute('inert', '');
    await page
      .getByRole('link', { name: 'Explore this civilization ↗', exact: true })
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/\/atlas\/s3$/);
  }
});

test('short viewports and reduced motion keep one naturally readable narrative', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#s3');
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', '4.000', { timeout: 60000 });
  await expect(page.locator('#s3 [data-copy-slot]')).toHaveAttribute('data-copy-layout', 'flow');
  await expect(page.locator('#s3 [data-chapter-copy]')).not.toHaveAttribute('inert', '');
  if (info.project.name === 'chromium') {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1280, height: 450 });
    await expect(page.locator('#s3 [data-copy-slot]')).toHaveAttribute('data-copy-layout', 'flow');
    await expect(page.locator('#s3 [data-chapter-copy]')).toBeVisible();
  }
});
