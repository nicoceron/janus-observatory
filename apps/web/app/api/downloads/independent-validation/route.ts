import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import generatedManifest from '../../../../../../data/generated/manifest.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const validationPath = new URL(
  '../../../../../../data/generated/collapse/independent-validation.json',
  import.meta.url,
);

export async function GET() {
  const body = await readFile(validationPath);
  const digest = createHash('sha256').update(body).digest('hex');
  const declared = generatedManifest.files.find(
    ({ path }) => path === 'collapse/independent-validation.json',
  );
  if (!declared || declared.sha256 !== digest || declared.bytes !== body.byteLength) {
    return Response.json(
      {
        error: 'GENERATED_ARTIFACT_MISMATCH',
        message: 'The independent validation artifact failed its release-manifest check.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return new Response(body, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': 'attachment; filename="janus-independent-validation-1.0.0.json"',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Janus-Artifact-SHA256': digest,
      'X-Janus-Data-Version': generatedManifest.dataVersion,
    },
  });
}
