'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import {
  publicTelemetryEvents,
  telemetryEnabled,
  trackPublicInteraction,
  trackRouteView,
  trackWebVital,
  type PublicTelemetryEvent,
} from '../../lib/telemetry';

const webVitalNames = new Set(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']);
const telemetryEventNames = new Set<string>(publicTelemetryEvents);

type WebVitalName = 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
type WebVitalRating = 'good' | 'needs-improvement' | 'poor';

function reportWebVital(metric: { name: string; rating?: string; value: number }) {
  if (!webVitalNames.has(metric.name)) return;

  const rating: WebVitalRating =
    metric.rating === 'poor' || metric.rating === 'needs-improvement' ? metric.rating : 'good';
  trackWebVital(metric.name as WebVitalName, metric.value, rating);
}

export function OperationalTelemetry() {
  const pathname = usePathname();
  useReportWebVitals(reportWebVital);

  useEffect(() => {
    if (!telemetryEnabled) return;

    trackRouteView(pathname);

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const instrumented = target?.closest<HTMLElement>('[data-telemetry-event]');
      const eventName = instrumented?.dataset.telemetryEvent;

      if (!eventName || !telemetryEventNames.has(eventName)) return;
      trackPublicInteraction(
        eventName as PublicTelemetryEvent,
        instrumented.dataset.telemetryValue,
      );
    };

    const completedChapters = new Set<string>();
    const chapterObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const chapter = (entry.target as HTMLElement).dataset.telemetryChapter;
          if (!chapter || completedChapters.has(chapter) || entry.intersectionRatio < 0.6) continue;

          completedChapters.add(chapter);
          trackPublicInteraction('chapter_complete', chapter);
        }
      },
      { threshold: [0.6] },
    );

    document.querySelectorAll<HTMLElement>('[data-telemetry-chapter]').forEach((chapter) => {
      chapterObserver.observe(chapter);
    });
    document.addEventListener('click', onClick);

    return () => {
      chapterObserver.disconnect();
      document.removeEventListener('click', onClick);
    };
  }, [pathname]);

  return null;
}
