/**
 * Visual encodings of canonical Table 6 magnitudes. These turn published values into counts and
 * strengths for illustration; they are presentation rules, not new scientific quantities.
 * A null (the table's dash) always encodes as "nothing drawn", which the prose never presents as
 * evidence that the activity is absent.
 */

/** Faces covered for a published "fraction of planetary surface". Positive cells show a trace. */
export function coveredFaces(fraction: number | null, faces: number) {
  if (fraction === null || fraction <= 0) return 0;
  return Math.max(1, Math.min(faces, Math.round(Math.min(1, fraction) * faces)));
}

/** Map a positive magnitude spanning many decades to 0..1 on a log scale. */
export function decades(value: number | null, floor = 1e-4, ceiling = 1e6) {
  if (value === null || value <= 0) return 0;
  const t = (Math.log10(value) - Math.log10(floor)) / (Math.log10(ceiling) - Math.log10(floor));
  return Math.min(1, Math.max(0, t));
}

/**
 * Satellites drawn for a "density relative to Earth 2024" cell. Today's Earth draws a handful;
 * each further decade adds a fixed increment, so 10^6 reads as a swarm without hiding the planet.
 */
export function satelliteCount(density: number | null, budget = 1) {
  if (density === null || density <= 0) return 0;
  const count = density >= 1 ? 9 + 34 * Math.log10(density) : 9 * Math.sqrt(density);
  return Math.max(1, Math.round(count * budget));
}

/** Share of built or lit sites that glow, from "intensity relative to Earth 2024". */
export function lightShare(intensity: number | null) {
  if (intensity === null || intensity <= 0) return 0;
  return Math.max(0.02, decades(intensity, 1e-4, 500));
}

/** Opacity of a pollution haze shell from industrial pollution and contaminated aerosol cells. */
export function hazeStrength(pollution: number | null, aerosol: number | null) {
  return Math.max(decades(pollution, 1, 1000) * 0.85, decades(aerosol, 1, 1e6) * 0.7);
}
