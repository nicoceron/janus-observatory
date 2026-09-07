import type { ScenarioProfile } from '../../lib/canonical-core';

export type ContextBody = 'Moon' | 'Mars' | 'Venus';
export function getOffworldContext(profile: ScenarioProfile) {
  const bodies = (['Moon', 'Mars', 'Venus'] as const).flatMap((body) => {
    const signatures = profile.planetary.filter(
      (row) => row.body === body && row.value !== null && row.value > 0,
    );
    return signatures.length ? [{ body, signatures }] : [];
  });
  return { bodies, stellar: profile.system.find(({ id }) => id === 'dyson_sphere') };
}
