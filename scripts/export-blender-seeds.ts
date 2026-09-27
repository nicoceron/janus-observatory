import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { worlds } from '../apps/web/app/voyage/worlds';
import { presentEarth } from '../apps/web/app/voyage/origin-world';
import { terrainGeometry } from '../apps/web/app/voyage/terrain';
import { buildWorldGeometry } from '../apps/web/app/voyage/WorldStructures';
import { landmarkSites, landmarkGeometry } from '../apps/web/app/voyage/WorldLandmarks';
import { lifePlans, globeRadius } from '../apps/web/app/voyage/life-plan';
import { lifeResources } from '../apps/web/app/voyage/LifeActor';
import { lifeRoute } from '../apps/web/app/voyage/life-routes';
import { activityMotion } from '../apps/web/app/voyage/activity-motion';
import { cloudGeometry } from '../apps/web/app/voyage/WorldClouds';
import { cloudPose } from '../apps/web/app/voyage/cloud-motion';
import { objectFamilies } from '../apps/web/app/voyage/ScenarioBiomes';
import { mechanismGeometry, mechanismPosition } from '../apps/web/app/voyage/Mechanisms';
import { allScenarioProfiles } from '../apps/web/lib/canonical-core';
import { systemPortrait } from '../apps/web/lib/system-portrait';

// Original art exchange, not canonical scientific generation. The seed retains the accepted
// terrain and motion pivots while native Blender construction supplies the final modeled detail.
function geometry(g: THREE.BufferGeometry) {
  const mesh = g.index ? g.toNonIndexed() : g;
  const pack = (name: string) =>
    Array.from(mesh.getAttribute(name)?.array ?? [], (n) => Math.round(Number(n) * 1e6) / 1e6);
  const result = { positions: pack('position'), colors: pack('color') };
  if (mesh !== g) mesh.dispose();
  g.dispose();
  return result;
}
await mkdir('assets/blender/seeds', { recursive: true });
const receipts = [];
for (const [worldIndex, art] of [presentEarth, ...worlds].entries()) {
  const id = art.form === 'origin' ? 'origin' : art.id.toLowerCase();
  const radius = globeRadius(art);
  const shared: Record<string, ReturnType<typeof geometry>> = {};
  for (const job of lifePlans[art.form]) {
    const resource = lifeResources(job.subject);
    const key = `Life_${job.subject.type}_${job.subject.kind}`;
    shared[key + '_body'] = geometry(resource.body);
    resource.extra.forEach((g, i) => (shared[key + '_extra' + i] = geometry(g)));
    resource.material.dispose();
  }
  for (let i = 0; i < Math.min(art.cloud, 5); i++)
    shared['Cloud_' + i] = geometry(cloudGeometry(i));
  const tiers = [false, true].map((mobile) => {
    const sites = landmarkSites(art, radius, mobile);
    const parts: Record<string, ReturnType<typeof geometry>> = {
      Terrain: geometry(terrainGeometry(art, mobile).scale(radius, radius, radius)),
      Structures: geometry(buildWorldGeometry(art, radius, mobile)),
    };
    // A mobile terrain tier can omit a placement; the semantic library still
    // contains every selectable focal object and its articulated mechanism.
    for (const [variant, kind] of (art.form === 'origin'
      ? []
      : objectFamilies[art.form]
    ).entries()) {
      parts['Landmark_' + kind] = geometry(landmarkGeometry(kind, variant, false));
      if (kind === 'windmill' || kind === 'watermill')
        parts['Mechanism_' + kind] = geometry(mechanismGeometry(kind));
    }
    const jobs = lifePlans[art.form].map((job) => {
      const route = lifeRoute(art, radius, mobile, job);
      const road = route.road ? geometry(route.road) : null;
      const stops = route.stops ? geometry(route.stops) : null;
      if (road) parts[`Activity_${job.subject.kind}_road`] = road;
      if (stops) parts[`Activity_${job.subject.kind}_stops`] = stops;
      return {
        ...job,
        radius,
        points: route.points.map((p) => p.toArray()),
        rotations: route.rotations.map((q) => q.toArray()),
        length: route.length,
        initial: activityMotion(job, job.travel * 0.38),
        previewMotion: Array.from({ length: 121 }, (_, index) => ({
          frame: 1 + index * 8,
          ...activityMotion(job, job.travel * 0.38 + index / 3),
        })),
        road,
        stops,
      };
    });
    return {
      mobile,
      parts,
      sites: sites.map((site) => ({
        kind: site.kind,
        matrix: site.matrix.toArray(),
        mechanismPosition:
          site.kind === 'windmill' || site.kind === 'watermill'
            ? mechanismPosition(site.kind)
            : null,
      })),
      jobs,
    };
  });
  const system = worldIndex ? systemPortrait(allScenarioProfiles[worldIndex - 1]) : null;
  const output = JSON.stringify({
    version: 1,
    coordinates: 'Three.js Y-up; Blender import maps (x,y,z) to (x,-z,y)',
    id,
    art,
    system,
    shared,
    clouds: Array.from({ length: Math.min(art.cloud, 5) }, (_, i) =>
      Array.from({ length: 41 }, (_, frame) => ({
        frame: 1 + frame * 24,
        ...cloudPose(i, frame, radius),
      })),
    ),
    tiers,
  });
  const path = `assets/blender/seeds/${id}.json`;
  await writeFile(path, output + '\n');
  receipts.push({
    id,
    path,
    bytes: Buffer.byteLength(output) + 1,
    checksum: createHash('sha256')
      .update(output + '\n')
      .digest('hex'),
  });
  console.log(id, receipts.at(-1)?.bytes, 'bytes');
}
await writeFile('docs/qa/blender-finish/seeds.json', JSON.stringify(receipts, null, 2) + '\n');
