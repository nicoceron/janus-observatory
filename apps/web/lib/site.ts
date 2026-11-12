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
  'Ten possible futures of human civilization from the Project Janus research, and what an observer on another star could—and couldn’t—see of each.';

export const publicRoutes = [
  '/',
  '/observatory',
  '/atlas',
  '/research',
  '/research/resilience',
  '/methods',
  '/sources',
  '/accessibility',
  '/privacy',
] as const;
