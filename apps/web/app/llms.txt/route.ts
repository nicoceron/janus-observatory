import { publicRoutes, siteDescription, siteOrigin } from '../../lib/site';
import { scenarioIds } from '@janus/domain/scenario';

export const dynamic = 'force-static';

const pageNotes: Record<(typeof publicRoutes)[number], [string, string]> = {
  '/': [
    'Story',
    'A scrolling journey through the ten futures and what an alien observer could see.',
  ],
  '/observatory': [
    'Observatory',
    'Pick a future and one of five instruments to see what the observing study says it could detect.',
  ],
  '/atlas': ['Atlas', 'All ten futures, side-by-side comparisons and data downloads.'],
  '/research': ['Research', 'The Project Janus papers behind the site.'],
  '/research/resilience': [
    'Collapse model rebuild',
    'Our independent rebuild of the collapse-and-recovery model, compared with the paper.',
  ],
  '/methods': ['Methods', 'Where every number comes from and where the evidence stops.'],
  '/sources': ['Sources', 'Every paper, dataset, artwork and font, with licenses.'],
  '/accessibility': ['Accessibility', 'Keyboard, motion and text-alternative support.'],
  '/privacy': ['Privacy', 'What the site stores about visitors.'],
};

export function GET() {
  const pages = publicRoutes.map((route) => {
    const [name, note] = pageNotes[route];
    return `- [${name}](${new URL(route, siteOrigin)}): ${note}`;
  });
  const scenarios = scenarioIds.map(
    (id) => `- [${id}](${siteOrigin}/atlas/${id.toLowerCase()}): One future, with sources.`,
  );
  return new Response(
    `# Janus Observatory\n\n> ${siteDescription}\n\nThe ten Project Janus scenarios are possibilities, not forecasts, probabilities or rankings. When an instrument detects nothing, that does not mean there is no technology. Each page links the paper, table or figure behind its numbers; cite those when attributing scientific claims.\n\n## Pages\n\n${pages.join('\n')}\n\n## Futures\n\n${scenarios.join('\n')}\n\n## Discovery\n\n- [Sitemap](${siteOrigin}/sitemap.xml)\n- [Crawler policy](${siteOrigin}/robots.txt)\n`,
    { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } },
  );
}
