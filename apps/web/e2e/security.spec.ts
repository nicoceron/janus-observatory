import { expect, test } from '@playwright/test';

test('serves an enforced CSP for the static app and admitted spatial resources', async ({
  page,
}) => {
  const response = await page.goto('/');
  const csp = response?.headers()['content-security-policy'];

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("frame-src 'none'");
  expect(csp).not.toContain('spline.design');
  expect(csp).not.toContain('upgrade-insecure-requests');
  const scriptSources = csp
    ?.split(';')
    .find((directive) => directive.trim().startsWith('script-src'))
    ?.trim()
    .split(/\s+/);
  expect(scriptSources).toContain("'wasm-unsafe-eval'");
  expect(scriptSources).not.toContain("'unsafe-eval'");
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
});

test('does not send HSTS from the default local HTTP deployment', async ({ request }) => {
  const response = await request.get('/');
  expect(response.headers()['strict-transport-security']).toBeUndefined();
});
