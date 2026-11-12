import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url).pathname;
const output = join(root, 'apps/web/.open-next/assets');
// Deployment configuration comes exclusively from Wrangler bindings. OpenNext otherwise
// copies local development .env files into this server module.
await writeFile(
  join(root, 'apps/web/.open-next/cloudflare/next-env.mjs'),
  'export const production = {};\nexport const development = {};\nexport const test = {};\n',
);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
// The Blender kit packs (Decision 038) are requested with their checksum in the query string
// (`kit-core.bin?v=<sha>`), so a pack's URL changes whenever its bytes do and it can be cached
// for good. They are already gzip-compressed and are staged as they are.
const kit = JSON.parse(
  await readFile(join(root, 'apps/web/app/planets/props/kit.generated.json'), 'utf8'),
);
for (const [name, pack] of Object.entries(kit.packs)) {
  const staged = await readFile(join(output, pack.path)).catch(() => null);
  if (!staged || hash(staged) !== pack.sha256 || staged.length !== pack.bytes)
    throw new Error(
      `Kit pack ${name} is missing from the deployment or does not match its manifest.`,
    );
}
const manifest = JSON.parse(await readFile(join(root, 'data/generated/manifest.json'), 'utf8'));
for (const path of [
  'downloads/janus-observatory-1.0.0.json',
  'downloads/janus-scenarios-1.0.0.csv',
  'collapse/independent-validation.json',
]) {
  const body = await readFile(join(root, 'data/generated', path));
  const declared = manifest.files.find((file) => file.path === path);
  if (!declared || hash(body) !== declared.sha256 || body.length !== declared.bytes)
    throw new Error(`Generated artifact mismatch: ${path}`);
  const destination = join(output, 'cdn-cgi/janus-artifacts', path);
  await mkdir(join(destination, '..'), { recursive: true });
  await writeFile(destination, body);
}
await writeFile(
  join(output, '_headers'),
  `/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
/assets/kit/*
  Cache-Control: public, max-age=31536000, immutable
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
`,
);
// Receipt of what this deployment publishes for the artwork: the kit packs, as staged.
const report = {
  note: 'The Blender kit packs (Decision 038), staged as built: already gzip-compressed and requested with their checksum in the query string.',
  packs: Object.entries(kit.packs).map(([name, pack]) => ({
    name,
    path: pack.path,
    bytes: pack.bytes,
    decodedBytes: pack.rawBytes,
    sha256: pack.sha256,
  })),
  bytes: Object.values(kit.packs).reduce((sum, pack) => sum + pack.bytes, 0),
};
await mkdir(join(root, 'docs/qa/cloudflare-release'), { recursive: true });
await writeFile(
  join(root, 'docs/qa/cloudflare-release/kit-packs.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify({ kitPacks: report.packs.length, bytes: report.bytes }));
