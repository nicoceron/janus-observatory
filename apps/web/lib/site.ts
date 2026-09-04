const localOrigin = 'http://localhost:3000';

function normalizedOrigin(value: string | undefined) {
  if (!value) return localOrigin;

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return localOrigin;
  }
}

export const siteOrigin = normalizedOrigin(process.env.JANUS_PUBLIC_BASE_URL);

export const siteDescription =
  'A source-backed interactive atlas of ten self-consistent technological-civilization scenarios and the incomplete evidence an alien observer might detect.';

export const publicRoutes = [
  '/',
  '/observatory',
  '/atlas',
  '/research',
  '/research/resilience',
  '/research/concordia',
  '/methods',
  '/sources',
  '/accessibility',
  '/privacy',
] as const;
