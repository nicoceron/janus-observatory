import * as THREE from 'three';
import { kitData } from './props/pack';

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

type Relief = {
  width: number;
  height: number;
  land: Uint8Array;
  range: Uint8Array;
  dry: Uint8Array;
  lush: Uint8Array;
  limit: number;
};
let relief: Relief | null = null;

/**
 * The shared Earth relief, authored in the Blender kit (scripts/blender/kit/earth.py): a
 * hand-drawn caricature of the continents on a one-degree grid. Every scenario is the same
 * planet, so every world shares these coastlines; only what each future did to them differs.
 * Shapes are illustrative, not a geographic reconstruction.
 */
function earth(): Relief {
  if (relief) return relief;
  const { meta, bytes } = kitData('earth');
  const width = meta.width as number,
    height = meta.height as number;
  const cells = width * height;
  relief = {
    width,
    height,
    land: bytes.subarray(0, cells),
    range: bytes.subarray(cells, cells * 2),
    dry: bytes.subarray(cells * 2, cells * 3),
    lush: bytes.subarray(cells * 3, cells * 4),
    limit: meta.landLimit as number,
  };
  return relief;
}

/** Bilinear sample of one channel at a unit direction, 0..255. */
function sample(channel: Uint8Array, r: Relief, v: THREE.Vector3) {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(v.y / length, -1, 1)));
  const lon = THREE.MathUtils.radToDeg(Math.atan2(v.x, v.z));
  const x = lon + 179.5,
    y = THREE.MathUtils.clamp(lat + 89.5, 0, r.height - 1);
  const x0 = Math.floor(x),
    y0 = Math.min(r.height - 2, Math.floor(y));
  const fx = x - x0,
    fy = y - y0;
  const xa = (x0 + r.width) % r.width,
    xb = (x0 + 1 + r.width) % r.width;
  const top = channel[y0 * r.width + xa] * (1 - fx) + channel[y0 * r.width + xb] * fx;
  const bottom =
    channel[(y0 + 1) * r.width + xa] * (1 - fx) + channel[(y0 + 1) * r.width + xb] * fx;
  return top * (1 - fy) + bottom * fy;
}

/**
 * Signed distance to the coast in units of about fourteen degrees: positive inside continents,
 * zero on the coastline, strongly negative in open ocean.
 */
export function continentField(v: THREE.Vector3) {
  const r = earth();
  return ((sample(r.land, r, v) / 255) * 2 - 1) * (r.limit / 14);
}

/** 0..1 strength of the authored mountain spines. */
export function rangeField(v: THREE.Vector3) {
  const r = earth();
  return sample(r.range, r, v) / 255;
}

/** 0..1 authored aridity: the great deserts. */
export function dryField(v: THREE.Vector3) {
  const r = earth();
  return sample(r.dry, r, v) / 255;
}

/** 0..1 authored forest density: rainforests and boreal belts. */
export function lushField(v: THREE.Vector3) {
  const r = earth();
  return sample(r.lush, r, v) / 255;
}
