/** Cinematic framing: compressed distances, with Luna local to Earth and other worlds deeper in space.
 * Screen anchors are only starting compositions; interaction follows the actual 3D projection. */
export type SystemPlace = { id: string; x: number; y: number; z: number; diameter: number };
const locations: Record<string, [number, number, number, number]> = {
  Moon: [0.88, 0.47, 1.1, 0.22],
  Mars: [0.8, 0.13, -4, 0.29],
  Venus: [0.13, 0.18, -2.5, 0.27],
  asteroids: [0.15, 0.76, -6, 0.21],
  outer: [0.88, 0.82, -9, 0.26],
  kuiper: [0.43, 0.94, -13, 0.16],
  solar: [0.44, 0.055, -15, 0.14],
};
/** Pointer targets are never smaller than this (Decision 022). */
export const MIN_TARGET = 44;
/** Space kept between the fixed site header and the nearest target, enough for the idle drift. */
export const HEADER_CLEARANCE = 6;
/** The square a destination answers the pointer in, centred on its body. */
export const targetSize = (place: SystemPlace) => Math.max(MIN_TARGET, place.diameter);

/** `headerHeight` is the fixed site header's measured height. The header takes pointer input, so
 * the composition is seated low enough that no destination's target starts above its lower edge. */
export function systemLayout(
  width: number,
  height: number,
  destinations: string[],
  headerHeight: number,
): SystemPlace[] {
  const phone = width <= 760;
  const left = phone ? 24 : width * 0.465;
  const span = width - left - (phone ? 24 : width * 0.035);
  const airy = Math.max(110, height * 0.13);
  // A phone's scene keeps its own height above the prose, which starts at 72svh.
  const heightOfScene = Math.max(225, phone ? height * 0.64 - 94 : height - 116 - airy);
  const compose = (ids: string[], top: number) => {
    const diameter = Math.min(span * (ids.length === 1 ? 0.88 : 0.65), heightOfScene * 0.72);
    return ids.map((id, i): SystemPlace => {
      if (id === 'Earth')
        return { id, x: left + span * 0.47, y: top + heightOfScene * 0.51, z: 0, diameter };
      const [x, y, z, relative] = locations[id] ?? Object.values(locations)[(i - 1) % 7];
      return {
        id,
        x: id === 'Moon' ? left + span * 0.47 + diameter * 0.66 : left + span * x,
        y: id === 'Moon' ? top + heightOfScene * 0.51 - diameter * 0.12 : top + heightOfScene * y,
        z,
        diameter: Math.max(24, diameter * relative),
      };
    });
  };
  // One seat per viewport, measured on the full catalogue, so Earth rests in the same place in
  // every chapter whichever destinations that scenario publishes.
  const reach = Math.min(
    ...compose(['Earth', ...Object.keys(locations)], 0).map(
      (place) => place.y - targetSize(place) / 2,
    ),
  );
  const seat = headerHeight + HEADER_CLEARANCE - reach;
  // Wide layouts keep their airier margin, which already clears the header.
  return compose(destinations, phone ? seat : Math.max(airy, seat));
}
export function screenToScene(x: number, y: number, height: number, width: number, z = 0) {
  const perPixel = (2 * Math.tan((43 * Math.PI) / 360) * (11 - z)) / height;
  return { x: (x - width / 2) * perPixel, y: (height / 2 - y) * perPixel, z, perPixel };
}
