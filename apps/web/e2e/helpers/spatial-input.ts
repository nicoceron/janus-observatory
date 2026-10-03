import { expect, type Locator, type Page } from '@playwright/test';

/** Use native input on an animated target without requiring identical frames. */
export async function activateSpatialTarget(page: Page, target: Locator, isMobile: boolean) {
  await expect(target).toBeVisible();
  await expect(target).toBeEnabled();
  const readPoint = () =>
    target.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      const hit = document.elementFromPoint(x, y);
      return {
        x,
        y,
        receivesEvents: element.contains(hit),
        target: element.getAttribute('aria-label'),
        hit: hit?.outerHTML.slice(0, 300),
        viewport: [visualViewport?.offsetLeft, visualViewport?.offsetTop],
      };
    });
  let point = await readPoint();
  await expect
    .poll(
      async () => {
        point = await readPoint();
        return point;
      },
      { message: `the visible target must receive the native input: ${JSON.stringify(point)}` },
    )
    .toMatchObject({ receivesEvents: true });
  if (isMobile) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}
