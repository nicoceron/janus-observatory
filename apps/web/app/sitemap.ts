import { scenarioIds } from '@janus/domain/scenario';
import type { MetadataRoute } from 'next';

import { publicRoutes, siteOrigin } from '../lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const scenarioRoutes = scenarioIds.map((scenarioId) => `/atlas/${scenarioId.toLowerCase()}`);

  return [...publicRoutes, ...scenarioRoutes].map((route) => ({
    url: new URL(route, siteOrigin).toString(),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route === '/observatory' || route === '/atlas' ? 0.9 : 0.6,
  }));
}
