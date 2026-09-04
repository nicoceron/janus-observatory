import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

import { z } from 'zod';

import {
  isNormalizedPublicTelemetryRoute,
  publicTelemetryEvents,
} from '../../../lib/telemetry-shared';

export const dynamic = 'force-dynamic';

const contextSchema = z
  .object({
    deviceTier: z.enum(['low', 'medium', 'high', 'unknown']),
    reducedMotion: z.boolean(),
    webglFallback: z.boolean(),
  })
  .strict();

const routeSchema = z
  .string()
  .max(120)
  .refine(isNormalizedPublicTelemetryRoute, 'Route is not in the public telemetry allowlist.');
const tokenSchema = z.string().regex(/^[a-z0-9_.:-]{1,64}$/i);

const telemetrySchema = z.discriminatedUnion('kind', [
  z
    .object({
      version: z.literal(1),
      kind: z.literal('route_view'),
      route: routeSchema,
      context: contextSchema,
    })
    .strict(),
  z
    .object({
      version: z.literal(1),
      kind: z.literal('interaction'),
      event: z.enum(publicTelemetryEvents),
      route: routeSchema,
      value: tokenSchema.optional(),
      context: contextSchema,
    })
    .strict(),
  z
    .object({
      version: z.literal(1),
      kind: z.literal('web_vital'),
      metric: z.enum(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']),
      value: z.number().finite().nonnegative().max(3_600_000),
      rating: z.enum(['good', 'needs-improvement', 'poor']),
      route: routeSchema,
      context: contextSchema,
    })
    .strict(),
]);

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();
const rateWindowMs = 60_000;
const rateLimit = 120;
const maxRateBuckets = 2_048;
const runtimeSalt =
  process.env.JANUS_TELEMETRY_HASH_SALT?.trim() || randomBytes(32).toString('hex');

function constantTimeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function trustedProxyAddress(request: Request) {
  const headerName = process.env.JANUS_TELEMETRY_TRUSTED_IP_HEADER?.trim().toLowerCase();
  const expectedSecret = process.env.JANUS_TELEMETRY_PROXY_SECRET?.trim();
  const suppliedSecret = request.headers.get('x-janus-proxy-auth') ?? '';

  if (
    !headerName ||
    !/^[a-z0-9-]{1,64}$/.test(headerName) ||
    !expectedSecret ||
    expectedSecret.length < 16 ||
    !constantTimeEqual(suppliedSecret, expectedSecret)
  ) {
    return null;
  }

  const candidate = request.headers.get(headerName)?.split(',')[0]?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

function rateKey(request: Request) {
  const trustedAddress = trustedProxyAddress(request);
  const directBoundary = [
    request.headers.get('user-agent')?.slice(0, 160) ?? 'unknown-agent',
    request.headers.get('accept-language')?.slice(0, 64) ?? 'unknown-language',
  ].join(':');
  const identity = trustedAddress ? `trusted-proxy:${trustedAddress}` : `direct:${directBoundary}`;
  return createHash('sha256').update(`${runtimeSalt}:${identity}`).digest('hex');
}

function rateLimited(request: Request) {
  const now = Date.now();
  const key = rateKey(request);
  const existing = rateBuckets.get(key);

  for (const [bucketKey, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
  }

  if (!existing && rateBuckets.size >= maxRateBuckets) {
    const oldestKey = rateBuckets.keys().next().value as string | undefined;
    if (oldestKey) rateBuckets.delete(oldestKey);
  }

  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + rateWindowMs });
    return false;
  }

  existing.count += 1;
  return existing.count > rateLimit;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 2_048) {
    return new Response(null, { status: 413 });
  }
  if (rateLimited(request)) {
    return new Response(null, { status: 429 });
  }

  let candidate: unknown;
  try {
    const body = await request.text();
    if (body.length > 2_048) return new Response(null, { status: 413 });
    candidate = JSON.parse(body);
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = telemetrySchema.safeParse(candidate);
  if (!parsed.success) {
    return Response.json({ error: 'invalid_telemetry' }, { status: 400 });
  }

  // Structured platform logs are the deployment-neutral sink. The validated envelope cannot
  // contain prompts, page prose, query strings, provider reasoning, or persistent user IDs.
  console.info(
    JSON.stringify({ event: 'janus.public_telemetry', recordedAt: Date.now(), ...parsed.data }),
  );

  return new Response(null, { status: 202 });
}
