import { defineConfig } from '@playwright/test';

const port = 3200;
const baseURL = process.env.PLAYWRIGHT_VISUAL_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './apps/web/e2e-visual',
  testMatch: 'visual-regression.spec.ts',
  outputDir: 'test-results/visual-regression',
  snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report/visual-regression' }]]
    : 'list',
  timeout: 90_000,
  expect: {
    timeout: 20_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      threshold: 0.1,
      maxDiffPixels: 120,
    },
  },
  use: {
    baseURL,
    colorScheme: 'dark',
    deviceScaleFactor: 1,
    locale: 'en-US',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command:
      'pnpm --filter @janus/web build && pnpm --filter @janus/web start --hostname 127.0.0.1 --port 3200',
    env: {
      JANUS_ENABLE_HTTPS_UPGRADE: 'false',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    reuseExistingServer: false,
    timeout: 240_000,
    url: baseURL,
  },
  projects: [
    {
      name: 'chromium-swiftshader-linux',
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: [
            '--enable-unsafe-swiftshader',
            '--font-render-hinting=none',
            '--force-color-profile=srgb',
            '--use-angle=swiftshader',
            '--use-gl=angle',
          ],
        },
      },
    },
  ],
});
