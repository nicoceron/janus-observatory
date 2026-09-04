import { scenarioIds } from '@janus/domain/scenario';
import type { MetadataRoute } from 'next';

import { publicRoutes, siteOrigin } from '../lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const updatedAt = new Date('2026-08-29T21:01:49-05:00');
  const scenarioRoutes = scenarioIds.map((scenarioId) => `/atlas/${scenarioId.toLowerCase()}`);

  return [...publicRoutes, ...scenarioRoutes].map((route) => ({
    url: new URL(route, siteOrigin).toString(),
    lastModified: updatedAt,
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route === '/observatory' || route === '/atlas' ? 0.9 : 0.6,
  }));
}
