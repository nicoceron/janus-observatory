import { publicRoutes, siteDescription, siteOrigin } from '../../lib/site';
import { scenarioIds } from '@janus/domain/scenario';

export const dynamic = 'force-static';

export function GET() {
  const pages = publicRoutes.map(
    (route) =>
      `- [${route === '/' ? 'Story' : route.slice(1).replaceAll('/', ' / ')}](${new URL(route, siteOrigin)}): Public Janus Observatory page.`,
  );
  const scenarios = scenarioIds.map(
    (id) =>
      `- [${id}](${siteOrigin}/atlas/${id.toLowerCase()}): Source-backed scenario profile with citations.`,
  );
  return new Response(
    `# Janus Observatory\n\n> ${siteDescription}\n\nProject Janus scenarios are self-consistent possibilities, not forecasts, probabilities, or rankings. A signal not detected by an instrument does not establish the absence of technology. Read each page's source references, methods, and evidence status before attributing scientific claims.\n\nThe core public atlas works without AI. Research Companion access and live provider calls depend on the deployed configuration; this directory does not advertise enabled access.\n\n## Public pages\n\n${pages.join('\n')}\n\n## Scenarios\n\n${scenarios.join('\n')}\n\n## Discovery\n\n- [Sitemap](${siteOrigin}/sitemap.xml)\n- [Crawler policy](${siteOrigin}/robots.txt)\n`,
    { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } },
  );
}
