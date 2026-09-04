import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

import {
  matchingSourceManifestEntries,
  SourceManifestSchema,
  type SourceManifest,
} from '@janus/domain';

import corpus from '../data/generated/research/corpus.json';
import sourceManifestJson from '../data/sources/manifest.json';

export function citationResolutionCount(
  manifest: SourceManifest,
  citation: { sourceId: string; sourceVersion: string },
): number {
  return matchingSourceManifestEntries(manifest, citation.sourceId, citation.sourceVersion).length;
}

async function filesBelow(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesBelow(path) : [path];
    }),
  );
  return files.flat();
}

const appRoot = 'apps/web/app';
const appFiles = (await filesBelow(appRoot)).filter((path) => /\.(?:ts|tsx)$/.test(path));
const routePatterns = appFiles
  .filter(
    (path) =>
      path.endsWith('/page.tsx') ||
      path === `${appRoot}/page.tsx` ||
      path.endsWith('/route.ts') ||
      path === `${appRoot}/route.ts`,
  )
  .map((path) => {
    const route = relative(appRoot, path)
      .replace(/(?:^|\/)(?:page|route)\.tsx?$/, '')
      .replaceAll('\\', '/');
    const escaped = `/${route}`
      .replace(/\/$/, '')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\[[^/]+\\\]/g, '[^/]+');
    return new RegExp(`^${escaped || '/'}(?:[?#].*)?$`);
  });

const missingRoutes: string[] = [];
for (const path of appFiles) {
  const source = await readFile(path, 'utf8');
  const hrefs = [...source.matchAll(/href\s*=\s*["'](\/[^"']*)["']/g)].map((match) => match[1]);
  for (const href of hrefs) {
    if (!routePatterns.some((pattern) => pattern.test(href))) {
      missingRoutes.push(`${path}: ${href}`);
    }
  }
}
if (missingRoutes.length > 0) {
  throw new Error(`Local links have no matching App Router page:\n${missingRoutes.join('\n')}`);
}

const sourceManifest = SourceManifestSchema.parse(sourceManifestJson);
for (const chunk of corpus.chunks) {
  if (citationResolutionCount(sourceManifest, chunk) !== 1) {
    throw new Error(
      `Corpus chunk ${chunk.chunkId} has unresolved citation ${chunk.sourceId}@${chunk.sourceVersion}.`,
    );
  }
  if (!chunk.contentHash.startsWith('sha256:') || chunk.text.trim().length === 0) {
    throw new Error(`Corpus chunk ${chunk.chunkId} is missing text or a content hash.`);
  }
}

process.stdout.write(
  `Validated local links across ${appFiles.length} route files and ${corpus.chunks.length} citation chunks.\n`,
);
