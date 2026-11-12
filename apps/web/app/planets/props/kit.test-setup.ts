import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import manifest from './kit.generated.json';
import { decodePack, kitReady } from './pack';

/** Unit tests build worlds synchronously, so the kit packs are decoded from disk up front. */
const publicRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../public');
if (!kitReady('all'))
  for (const [name, pack] of Object.entries(manifest.packs))
    decodePack(gunzipSync(readFileSync(join(publicRoot, pack.path))), name);
