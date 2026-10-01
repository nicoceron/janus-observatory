import { gzipSync } from 'node:zlib';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

type BuildManifest = {
  polyfillFiles?: string[];
  rootMainFiles?: string[];
};

type ClientReferenceManifest = {
  entryJSFiles?: Record<string, string[]>;
};

type LoadableManifest = Record<string, { files?: string[] }>;

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

function failUnverified(reason: string): never {
  throw new Error(`UNVERIFIED_BUDGET: ${reason}`);
}

function setDifference(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((value) => !right.has(value)).sort();
}

function parseHomeClientManifest(source: string): ClientReferenceManifest {
  const match = source.match(/__RSC_MANIFEST\["\/page"\] = (\{.*\});\s*$/s);
  if (!match?.[1]) failUnverified('Next 16 home client-reference manifest was not parseable.');
  try {
    return JSON.parse(match[1]) as ClientReferenceManifest;
  } catch {
    failUnverified('Next 16 home client-reference manifest contained invalid JSON.');
  }
}

function localScriptSources(html: string): { modern: Set<string>; legacy: Set<string> } {
  const modern = new Set<string>();
  const legacy = new Set<string>();
  for (const match of html.matchAll(/<script\b[^>]*\bsrc="([^"]+\.js)"[^>]*><\/script>/g)) {
    const tag = match[0];
    const source = match[1];
    if (!source.startsWith('/_next/')) continue;
    const normalized = source.slice('/_next/'.length);
    (tag.includes('noModule') ? legacy : modern).add(normalized);
  }
  return { modern, legacy };
}

/**
 * Audit the relative source graph reachable from the home route, including dynamic imports. The
 * low-poly worlds are procedural, so no reachable home source may reference a public asset.
 */
async function homeAssetSources() {
  const pending = ['apps/web/app/page.tsx', 'apps/web/app/layout.tsx'].map((path) => resolve(path));
  const sources = new Map<string, string>();
  while (pending.length) {
    const path = pending.pop()!;
    if (sources.has(path)) continue;
    const source = await readFile(path, 'utf8');
    sources.set(path, source);
    if (extname(path) === '.json' || extname(path) === '.css') continue;
    for (const reference of ts.preProcessFile(source, true, true).importedFiles) {
      if (!reference.fileName.startsWith('.')) continue;
      const target = resolve(dirname(path), reference.fileName);
      const candidates = extname(target)
        ? [target]
        : [
            target + '.ts',
            target + '.tsx',
            target + '.js',
            target + '.jsx',
            target + '.json',
            join(target, 'index.ts'),
            join(target, 'index.tsx'),
          ];
      let found = false;
      for (const candidate of candidates) {
        if (!(await stat(candidate).catch(() => null))?.isFile()) continue;
        pending.push(candidate);
        found = true;
        break;
      }
      if (!found)
        failUnverified(
          `could not inspect relative home import ${reference.fileName} from ${relative('.', path)}.`,
        );
    }
  }
  for (const [path, source] of sources)
    if (/\/assets\//.test(source))
      failUnverified(
        `unexpected home asset reference in ${relative('.', path)}; update the guided-path accounting before accepting it.`,
      );
  if (![...sources.keys()].some((path) => path.endsWith('/app/planets/catalog.ts')))
    failUnverified('the procedural world catalog is no longer reachable from the home route.');
  return {
    references: [] as { path: string; asset: string; kind: string }[],
    files: [...sources.keys()].map((path) => relative('.', path)).sort(),
  };
}

const nextRoot = 'apps/web/.next';
const staticChunkRoot = join(nextRoot, 'static/chunks');
const maximumInitialJavaScriptGzip = 250 * 1024;
const maximumChunkGzip = 250 * 1024;
const maximumRuntimeAsset = 4 * 1024 * 1024;
const maximumMobileCriticalVisual = 1.5 * 1024 * 1024;
const maximumDesktopCriticalVisual = 3 * 1024 * 1024;
const maximumGuidedPathPayload = 20 * 1024 * 1024;

const buildManifest = JSON.parse(
  await readFile(join(nextRoot, 'build-manifest.json'), 'utf8'),
) as BuildManifest;
const clientManifest = parseHomeClientManifest(
  await readFile(join(nextRoot, 'server/app/page_client-reference-manifest.js'), 'utf8'),
);
const loadableManifest = JSON.parse(
  await readFile(join(nextRoot, 'server/app/page/react-loadable-manifest.json'), 'utf8'),
) as LoadableManifest;
const homeHtml = await readFile(join(nextRoot, 'server/app/index.html'), 'utf8');
const homeHead = homeHtml.slice(0, homeHtml.indexOf('</head>'));
if (!homeHead) failUnverified('home HTML did not contain a parseable head.');

const homeEntry = Object.entries(clientManifest.entryJSFiles ?? {}).find(([key]) =>
  key.endsWith('/apps/web/app/page'),
);
if (!homeEntry || !buildManifest.rootMainFiles) {
  failUnverified('Next 16 did not expose root and home entry JavaScript in its build manifests.');
}

const htmlScripts = localScriptSources(homeHtml);
// Next 16.3's App Router manifest contains entries for the page, inherited layouts,
// metadata, and error boundaries. The prerendered HTML selects the subset that the
// browser actually requests on first load, so use that emitted graph for the budget
// while requiring every script to be accounted for by a production manifest.
const manifestJavaScript = new Set([
  ...buildManifest.rootMainFiles,
  ...Object.values(clientManifest.entryJSFiles ?? {}).flat(),
]);
const requiredHomeJavaScript = new Set([...buildManifest.rootMainFiles, ...homeEntry[1]]);
const initialJavaScript = htmlScripts.modern;
const missingFromHtml = setDifference(requiredHomeJavaScript, initialJavaScript);
const unexplainedInHtml = setDifference(initialJavaScript, manifestJavaScript);
if (missingFromHtml.length > 0 || unexplainedInHtml.length > 0) {
  failUnverified(
    `home manifest/HTML script graph disagrees (missing required: ${missingFromHtml.join(', ') || 'none'}; ` +
      `unexplained: ${unexplainedInHtml.join(', ') || 'none'}).`,
  );
}

const deferredChunks = new Set(
  Object.values(loadableManifest).flatMap(({ files = [] }) =>
    files.filter((file) => file.endsWith('.js')),
  ),
);
const deferredThreeChunks = new Set<string>();
for (const chunk of deferredChunks) {
  const contents = await readFile(join(nextRoot, chunk), 'utf8');
  if (contents.includes('@react-three') || contents.includes('THREE'))
    deferredThreeChunks.add(chunk);
}
const deferredLoadedInitially = [...deferredThreeChunks].filter((chunk) =>
  initialJavaScript.has(chunk),
);
if (deferredLoadedInitially.length > 0) {
  throw new Error(
    `Deferred R3F/Three chunks leaked into the home initial graph:\n${deferredLoadedInitially.join('\n')}`,
  );
}

const initialJavaScriptReport = await Promise.all(
  [...initialJavaScript].sort().map(async (path) => ({
    path,
    gzipBytes: gzipSync(await readFile(join(nextRoot, path))).byteLength,
  })),
);
const initialJavaScriptGzip = initialJavaScriptReport.reduce(
  (total, { gzipBytes }) => total + gzipBytes,
  0,
);
if (initialJavaScriptGzip > maximumInitialJavaScriptGzip) {
  throw new Error(
    `Home initial JavaScript is ${initialJavaScriptGzip} bytes gzip; budget is ` +
      `${maximumInitialJavaScriptGzip} bytes excluding deferred R3F/Three.\n` +
      initialJavaScriptReport
        .sort((left, right) => right.gzipBytes - left.gzipBytes)
        .map(({ path, gzipBytes }) => `${path} (${gzipBytes} bytes gzip)`)
        .join('\n'),
  );
}

const chunkFiles = (await filesBelow(staticChunkRoot)).filter((path) => extname(path) === '.js');
const oversizedChunks: string[] = [];
for (const path of chunkFiles) {
  const manifestPath = relative(nextRoot, path);
  if (deferredThreeChunks.has(manifestPath)) continue;
  const gzipBytes = gzipSync(await readFile(path)).byteLength;
  if (gzipBytes > maximumChunkGzip) {
    oversizedChunks.push(`${manifestPath} (${gzipBytes} bytes gzip)`);
  }
}
if (oversizedChunks.length > 0) {
  throw new Error(
    `Non-deferred JavaScript chunks exceed the 250 KiB gzip guardrail:\n${oversizedChunks.join('\n')}`,
  );
}

const publicRoot = 'apps/web/public';
const publicFiles = await filesBelow(publicRoot);
const oversizedAssets: string[] = [];
for (const path of publicFiles) {
  const bytes = (await stat(path)).size;
  if (bytes > maximumRuntimeAsset) {
    oversizedAssets.push(`${relative('apps/web/public', path)} (${bytes} bytes)`);
  }
}
if (oversizedAssets.length > 0) {
  throw new Error(`Runtime assets exceed the 4 MiB guardrail:\n${oversizedAssets.join('\n')}`);
}

// Both journeys build every world, body and study procedurally, so neither downloads public
// assets. The individual 4 MiB check above still covers every public file, including legacy
// imagery and retired Blender exports unreachable from this source graph.
const homeSources = await homeAssetSources();
const htmlAssets = new Set([
  ...[...homeHtml.matchAll(/\/assets\/[^"'\\<>\s&?]+/g)].map((match) => match[0]),
  ...[...homeHtml.matchAll(/%2Fassets%2F[^&"'\\<>\s]+/gi)].map((match) =>
    decodeURIComponent(match[0]),
  ),
]);
if (htmlAssets.size)
  failUnverified('the built home HTML unexpectedly preloads public assets outside the 3D loader.');
const desktopPublic: string[] = [];
const mobilePublic: string[] = [];
const publicReport = async (files: string[]) => ({
  assetCount: files.length,
  bytes: (await Promise.all(files.map(async (path) => (await stat(path)).size))).reduce(
    (total, bytes) => total + bytes,
    0,
  ),
  files: files.map((path) => '/' + relative(publicRoot, path)).sort(),
});
const desktopPublicReport = await publicReport(desktopPublic);
const mobilePublicReport = await publicReport(mobilePublic);
const allStaticFiles = await filesBelow(join(nextRoot, 'static'));
let sharedClientPayloadBytes = gzipSync(Buffer.from(homeHtml)).byteLength;
const sharedClientFiles: string[] = [];
for (const path of allStaticFiles) {
  const extension = extname(path);
  if (extension === '.js' || extension === '.css') {
    sharedClientPayloadBytes += gzipSync(await readFile(path)).byteLength;
    sharedClientFiles.push(relative(nextRoot, path));
  } else if (extension === '.woff2') {
    sharedClientPayloadBytes += (await stat(path)).size;
    sharedClientFiles.push(relative(nextRoot, path));
  }
}
const desktopGuidedPathBytes = sharedClientPayloadBytes + desktopPublicReport.bytes;
const mobileGuidedPathBytes = sharedClientPayloadBytes + mobilePublicReport.bytes;
const guidedPathUpperBoundBytes = Math.max(desktopGuidedPathBytes, mobileGuidedPathBytes);
if (guidedPathUpperBoundBytes > maximumGuidedPathPayload) {
  throw new Error(
    `Source-audited guided-path upper bounds are ${desktopGuidedPathBytes} bytes desktop and ` +
      `${mobileGuidedPathBytes} bytes mobile; budget is ${maximumGuidedPathPayload} bytes per journey.`,
  );
}

const criticalImages = new Set<string>();
for (const match of homeHead.matchAll(/url=(%2Fassets%2F[^&" ]+)/g)) {
  criticalImages.add(`apps/web/public${decodeURIComponent(match[1])}`);
}
const criticalFonts = new Set(
  [
    ...homeHead.matchAll(
      /<link\b[^>]*href="(\/_next\/static\/media\/[^"]+\.woff2)"[^>]*as="font"[^>]*>/g,
    ),
  ].map((match) => `apps/web/.next${match[1].slice('/_next'.length)}`),
);
if (criticalFonts.size === 0) {
  failUnverified('home HTML did not expose local critical font preloads.');
}
const criticalStyles = new Set(
  [
    ...homeHead.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="(\/_next\/[^"]+\.css)"[^>]*>/g),
  ].map((match) => `apps/web/.next${match[1].slice('/_next'.length)}`),
);
if (criticalStyles.size === 0) {
  failUnverified('home HTML did not expose the critical stylesheet.');
}

let criticalVisualBytes = gzipSync(Buffer.from(homeHtml)).byteLength;
for (const path of [...criticalImages, ...criticalFonts]) {
  criticalVisualBytes += (await stat(path)).size;
}
for (const path of criticalStyles) {
  criticalVisualBytes += gzipSync(await readFile(path)).byteLength;
}
if (
  criticalVisualBytes > maximumMobileCriticalVisual ||
  criticalVisualBytes > maximumDesktopCriticalVisual
) {
  throw new Error(
    `Home critical visual payload is ${criticalVisualBytes} audited bytes; budgets are ` +
      `${maximumMobileCriticalVisual} mobile and ${maximumDesktopCriticalVisual} desktop.`,
  );
}

const deferredReport = await Promise.all(
  [...deferredThreeChunks].sort().map(async (path) => ({
    path,
    gzipBytes: gzipSync(await readFile(join(nextRoot, path))).byteLength,
  })),
);
process.stdout.write(
  `${JSON.stringify(
    {
      homeInitialJavaScript: {
        gzipBytes: initialJavaScriptGzip,
        budgetBytes: maximumInitialJavaScriptGzip,
        files: [...initialJavaScript].sort(),
        excludedLegacyNoModulePolyfills: [...htmlScripts.legacy].sort(),
        excludedDeferredR3fThree: deferredReport,
        assumption:
          'Modern-browser budget measures non-noModule scripts emitted in prerendered home HTML; root and page entries are required, and every emitted script must occur in the route client-reference or root build manifest.',
      },
      homeCriticalVisual: {
        auditedBytes: criticalVisualBytes,
        mobileBudgetBytes: maximumMobileCriticalVisual,
        desktopBudgetBytes: maximumDesktopCriticalVisual,
        sourceImages: [...criticalImages].sort(),
        fonts: [...criticalFonts].sort(),
        styles: [...criticalStyles].sort(),
        assumption:
          'Any preloaded source-image bytes plus preloaded WOFF2, gzip CSS, and gzip HTML. The home currently has no critical image preload while the deferred 3D scene starts.',
      },
      individualAssets: {
        nonDeferredJavaScriptChunkBudgetBytes: maximumChunkGzip,
        runtimeAssetBudgetBytes: maximumRuntimeAsset,
        javascriptChunksChecked: chunkFiles.length - deferredThreeChunks.size,
        runtimeAssetsChecked: publicFiles.length,
      },
      guidedPathPayload: {
        accountingVersion: 'voyage-procedural-v1',
        conservativeUpperBoundBytes: guidedPathUpperBoundBytes,
        budgetBytes: maximumGuidedPathPayload,
        desktop: {
          conservativeUpperBoundBytes: desktopGuidedPathBytes,
          publicAssets: desktopPublicReport,
        },
        mobile: {
          conservativeUpperBoundBytes: mobileGuidedPathBytes,
          publicAssets: mobilePublicReport,
        },
        sharedClientPayload: {
          bytes: sharedClientPayloadBytes,
          assetCount: sharedClientFiles.length,
          files: sharedClientFiles.sort(),
          includesHomeHtmlGzip: true,
        },
        sourceAudit: {
          files: homeSources.files,
          references: homeSources.references,
        },
        excludedLegacyPublicFiles: publicFiles
          .map((path) => '/' + relative(publicRoot, path))
          .sort(),
        assumption:
          'The low-poly worlds, companions and explorer studies are generated in the browser from canonical values, so both journeys download no public 3D assets. Both totals include every emitted client JS/CSS/WOFF2 and home HTML once; the reported upper bound is their maximum. Unreachable legacy public assets are excluded from this Voyage journey but remain subject to the per-file 4 MiB guardrail. Any /assets/ reference in the reachable home source graph fails closed.',
      },
    },
    null,
    2,
  )}\n`,
);
