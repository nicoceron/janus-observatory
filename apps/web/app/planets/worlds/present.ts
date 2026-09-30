import type { EarthBrief } from '../earth';
import { lightShare, satelliteCount } from '../encoding';
import { local } from '../kit';
import { onOrbit, orbitMatrix, satellite } from '../model';

/** Today's cities: real places, drawn as illustrative clusters rather than measured footprints. */
const cities: [number, number][] = [
  [35.7, 139.7],
  [28.6, 77.2],
  [31.2, 121.5],
  [-23.5, -46.6],
  [19.4, -99.1],
  [30, 31.2],
  [19, 72.8],
  [39.9, 116.4],
  [23.8, 90.4],
  [40.7, -74],
  [24.9, 67],
  [-34.6, -58.4],
  [41, 29],
  [6.5, 3.4],
  [14.6, 121],
  [34, -118.2],
  [55.8, 37.6],
  [48.9, 2.35],
  [51.5, -0.1],
  [-6.2, 106.8],
  [37.6, 127],
  [-26.2, 28],
  [41.9, -87.6],
  [-12, -77],
  [13.8, 100.5],
  [35.7, 51.4],
  [-4.3, 15.3],
  [-33.9, 151.2],
];

export const present: EarthBrief = {
  id: 'present',
  seed: 11,
  facing: 12,
  tilt: 0.36,
  relief: 0.055,
  climate: { sea: 0, iceLat: 71, aridity: 0, greenery: 0 },
  palette: {
    deep: '#1a4f86',
    ocean: '#2468a8',
    shallows: '#3a97c4',
    shore: '#d8c796',
    lowland: '#78a94f',
    forest: '#3f7a3c',
    jungle: '#2f6e37',
    upland: '#9aa162',
    mountain: '#8b7f6d',
    peak: '#f3f4f2',
    desert: '#d9b26a',
    tundra: '#98a283',
    ice: '#eef4f8',
    seaice: '#d5e6ef',
  },
  clouds: { count: 30, tone: '#ffffff', speed: 0.012 },
  forest: { count: 150, tones: { forest: '#3a7437', jungle: '#2c6a33', upland: '#5f7d45' } },
  atmosphere: () => ({
    rim: '#8cc8ff',
    rimStrength: 1,
    haze: '#ffffff',
    hazeOpacity: 0,
    height: 1.05,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const lit = lightShare(earth.artificial_illumination);
    for (const [lat, lon] of cities) {
      const centre = world.around(world.faceAt(lat, lon), 5).find((face) => face.land);
      if (!centre) continue;
      for (const face of [centre, ...centre.neighbours.map((n) => world.faces[n])]) {
        if (!face.land || face.used) continue;
        face.used = true;
        face.tone = '#a9a79f';
        const blocks = face === centre ? 5 : 2;
        for (let i = 0; i < blocks; i++) {
          const m = world.within(face, world.random() * 6);
          const h = face.size * world.random.range(0.12, face === centre ? 0.55 : 0.25);
          world.ground.solid.box(m, face.size * 0.14, h, face.size * 0.14, '#cfccc4', '#8f8d88');
          if (world.random() < lit)
            world.ground.glow.box(
              local(m, 0, h, 0),
              face.size * 0.06,
              face.size * 0.02,
              face.size * 0.06,
              '#ffd88a',
            );
        }
      }
    }
    const orbit = world.layer('satellites', 'orbit', {
      matrix: orbitMatrix(0.9, 0.4),
      motion: { kind: 'spin', speed: 0.05 },
    });
    const count = satelliteCount(earth.satellite_belt);
    for (let i = 0; i < count; i++)
      satellite(
        orbit,
        onOrbit(1.16 + (i % 3) * 0.03, (i / count) * Math.PI * 2, (i % 2) * 0.04),
        0.012,
        '#d6d9de',
        '#2f5d9a',
      );
  },
};
