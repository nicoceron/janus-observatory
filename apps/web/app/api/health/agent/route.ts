import { inspectAiRuntime } from '@janus/agent';

export const dynamic = 'force-dynamic';

export function GET() {
  const runtime = inspectAiRuntime(process.env);

  return Response.json(
    {
      service: 'janus-research-companion',
      status:
        runtime.deepSeek.configured && runtime.voyage.configured ? 'configured' : 'unconfigured',
      coreExperienceAvailable: true,
      ...runtime,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
