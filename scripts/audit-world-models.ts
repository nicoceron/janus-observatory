import { writeFile, mkdir } from 'node:fs/promises';
import { buildWorldGeometry } from '../apps/web/app/voyage/WorldStructures';
import { landmarkGeometry, landmarkSites } from '../apps/web/app/voyage/WorldLandmarks';
import { lifeRoute } from '../apps/web/app/voyage/life-routes';
import { lifePlans, globeRadius } from '../apps/web/app/voyage/life-plan';
import {
  buildCompanionGeometry,
  buildSystemFeatureGeometry,
} from '../apps/web/app/voyage/SystemGeometry';
import { allScenarioProfiles } from '../apps/web/lib/canonical-core';
import { systemPortrait } from '../apps/web/lib/system-portrait';
import { presentEarth } from '../apps/web/app/voyage/Planet';
import { worlds } from '../apps/web/app/voyage/worlds';
const rows = [];
for (const art of [presentEarth, ...worlds]) {
  const scale = globeRadius(art),
    g = buildWorldGeometry(art, scale, false),
    staticTriangles = g.attributes.position.count / 3;
  g.dispose();
  const landmarks = landmarkSites(art, scale, false).map((o) => {
    const g = landmarkGeometry(o.kind, o.variant);
    const count = g.attributes.position.count / 3;
    g.dispose();
    return { kind: o.kind, triangles: count };
  });
  const plan = lifePlans[art.form];
  const routes = [];
  for (const job of plan) {
    const r = lifeRoute(art, scale, false, job);
    routes.push({
      kind: job.subject.kind,
      from: job.from.label,
      to: job.to.label,
      length: r.length,
    });
    r.road?.dispose();
    r.stops?.dispose();
  }
  const index = worlds.indexOf(art),
    system =
      index < 0 ? { bodies: [], features: [] } : systemPortrait(allScenarioProfiles[index]).art;
  const companions = [
    ...system.bodies.map((b) => ({ id: b.body, g: buildCompanionGeometry(art, b, false) })),
    ...system.features.map((f) => ({ id: f, g: buildSystemFeatureGeometry(art, f) })),
  ].map(({ id, g }) => {
    const r = { id, triangles: g.attributes.position.count / 3, radius: g.boundingSphere?.radius };
    g.dispose();
    return r;
  });
  rows.push({ id: art.id, staticTriangles, landmarks, routes, companions });
}
const output = process.argv[2] ?? 'docs/qa/purposeful-worlds';
await mkdir(output, { recursive: true });
await writeFile(output + '/geometry-audit.json', JSON.stringify(rows, null, 2) + '\n');
console.log(
  JSON.stringify(
    rows.map((r) => ({
      id: r.id,
      static: r.staticTriangles,
      focal: r.landmarks.reduce((s, l) => s + l.triangles, 0),
      largestCompanion: Math.max(0, ...r.companions.map((c) => c.triangles)),
      routes: r.routes,
    })),
    null,
    2,
  ),
);
