/**
 * Visual audit of the faceted worlds: every story chapter at rest, every world and destination in
 * the explorer, and the atlas pages, on a GPU-backed Chromium.
 *
 * Usage: tsx scripts/capture-faceted-audit.ts <out-dir>
 *   PLAYWRIGHT_BASE_URL  server to capture (default http://127.0.0.1:3301)
 *   JANUS_QA_MOBILE=1    iPhone-sized viewport
 *   JANUS_QA_PARTS       comma list of story,explore,atlas (default all)
 *   JANUS_QA_WORLDS      comma list of scenario numbers to explore (default 1-10)
 */
import { chromium, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const out = resolve(process.argv[2] ?? 'tmp/faceted-audit');
const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3301';
const mobile = process.env.JANUS_QA_MOBILE === '1';
const parts = (process.env.JANUS_QA_PARTS ?? 'story,explore,atlas').split(',');
const worlds = (process.env.JANUS_QA_WORLDS ?? '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=metal'] });
const page = await browser.newPage({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  deviceScaleFactor: mobile ? 3 : 1,
  isMobile: mobile,
  hasTouch: mobile,
});
const errors: string[] = [];
const receipts: Record<string, unknown> = {};
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});

const canvas = page.locator('canvas').first();

async function chapter(p: Page, label: string, id: string) {
  await p.getByRole('button', { name: 'Chapters', exact: true }).click();
  await p
    .getByRole('navigation', { name: 'Story chapters' })
    .getByRole('button', { name: label })
    .click();
  await expect(p.locator('[data-voyage]')).toHaveAttribute('data-active-chapter', id, {
    timeout: 20000,
  });
}

async function settle(ms = 1800) {
  await expect(canvas).not.toHaveAttribute('data-blender-state', 'loading', { timeout: 60000 });
  // Keep the pointer off the canvas so hover rings and labels stay out of the captures.
  await page.mouse.move(2, mobile ? 840 : 896);
  await page.waitForTimeout(ms);
}

try {
  if (parts.includes('story') || parts.includes('explore')) {
    await page.goto(base);
    await expect(canvas).toHaveAttribute('data-blender-state', /ready|fallback/, {
      timeout: 60000,
    });
    await page.waitForTimeout(2500);
  }

  if (parts.includes('story')) {
    const entries: [string, string][] = [
      ['first-light', '00 First light'],
      ['possibilities', '01 Ten possible worlds'],
      ...Array.from({ length: 10 }, (_, i): [string, string] => [
        `s${i + 1}`,
        `${String(i + 2).padStart(2, '0')} S${i + 1} `,
      ]),
      ['observer', '12 The other side'],
      ['invisible', '13 Hidden in plain sight'],
      ['signals', '14 Ways of seeing'],
      ['endurance', '15 Civilizations breathe'],
      ['beyond', '16 Keep looking'],
    ];
    for (const [id, label] of entries) {
      await chapter(page, label, id);
      await settle();
      await page.screenshot({ path: resolve(out, `story-${id}.png`) });
      receipts[`story-${id}`] = await canvas.evaluate((el) => ({ ...(el as HTMLElement).dataset }));
    }
  }

  if (parts.includes('explore')) {
    for (const world of worlds) {
      await chapter(page, `${String(world + 1).padStart(2, '0')} S${world} `, `s${world}`);
      await settle(600);
      await page
        .getByLabel(`Explore S${world} models`, { exact: true })
        .getByRole('button', { name: 'Inspect Earth', exact: true })
        .click();
      await settle(1200);
      await page.screenshot({ path: resolve(out, `explore-s${world}-earth.png`) });
      const dialog = page.getByRole('dialog');
      const destinations = await dialog
        .getByRole('navigation', { name: 'Select a world' })
        .getByRole('button')
        .allTextContents();
      for (const raw of destinations) {
        const name = raw.replace('↗', '').trim();
        if (name === 'Earth') continue;
        await dialog
          .getByRole('navigation', { name: 'Select a world' })
          .getByRole('button', { name, exact: true })
          .click();
        await settle(1000);
        await page.screenshot({
          path: resolve(out, `explore-s${world}-${name.replaceAll(/[^A-Za-z0-9]+/g, '-')}.png`),
        });
      }
      // Every landmark on Earth, one close look each.
      await dialog
        .getByRole('navigation', { name: 'Select a world' })
        .getByRole('button', { name: /^Earth/ })
        .click();
      await settle(600);
      const objects = dialog.locator('[class*="inspectObjects"] button');
      const count = await objects.count();
      for (let i = 0; i < count; i++) {
        const name = (await objects.nth(i).textContent())?.trim() ?? `object-${i}`;
        await objects.nth(i).click();
        await settle(900);
        await page.screenshot({
          path: resolve(out, `explore-s${world}-obj-${name.replaceAll(/[^A-Za-z0-9]+/g, '-')}.png`),
        });
        await dialog
          .getByRole('navigation', { name: 'Select a world' })
          .getByRole('button', { name: /^Earth/ })
          .click();
        await settle(400);
      }
      await page.getByRole('button', { name: 'Close world explorer', exact: true }).click();
    }
  }

  if (parts.includes('atlas')) {
    for (const path of ['/atlas', ...worlds.map((w) => `/atlas/s${w}`), '/observatory']) {
      await page.goto(base + path);
      await page.waitForTimeout(4500);
      await page.screenshot({
        path: resolve(out, `page${path.replaceAll('/', '-')}.png`),
        fullPage: false,
      });
    }
  }
} finally {
  await writeFile(
    resolve(out, 'receipt.json'),
    JSON.stringify({ base, mobile, errors, receipts }, null, 2),
  );
  await browser.close();
}
