import { defineConfig, devices } from '@playwright/test';

const port = 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

// Hosted Linux runners give WebKit only software WebGL, where these long 3D journeys stall for
// minutes. In CI they run in Chromium, Firefox and mobile Chromium; WebKit runs them locally.
const webkitCiIgnore = process.env.CI
  ? [
      '**/cinematic.spec.ts',
      '**/chapter-sync.spec.ts',
      '**/deep-space.spec.ts',
      '**/organic-reveal.spec.ts',
      '**/spatial-system.spec.ts',
      '**/story-system.spec.ts',
      '**/telescope-flow.spec.ts',
      '**/world-explorer.spec.ts',
    ]
  : [];

export default defineConfig({
  testDir: './apps/web/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command:
      'pnpm --filter @janus/web build && pnpm --filter @janus/web start --hostname 127.0.0.1 --port 3100',
    env: {
      JANUS_ENABLE_HTTPS_UPGRADE: 'false',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 240_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: webkitCiIgnore,
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 15'] },
      testIgnore: webkitCiIgnore,
    },
  ],
});
