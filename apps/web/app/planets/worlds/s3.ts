import * as THREE from 'three';
import { claim, type EarthBrief } from '../earth';
import { coveredFaces, decades, hazeStrength, lightShare, satelliteCount } from '../encoding';
import { frame, local } from '../kit';
import type { LayerBuilder } from '../model';
import { orderedSwarm } from '../orbits';
import { tree, turbine } from '../parts';

/**
 * S3 · Golden Age. "A post-scarcity economy with abundant vital resources. Power is
 * decentralized, Earth remains civilization's hub, and small settlements reach the Moon, Mars,
 * and outer Solar System."
 */
export function gardenTown(
  layer: LayerBuilder,
  m: THREE.Matrix4,
  s: number,
  lit: number,
  random: () => number,
  civic = false,
) {
  layer.solid.prism(m, 0.55 * s, 0.55 * s, 0.02 * s, 10, '#b9d98e', '#a7cf7c');
  const homes = civic ? 9 : 6;
  for (let i = 0; i < homes; i++) {
    const a = (i / homes) * Math.PI * 2 + random() * 0.3;
    const r = (0.28 + random() * 0.14) * s;
    const home = local(m, Math.cos(a) * r, 0.02 * s, Math.sin(a) * r, -a);
    const w = (0.12 + random() * 0.05) * s;
    layer.solid.box(home, w, 0.09 * s, w * 0.8, '#f4efe2', '#6fbf61');
    if (random() < lit)
      layer.glow.box(local(home, 0, 0.04 * s, w * 0.41), w * 0.5, 0.03 * s, 0.002 * s, '#ffe6a8');
  }
  layer.sheen.dome(local(m, 0, 0.02 * s, 0), 0.17 * s, '#bfe9f2', 8, 2);
  layer.solid.prism(
    local(m, 0.12 * s, 0.02 * s, -0.12 * s),
    0.03 * s,
    0.02 * s,
    (civic ? 0.6 : 0.36) * s,
    6,
    '#e3b84b',
  );
  layer.solid.prism(
    local(m, 0.12 * s, (civic ? 0.62 : 0.38) * s, -0.12 * s),
    0.02 * s,
    0,
    0.1 * s,
    6,
    '#e3b84b',
  );
  for (let i = 0; i < 3; i++)
    tree(
      layer.solid,
      local(m, (random() - 0.5) * 0.5 * s, 0.02 * s, (random() - 0.5) * 0.5 * s),
      'round',
      '#3f9a4d',
      0.14 * s,
    );
}

export function tetherHub(layer: LayerBuilder, m: THREE.Matrix4, s: number) {
  layer.sheen.torus(m, 0.4 * s, 0.05 * s, '#f1efe7', 20, 4);
  layer.sheen.prism(local(m, 0, -0.12 * s, 0), 0.1 * s, 0.1 * s, 0.24 * s, 8, '#e3b84b');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    layer.sheen.beam(
      new THREE.Vector3().applyMatrix4(m),
      new THREE.Vector3(Math.cos(a) * 0.4 * s, 0, Math.sin(a) * 0.4 * s).applyMatrix4(m),
      0.012 * s,
      '#d8d4c8',
    );
    layer.glow.box(
      local(m, Math.cos(a) * 0.4 * s, 0.05 * s, Math.sin(a) * 0.4 * s),
      0.04 * s,
      0.02 * s,
      0.04 * s,
      '#fff0c0',
    );
  }
  layer.sheen.panel(local(m, 0, 0.14 * s, 0), 0.9 * s, 0.14 * s, '#3b6fb6', '#e3b84b');
}

export const s3: EarthBrief = {
  id: 'S3',
  seed: 303,
  facing: -50,
  tilt: 0.3,
  pitch: 0.12,
  relief: 0.055,
  climate: { sea: 0, iceLat: 70, aridity: -0.15, greenery: 0.2 },
  palette: {
    deep: '#155f8f',
    ocean: '#1f7fb0',
    shallows: '#46b7c8',
    shore: '#ecdcae',
    lowland: '#86c35f',
    forest: '#3f9a4d',
    jungle: '#2f8a45',
    upland: '#b4cf78',
    mountain: '#a99f8b',
    peak: '#fbfbf7',
    desert: '#e3cc8e',
    tundra: '#a9b98d',
    ice: '#f4f8fb',
    seaice: '#dcebf2',
  },
  clouds: { count: 34, tone: '#ffffff', speed: 0.014 },
  forest: {
    count: 190,
    tones: { forest: '#3a944a', jungle: '#2c8642', upland: '#6ca656', lowland: '#58a84f' },
  },
  atmosphere: (signals) => ({
    rim: '#8fd0ff',
    rimStrength: 1.05,
    haze: '#dfe9d6',
    hazeOpacity:
      hazeStrength(
        signals.bodies.Earth.industrial_pollution,
        signals.bodies.Earth.contaminated_aerosol,
      ) * 0.12,
    height: 1.035,
  }),
  decorate(world, signals) {
    const earth = signals.bodies.Earth;
    const { faces, random } = world;
    const lit = lightShare(earth.artificial_illumination);
    const land = faces.filter((f) => f.land && !['ice', 'peak', 'mountain'].includes(f.biome));

    // Decentralized: every town is the same size and towns keep an even spacing everywhere.
    const towns = world.scatter(land, coveredFaces(earth.surface_modification, faces.length), 9);
    const hub = world.faceAt(0, 8);
    towns.forEach((face, i) => {
      face.used = true;
      face.tone = '#cfe3a6';
      const layer =
        i === 0 ? world.layer('garden-town', 'surface', { landmark: 'garden-town' }) : world.ground;
      gardenTown(layer, world.on(face, random() * 6), i === 0 ? 0.12 : 0.085, lit, random, i === 0);
    });

    const plots = Math.round(land.length * decades(earth.agricultural_pollution, 0.1, 100) * 0.3);
    for (const face of claim(faces, plots, (f) =>
      f.land && ['lowland', 'upland'].includes(f.biome) ? random() : null,
    )) {
      face.used = true;
      face.tone = random() < 0.5 ? '#c7d77a' : '#a6c86a';
    }

    const windy = land.filter((f) => ['upland', 'shore', 'tundra'].includes(f.biome));
    const commons = world.scatter(windy, Math.round(26 * world.quality.density), 8);
    commons.forEach((face, i) => {
      face.used = true;
      const layer =
        i === 0
          ? world.layer('wind-commons', 'surface', { landmark: 'wind-commons' })
          : world.ground;
      const count = i === 0 ? 5 : 3;
      for (let k = 0; k < count; k++)
        turbine(
          layer.solid,
          world
            .on(face, 0.3)
            .multiply(
              new THREE.Matrix4().makeTranslation(
                (k - (count - 1) / 2) * 0.022,
                0,
                (k % 2) * 0.016,
              ),
            ),
          0.05,
        );
    });

    // One tether from the equator to a transfer hub: Earth stays the hub.
    hub.used = true;
    const tether = world.layer('tether', 'surface', { landmark: 'tether' });
    const top = hub.up.clone().multiplyScalar(1.5);
    tether.sheen.prism(world.on(hub), 0.05, 0.035, 0.03, 8, '#e3b84b');
    tether.sheen.beam(hub.centre, top, 0.004, '#f2d27a', 6);
    tetherHub(tether, frame(top, hub.up), 0.16);

    orderedSwarm(
      world,
      satelliteCount(earth.satellite_belt),
      [
        { inclination: 0, node: 0, speed: 0.04, radius: 1.2 },
        { inclination: 1.1, node: 0.8, speed: -0.03, radius: 1.26 },
        { inclination: -1.1, node: 2.2, speed: 0.03, radius: 1.32 },
      ],
      { size: 0.009, body: '#f1ede2', wings: '#c89b2e' },
    );
  },
};
