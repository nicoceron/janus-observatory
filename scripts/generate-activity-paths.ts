import { readFile, writeFile } from 'node:fs/promises';
import {
  planLifeRoute,
  waterTurningRadius,
  type WaterReservation,
} from '../apps/web/app/voyage/plan-life-route';
import { presentEarth } from '../apps/web/app/voyage/origin-world';
import { worlds } from '../apps/web/app/voyage/worlds';
import { globeRadius, lifePlans } from '../apps/web/app/voyage/life-plan';
import type { BufferGeometry } from 'three';
const paths: Record<string, unknown> = {};
// Indexed positions and a small color palette keep repeated road triangles out of the download.
const geometry = (g: BufferGeometry | null) => {
  if (!g) return null;
  const positions: number[] = [],
    colorIds: number[] = [],
    indices: number[] = [],
    palette: number[][] = [];
  const vertices = new Map<string, number>(),
    colors = new Map<string, number>();
  for (let i = 0; i < g.attributes.position.count; i++) {
    const p = Array.from(g.attributes.position.array.slice(i * 3, i * 3 + 3), (n) => +n.toFixed(6));
    const color = Array.from(
      g.attributes.color.array.slice(i * 3, i * 3 + 3),
      (n) => +n.toFixed(4),
    );
    const colorKey = color.join(',');
    let colorId = colors.get(colorKey);
    if (colorId === undefined) {
      colorId = palette.length;
      palette.push(color);
      colors.set(colorKey, colorId);
    }
    const key = p.join(',') + ':' + colorId;
    let vertex = vertices.get(key);
    if (vertex === undefined) {
      vertex = positions.length / 3;
      positions.push(...p);
      colorIds.push(colorId);
      vertices.set(key, vertex);
    }
    indices.push(vertex);
  }
  return { positions, colorIds, indices, palette };
};
for (const art of [presentEarth, ...worlds])
  for (const mobile of [false, true]) {
    const waterReservations: WaterReservation[] = [];
    for (const job of lifePlans[art.form]) {
      const r = planLifeRoute(art, globeRadius(art), mobile, job, waterReservations);
      if (job.route === 'water') {
        waterReservations.push({
          directions: r.points.map((p) => p.clone().normalize()),
          radius: waterTurningRadius(job),
        });
        if (r.stops) {
          const position = r.stops.getAttribute('position');
          waterReservations.push({
            directions: Array.from({ length: position.count }, (_, i) =>
              r.points[0].clone().fromBufferAttribute(position, i).normalize(),
            ),
            radius: 0.02,
          });
        }
      }
      const key = [art.id, mobile ? 'mobile' : 'desktop', job.subject.type, job.subject.kind].join(
        ':',
      );
      paths[key] = {
        points: r.points.map((p) => p.toArray().map((n) => +n.toFixed(6))),
        rotations: r.rotations.map((q) => q.toArray().map((n) => +n.toFixed(7))),
        map: r.map.map((p) => p.map((n) => +n.toFixed(6))),
        road: geometry(r.road),
        stops: geometry(r.stops),
        length: r.length,
        width: job.route === 'water' ? waterTurningRadius(job) : r.width,
      };
      r.road?.dispose();
      r.stops?.dispose();
    }
  }
const output = 'apps/web/app/voyage/activity-paths.generated.json',
  content = JSON.stringify(paths) + '\n';
if (process.argv.includes('--check')) {
  if ((await readFile(output, 'utf8')) !== content)
    throw new Error('Original-art path generation is not reproducible');
} else await writeFile(output, content);
console.log(
  'Generated ' +
    Object.keys(paths).length +
    ' original-art routes. Terrain planning stays outside the browser render loop.',
);
