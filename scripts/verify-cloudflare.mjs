import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
const origin =
  process.env.JANUS_PUBLIC_BASE_URL || 'https://janus-observatory.nicocerond.workers.dev';
const report = {
  origin,
  checkedAt: new Date().toISOString(),
  routes: [],
  models: [],
  downloads: [],
};
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const path of [
  '/',
  '/atlas',
  '/observatory',
  '/methods',
  '/sources',
  '/accessibility',
  '/privacy',
  '/research',
  '/research/concordia',
  '/research/resilience',
  ...Array.from({ length: 10 }, (_, i) => `/atlas/s${i + 1}`),
]) {
  const response = await fetch(origin + path);
  const html = await response.text();
  if (!response.ok || !html.includes('data-site-header'))
    throw new Error(`Route failed: ${path} (${response.status})`);
  if (html.includes('rel="canonical" href="http://localhost'))
    throw new Error(`Local canonical URL on ${path}`);
  report.routes.push({ path, status: response.status, bytes: Buffer.byteLength(html) });
}
const healthResponse = await fetch(origin + '/api/health');
const health = await healthResponse.json();
if (
  !healthResponse.ok ||
  health.status !== 'operational' ||
  health.research.liveCallsEnabled ||
  health.research.deepSeekConfigured ||
  health.research.embeddingsConfigured
)
  throw new Error('Unexpected public health state');
report.health = {
  status: health.status,
  dataVersion: health.data.version,
  canonicalDataReview: health.canonicalDataReview,
  liveCallsEnabled: health.research.liveCallsEnabled,
};
for (const path of [
  '/atlas/data?format=json',
  '/atlas/data?format=csv',
  '/api/downloads/independent-validation',
]) {
  const response = await fetch(origin + path);
  const data = Buffer.from(await response.arrayBuffer());
  const sha256 = digest(data);
  if (!response.ok || response.headers.get('x-janus-artifact-sha256') !== sha256)
    throw new Error(`Download hash mismatch: ${path}`);
  report.downloads.push({ path, bytes: data.length, sha256 });
}
const manifest = JSON.parse(
  await readFile(
    new URL('../docs/qa/cloudflare-release/model-transfer.json', import.meta.url),
    'utf8',
  ),
);
for (const model of manifest.models) {
  const path = '/assets/blender/' + model.path + '.gz';
  const response = await fetch(origin + path);
  const compressed = Buffer.from(await response.arrayBuffer());
  if (
    !response.ok ||
    digest(compressed) !== model.compressedSha256 ||
    digest(gunzipSync(compressed)) !== model.sha256
  )
    throw new Error(`Model hash mismatch: ${path}`);
  report.models.push({ path, status: response.status, bytes: compressed.length, lossless: true });
}
const missing = await fetch(origin + '/this-route-does-not-exist');
if (missing.status !== 404) throw new Error('Missing route did not return 404');
report.notFoundStatus = missing.status;
await writeFile(
  new URL('../docs/qa/cloudflare-release/public-verification.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  `Public verification passed: ${report.routes.length} pages, ${report.models.length} model hashes, ${report.downloads.length} downloads, health and 404.`,
);
