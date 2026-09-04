'use client';

import { normalizePublicTelemetryRoute, type PublicTelemetryEvent } from './telemetry-shared';

export { publicTelemetryEvents, type PublicTelemetryEvent } from './telemetry-shared';
export type DeviceTier = 'low' | 'medium' | 'high' | 'unknown';

interface TelemetryContext {
  deviceTier: DeviceTier;
  reducedMotion: boolean;
  webglFallback: boolean;
}

interface InteractionPayload {
  version: 1;
  kind: 'interaction';
  event: PublicTelemetryEvent;
  route: string;
  value?: string;
  context: TelemetryContext;
}

interface RoutePayload {
  version: 1;
  kind: 'route_view';
  route: string;
  context: TelemetryContext;
}

interface WebVitalPayload {
  version: 1;
  kind: 'web_vital';
  metric: 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  route: string;
  context: TelemetryContext;
}

export type PublicTelemetryPayload = InteractionPayload | RoutePayload | WebVitalPayload;

export const telemetryEnabled = process.env.NEXT_PUBLIC_JANUS_TELEMETRY_ENABLED === 'true';

let cachedWebGlSupport: boolean | undefined;

function safeRoute(candidate = window.location.pathname) {
  return normalizePublicTelemetryRoute(candidate);
}

function supportsWebGl() {
  if (cachedWebGlSupport !== undefined) return cachedWebGlSupport;

  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!context) {
      cachedWebGlSupport = false;
      return cachedWebGlSupport;
    }

    context.getExtension('WEBGL_lose_context')?.loseContext();
    cachedWebGlSupport = true;
    return cachedWebGlSupport;
  } catch {
    cachedWebGlSupport = false;
    return cachedWebGlSupport;
  }
}

function deviceTier(): DeviceTier {
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  const memory = navigatorWithMemory.deviceMemory;
  const cores = navigator.hardwareConcurrency;

  if (!memory && !cores) return 'unknown';
  if ((memory && memory <= 4) || (cores && cores <= 4)) return 'low';
  if ((memory && memory >= 12) || (cores && cores >= 12)) return 'high';
  return 'medium';
}

function telemetryContext(): TelemetryContext {
  const preference = document.documentElement.dataset.motion;
  const reducedMotion =
    preference === 'reduced' ||
    (preference !== 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  return {
    deviceTier: deviceTier(),
    reducedMotion,
    webglFallback: !supportsWebGl(),
  };
}

function transmit(payload: PublicTelemetryPayload) {
  if (!telemetryEnabled) return;

  const body = JSON.stringify(payload);
  if (navigator.sendBeacon?.('/api/telemetry', new Blob([body], { type: 'application/json' }))) {
    return;
  }

  void fetch('/api/telemetry', {
    body,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    method: 'POST',
  });
}

export function trackRouteView(pathname?: string) {
  const route = safeRoute(pathname);
  const context = telemetryContext();
  transmit({
    version: 1,
    kind: 'route_view',
    route,
    context,
  });

  if (context.webglFallback) {
    transmit({
      version: 1,
      kind: 'interaction',
      event: 'fallback_mode',
      route,
      value: 'webgl_unavailable',
      context,
    });
  }
}

export function trackPublicInteraction(event: PublicTelemetryEvent, value?: string) {
  const safeValue = value?.match(/^[a-z0-9_.:-]{1,64}$/i)?.[0];
  transmit({
    version: 1,
    kind: 'interaction',
    event,
    route: safeRoute(),
    ...(safeValue ? { value: safeValue } : {}),
    context: telemetryContext(),
  });
}

export function trackWebVital(
  metric: WebVitalPayload['metric'],
  value: number,
  rating: WebVitalPayload['rating'],
) {
  if (!Number.isFinite(value)) return;

  transmit({
    version: 1,
    kind: 'web_vital',
    metric,
    value,
    rating,
    route: safeRoute(),
    context: telemetryContext(),
  });
}
