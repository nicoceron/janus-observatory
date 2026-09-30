import * as THREE from 'three';

/** Latitude/longitude in degrees to a unit direction. Longitude 0 faces the default camera (+z). */
export function direction(lat: number, lon: number, target = new THREE.Vector3()) {
  const phi = THREE.MathUtils.degToRad(lat),
    theta = THREE.MathUtils.degToRad(lon);
  return target.set(
    Math.cos(phi) * Math.sin(theta),
    Math.sin(phi),
    Math.cos(phi) * Math.cos(theta),
  );
}

export function latLon(v: THREE.Vector3) {
  const n = v.clone().normalize();
  return {
    lat: THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(n.y, -1, 1))),
    lon: THREE.MathUtils.radToDeg(Math.atan2(n.x, n.z)),
  };
}

type Blob = [lat: number, lon: number, radius: number];

/**
 * A hand-drawn caricature of Earth's continents from overlapping caps. Every scenario is the same
 * planet, so every world shares these coastlines; only what each future did to them differs.
 * Shapes are illustrative, not a geographic reconstruction.
 */
const land: Blob[] = [
  // North America and Greenland
  [62, -112, 17],
  [67, -150, 8],
  [52, -95, 14],
  [41, -100, 13],
  [35, -86, 9],
  [45, -74, 7],
  [29, -82, 3.5],
  [23, -103, 8],
  [16, -92, 4.5],
  [10, -83, 3],
  [73, -40, 11],
  [62, -72, 8],
  [70, -95, 7],
  // South America
  [6, -66, 9],
  [-7, -61, 14],
  [-12, -46, 9],
  [-24, -59, 10],
  [-34, -65, 7],
  [-44, -70, 5],
  [-51, -71, 3],
  // Europe
  [49, 10, 9],
  [53, 26, 11],
  [63, 15, 6],
  [66, 26, 6],
  [40, -4, 5],
  [43, 13, 2.5],
  [54, -3, 3],
  // Africa
  [26, 3, 13],
  [25, 24, 12],
  [12, -3, 11],
  [8, 22, 13],
  [9, 40, 6],
  [-4, 24, 12],
  [-16, 28, 11],
  [-27, 24, 7],
  [-19, 46.5, 3.5],
  // Asia
  [60, 62, 13],
  [62, 92, 17],
  [65, 128, 15],
  [66, 158, 9],
  [46, 72, 13],
  [46, 102, 13],
  [33, 106, 11],
  [29, 118, 7],
  [36, 137, 3],
  [24, 46, 9],
  [32, 55, 8],
  [39, 36, 5],
  [22, 79, 9],
  [12, 78, 4],
  [16, 102, 6],
  [1, 113, 4.5],
  [-1, 102, 3.5],
  [-5, 141, 4.5],
  // Australia and New Zealand
  [-25, 134, 13],
  [-19, 124, 5],
  [-33, 148, 5],
  [-42, 173, 2.5],
];

/** Mountain spines that lift inland relief: Himalaya, Andes, Rockies, Alps, Rift and Urals. */
const ranges: Blob[] = [
  [31, 84, 9],
  [-18, -68, 7],
  [-35, -70, 5],
  [45, -112, 8],
  [46, 10, 3],
  [0, 36, 5],
  [58, 60, 4],
  [40, 76, 6],
  [-22, 20, 4],
];

const toCaps = (blobs: Blob[]) =>
  blobs.map(([lat, lon, radius]) => ({
    centre: direction(lat, lon),
    radius: THREE.MathUtils.degToRad(radius),
  }));
const landCaps = toCaps(land),
  rangeCaps = toCaps(ranges);

function capField(caps: ReturnType<typeof toCaps>, v: THREE.Vector3) {
  let best = -Infinity;
  for (const cap of caps) {
    const angle = Math.acos(THREE.MathUtils.clamp(cap.centre.dot(v), -1, 1));
    best = Math.max(best, 1 - angle / cap.radius);
  }
  return best;
}

/** Positive inside continents; about 0 at the coastline; strongly negative in open ocean. */
export function continentField(v: THREE.Vector3) {
  const antarctic = (-v.y - Math.sin(THREE.MathUtils.degToRad(68))) * 9;
  return Math.max(capField(landCaps, v), antarctic);
}

export function rangeField(v: THREE.Vector3) {
  return Math.max(0, capField(rangeCaps, v));
}
