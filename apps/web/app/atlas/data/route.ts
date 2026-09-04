import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import generatedManifest from '../../../../../data/generated/manifest.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const downloads = {
  csv: {
    contentType: 'text/csv; charset=utf-8',
    filename: 'janus-scenarios-1.0.0.csv',
    manifestPath: 'downloads/janus-scenarios-1.0.0.csv',
  },
  json: {
    contentType: 'application/json; charset=utf-8',
    filename: 'janus-observatory-1.0.0.json',
    manifestPath: 'downloads/janus-observatory-1.0.0.json',
  },
} as const;

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get('format') ?? 'json';
  if (format !== 'json' && format !== 'csv') {
    return Response.json(
      { error: 'Unsupported format. Use format=json or format=csv.' },
      { status: 400 },
    );
  }

  const artifact = downloads[format];
  // Keep both generated assets statically traceable by Next/Turbopack. Passing a
  // property-selected URL to readFile causes the file tracer to conservatively
  // include the whole repository in this route's server bundle.
  const body =
    format === 'json'
      ? await readFile(
          new URL(
            '../../../../../data/generated/downloads/janus-observatory-1.0.0.json',
            import.meta.url,
          ),
        )
      : await readFile(
          new URL(
            '../../../../../data/generated/downloads/janus-scenarios-1.0.0.csv',
            import.meta.url,
          ),
        );
  const digest = createHash('sha256').update(body).digest('hex');
  const declared = generatedManifest.files.find(({ path }) => path === artifact.manifestPath);

  if (!declared || declared.sha256 !== digest || declared.bytes !== body.byteLength) {
    return Response.json(
      {
        error: 'GENERATED_ARTIFACT_MISMATCH',
        message: 'The requested Atlas export failed its release-manifest check.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Disposition': `attachment; filename="${artifact.filename}"`,
      'Content-Type': artifact.contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Janus-Artifact-SHA256': digest,
      'X-Janus-Data-Version': generatedManifest.dataVersion,
    },
  });
}
