import paths from './activity-paths.generated.json';
import type { WorldArt } from './worlds';
import type { Vector3 } from 'three';
import { lifePlans } from './life-plan';

/** Keep background props outside the same prepared land and water corridors used by the moving actors. */
export function roadClearance(art: WorldArt, mobile: boolean) {
  const corridors = lifePlans[art.form]
    .filter((job) => job.route === 'road' || job.route === 'water')
    .map((job) => {
      const key = [art.id, mobile ? 'mobile' : 'desktop', job.subject.type, job.subject.kind].join(
        ':',
      );
      return (paths as Record<string, { points: number[][]; width?: number }>)[key];
    });
  const airfields = lifePlans[art.form]
    .filter((job) => job.route === 'flight')
    .flatMap((job) => {
      const key = [art.id, mobile ? 'mobile' : 'desktop', job.subject.type, job.subject.kind].join(
        ':',
      );
      const route = (paths as Record<string, { stops: { positions: number[] } | null }>)[key];
      const vertices = route?.stops?.positions ?? [];
      return Array.from({ length: vertices.length / 3 }, (_, i) =>
        vertices.slice(i * 3, i * 3 + 3),
      );
    });
  const piers = lifePlans[art.form]
    .filter((job) => job.route === 'water')
    .flatMap((job) => {
      const key = [art.id, mobile ? 'mobile' : 'desktop', job.subject.type, job.subject.kind].join(
        ':',
      );
      const route = (paths as Record<string, { stops: { positions: number[] } | null }>)[key];
      const vertices = route?.stops?.positions ?? [];
      return Array.from({ length: vertices.length / 3 }, (_, i) =>
        vertices.slice(i * 3, i * 3 + 3),
      );
    });
  return (position: Vector3, radius = 0.1) =>
    piers.every(
      (p) => Math.hypot(position.x - p[0], position.y - p[1], position.z - p[2]) > 0.035 + radius,
    ) &&
    airfields.every(
      (p) => Math.hypot(position.x - p[0], position.y - p[1], position.z - p[2]) > 0.035 + radius,
    ) &&
    corridors.every(
      (route) =>
        !route ||
        route.points.every(
          (p, i) =>
            i % 3 !== 0 ||
            Math.hypot(position.x - p[0], position.y - p[1], position.z - p[2]) >
              (route.width ?? 0.07) + radius,
        ),
    );
}
