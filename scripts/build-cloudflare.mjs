import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = {
  ...process.env,
  JANUS_PUBLIC_BASE_URL:
    process.env.JANUS_PUBLIC_BASE_URL || 'https://janus-observatory.nicocerond.workers.dev',
  NEXT_PUBLIC_JANUS_COMPRESSED_MODELS: 'true',
  JANUS_RESEARCH_PREVIEW_ENABLED: 'false',
  JANUS_AGENT_LIVE_ENABLED: 'false',
  NEXT_PUBLIC_JANUS_TELEMETRY_ENABLED: 'false',
};
function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    if (capture) process.stderr.write((result.stdout || '') + (result.stderr || ''));
    process.exit(result.status || 1);
  }
  return (result.stdout || '') + (result.stderr || '');
}
run('pnpm', ['--filter', '@janus/web', 'exec', 'opennextjs-cloudflare', 'build']);
run('node', ['scripts/prepare-cloudflare-assets.mjs']);
await mkdir(join(root, 'tmp/cloudflare-dry'), { recursive: true });
const receipt = run(
  'pnpm',
  [
    'exec',
    'wrangler',
    'deploy',
    '--config',
    'apps/web/wrangler.jsonc',
    '--dry-run',
    '--outdir',
    join(root, 'tmp/cloudflare-dry'),
  ],
  true,
);
const compressedKiB = Number(receipt.match(/gzip: ([\d.]+) KiB/)?.[1]);
if (!compressedKiB || compressedKiB > 3072)
  throw new Error(`Worker exceeds the Free plan 3 MiB limit: ${compressedKiB} KiB`);
console.log(`Cloudflare Free bundle check passed: ${compressedKiB} KiB compressed.`);

// Fail closed if a local provider credential ever enters deployable code or assets.
const privateValues = [];
for (const directory of [root, join(root, 'apps/web')]) {
  for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    const text = await readFile(join(directory, name), 'utf8').catch(() => '');
    for (const line of text.split('\n')) {
      const match = line.match(/^([A-Z_0-9]*(?:KEY|TOKEN|SECRET)[A-Z_0-9]*)=(.*)$/);
      const value = match?.[2].trim().replace(/^['"]|['"]$/g, '');
      if (value && value.length > 12) privateValues.push(Buffer.from(value));
    }
  }
}
async function audit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await audit(file);
    else {
      const bytes = await readFile(file);
      if (privateValues.some((value) => bytes.includes(value)))
        throw new Error('Local credential found in deployment output. Upload prevented.');
    }
  }
}
await audit(join(root, 'tmp/cloudflare-dry'));
await audit(join(root, 'apps/web/.open-next/assets'));
await audit(join(root, 'apps/web/.open-next/cache'));
await writeFile(
  join(root, 'docs/qa/cloudflare-release/bundle.json'),
  JSON.stringify(
    {
      compressedWorkerKiB: compressedKiB,
      freeLimitKiB: 3072,
      localCredentialScan: 'passed',
      runtimeEnvironment: 'Wrangler bindings only',
    },
    null,
    2,
  ) + '\n',
);
console.log('Deployable code and static assets passed the local credential scan.');
