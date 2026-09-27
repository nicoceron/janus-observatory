import * as THREE from 'three';
import { Ground, type MapPoint } from './planet-surface';
import { Sculpture } from './sculpture';
import { landmarkSites, landmarkGeometry } from './WorldLandmarks';
import { lifeGeometry } from './life-geometry';
import type { WorldArt } from './worlds';
import type { LifePlan } from './life-plan';
import { refineRoad, finishRoad } from './route-finishing';
import { addAirfield } from './Airfield';
export type LifeRoute = {
  points: THREE.Vector3[];
  rotations: THREE.Quaternion[];
  map: MapPoint[];
  road: THREE.BufferGeometry | null;
  stops: THREE.BufferGeometry | null;
  length: number;
  width: number;
};
export type WaterReservation = { directions: THREE.Vector3[]; radius: number };
/** Includes bowsprits, paddles and the complete turning hull, plus room for the small roll animation. */
export function waterTurningRadius(job: LifePlan) {
  const geometry = lifeGeometry(job.subject);
  const vertices = geometry.getAttribute('position');
  let radius = 0;
  for (let i = 0; i < vertices.count; i++)
    radius = Math.max(
      radius,
      Math.hypot(vertices.getX(i), vertices.getZ(i)) + Math.abs(vertices.getY(i)) * 0.03,
    );
  geometry.dispose();
  return radius * job.size + 0.025;
}
function coordinates(p: THREE.Vector3): MapPoint {
  const n = p.clone().normalize();
  return [THREE.MathUtils.radToDeg(Math.atan2(n.x, n.z)), THREE.MathUtils.radToDeg(Math.asin(n.y))];
}
/** Ground and water connections retain their working stops; airborne motion circles the globe. */
export function planLifeRoute(
  art: WorldArt,
  scale: number,
  mobile: boolean,
  job: LifePlan,
  waterReservations: WaterReservation[] = [],
): LifeRoute {
  const g = new Ground(art, scale, mobile, art.form === 'engineered' ? 'shell' : 'terrain');
  try {
    const water = job.route === 'water',
      airborne = job.route === 'flight' || job.route === 'hover';
    const turningRadius = water ? waterTurningRadius(job) : 0;
    const vehicle = job.route === 'road' ? lifeGeometry(job.subject) : null;
    vehicle?.computeBoundingBox();
    const width = vehicle
      ? vehicle.boundingBox!.getSize(new THREE.Vector3()).x * job.size * 0.64
      : 0;
    vehicle?.dispose();
    const landmarks = landmarkSites(art, scale, mobile).map((o) => {
      const geometry = landmarkGeometry(o.kind, o.variant);
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!.clone();
      geometry.dispose();
      return {
        ...o,
        position: new THREE.Vector3().setFromMatrixPosition(o.matrix),
        inverse: o.matrix.clone().invert(),
        box,
        footprint:
          Math.hypot(
            Math.max(Math.abs(box.min.x), Math.abs(box.max.x)),
            Math.max(Math.abs(box.min.z), Math.abs(box.max.z)),
          ) * o.matrix.getMaxScaleOnAxis(),
      };
    });
    const destinations = [job.from, job.to].map((stop) => {
      const landmark = landmarks.find((l) => l.kind === stop.landmark);
      if (landmark && stop.access)
        return new THREE.Vector3(stop.access[0], 0, stop.access[1])
          .applyMatrix4(landmark.matrix)
          .normalize();
      return landmark?.position.clone().normalize() ?? g.direction(...stop.at);
    });
    const valid = (n: THREE.Vector3, clearance = true) => {
      if (
        water &&
        waterReservations.some((reserved) =>
          reserved.directions.some(
            (p) => p.distanceTo(n) < reserved.radius + turningRadius + 0.035,
          ),
        )
      )
        return false;
      const p = g.project(n, 0),
        h = p.length();
      const supported =
        art.form === 'engineered'
          ? !water
          : water
            ? h < scale * 0.98
            : h > scale * (art.form === 'fractured' ? 0.87 : 0.99);
      let hullClear = true;
      if (water && supported) {
        const east = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0)).normalize();
        const north = new THREE.Vector3().crossVectors(east, n).normalize();
        const hullRadius = turningRadius + 0.012;
        for (let j = 0; j < 32; j++) {
          const a = (j * Math.PI) / 16;
          const edge = n
            .clone()
            .addScaledVector(east, Math.cos(a) * hullRadius)
            .addScaledVector(north, Math.sin(a) * hullRadius)
            .normalize();
          if (g.project(edge, 0).length() >= scale * 0.983) hullClear = false;
        }
      }
      return (
        supported &&
        hullClear &&
        (!clearance ||
          water ||
          landmarks.every((l) => {
            if (job.route === 'flight')
              return l.position.distanceTo(p) > l.footprint + scale * 0.34;
            if (job.route !== 'road') return l.position.distanceTo(p) > scale * 0.16;
            const local = p.clone().applyMatrix4(l.inverse),
              margin = 0.025;
            return (
              local.y < -0.13 ||
              local.x < l.box.min.x - margin ||
              local.x > l.box.max.x + margin ||
              local.z < l.box.min.z - margin ||
              local.z > l.box.max.z + margin
            );
          }))
      );
    };
    const connectionSafe = (a: THREE.Vector3, b: THREE.Vector3) => {
      const across = new THREE.Vector3().crossVectors(a, b).normalize();
      const steps = Math.max(8, Math.ceil(a.angleTo(b) * 80));
      let previous: number | undefined;
      for (let i = 0; i <= steps; i++) {
        const n = a
            .clone()
            .lerp(b, i / steps)
            .normalize(),
          height = g.project(n, 0).length();
        if (!valid(n) || (previous !== undefined && Math.abs(height - previous) >= 0.027))
          return false;
        if (
          width &&
          [-1, 1].some(
            (side) =>
              !valid(
                n
                  .clone()
                  .addScaledVector(across, width * side)
                  .normalize(),
              ),
          )
        )
          return false;
        previous = height;
      }
      return true;
    };
    // A bounded navigation graph is built once. Edge checks prevent the route crossing water or a cliff.
    const cols = 31,
      rows = 19,
      nodes = Array.from({ length: cols * rows }, (_, i) => {
        const map: MapPoint = [-90 + (i % cols) * 6, -54 + Math.floor(i / cols) * 6],
          n = g.direction(...map);
        const footprint =
          job.route !== 'flight' ||
          Array.from({ length: 8 }, (_, j) => {
            const angle = (j * Math.PI) / 4;
            return (
              g
                .project(
                  g.direction(map[0] + Math.cos(angle) * 16, map[1] + Math.sin(angle) * 16),
                  0,
                )
                .length() >
              scale * 0.994
            );
          }).every(Boolean);
        return { map, n, p: g.project(n, 0), valid: valid(n) && footprint };
      });
    const nearest = (target: THREE.Vector3, omit = -1) =>
      nodes.reduce(
        (best, node, i) =>
          node.valid &&
          // Berths belong beside a shore, never as little platforms in the middle of an ocean.
          (!water ||
            nodes.some(
              (shore) => shore.p.length() > scale * 1.002 && shore.n.distanceTo(node.n) < 0.4,
            )) &&
          i !== omit &&
          (best === -1 ||
            node.n.distanceToSquared(target) < nodes[best].n.distanceToSquared(target)) &&
          (job.route !== 'road' || connectionSafe(target, node.n))
            ? i
            : best,
        -1,
      );
    const start = nearest(destinations[0]);
    let end = nearest(destinations[1], start);
    if (start < 0 || end < 0)
      throw new Error(
        'No activity destination for ' +
          art.id +
          ' ' +
          job.subject.kind +
          ' (start ' +
          start +
          ', end ' +
          end +
          ')',
      );
    let map: MapPoint[];
    if (airborne) {
      // Climb and descent share actual surface airfields; a hovering inspection stays aloft at its stops.
      if (job.route === 'hover') map = destinations.map(coordinates);
      else map = [nodes[start].map, nodes[end].map];
    } else {
      const costs = new Float64Array(nodes.length).fill(Infinity),
        parent = new Int32Array(nodes.length).fill(-1),
        visited = new Uint8Array(nodes.length);
      costs[start] = 0;
      const edgeCache = new Map<string, boolean>();
      for (let iteration = 0; iteration < nodes.length; iteration++) {
        let current = -1;
        for (let i = 0; i < nodes.length; i++)
          if (
            !visited[i] &&
            Number.isFinite(costs[i]) &&
            (current < 0 || costs[i] < costs[current])
          )
            current = i;
        if (current < 0) break;
        visited[current] = 1;
        const x = current % cols,
          y = Math.floor(current / cols);
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ]) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          const next = ny * cols + nx;
          if (visited[next] || !nodes[next].valid) continue;
          const a = nodes[current],
            b = nodes[next],
            key = [Math.min(current, next), Math.max(current, next)].join(':');
          let safe = edgeCache.get(key);
          if (safe === undefined) {
            const probes = Array.from({ length: 9 }, (_, i) =>
              a.n
                .clone()
                .lerp(b.n, i / 8)
                .normalize(),
            );
            const heights = probes.map((n) => g.project(n, 0).length());
            safe =
              (water || Math.abs(a.p.length() - b.p.length()) < 0.07) &&
              probes.every((n) => valid(n)) &&
              heights.every((h, i) => !i || Math.abs(h - heights[i - 1]) < 0.027);
            if (safe && width) safe = connectionSafe(a.n, b.n);
            edgeCache.set(key, safe);
          }
          if (!safe) continue;
          const cost =
            costs[current] + a.p.distanceTo(b.p) + Math.abs(a.p.length() - b.p.length()) * 2;
          if (cost < costs[next]) {
            costs[next] = cost;
            parent[next] = current;
          }
        }
      }
      // Choose the nearest reachable approach to the named destination, rather than dropping activity silently.
      if (!Number.isFinite(costs[end])) {
        if (job.route === 'road')
          throw new Error('Road cannot reach its actual entrance: ' + art.id + ' ' + job.to.label);
        end = nodes.reduce(
          (best, node, i) =>
            i !== start &&
            Number.isFinite(costs[i]) &&
            (best < 0 ||
              node.n.distanceToSquared(destinations[1]) <
                nodes[best].n.distanceToSquared(destinations[1]))
              ? i
              : best,
          -1,
        );
      }
      if (end < 0)
        throw new Error('Disconnected activity route for ' + art.id + ' ' + job.subject.kind);
      const route: number[] = [];
      for (let i = end; i !== -1; i = parent[i]) route.unshift(i);
      map = route.map((i) => nodes[i].map);
      if (job.route === 'road')
        map = [coordinates(destinations[0]), ...map, coordinates(destinations[1])];
    }
    let directions = map.map((p) => g.direction(...p));
    if (job.route === 'road') directions = refineRoad(directions, connectionSafe);
    let curve: THREE.Curve<THREE.Vector3>;
    if (airborne) {
      const midpoint = directions[0].clone().lerp(directions.at(-1)!, 0.5).normalize();
      midpoint.y += 0.1;
      midpoint.normalize();
      curve = new THREE.CatmullRomCurve3(
        [directions[0], midpoint, directions.at(-1)!],
        false,
        'centripetal',
      );
    } else {
      const smooth = new THREE.CatmullRomCurve3(directions, false, 'centripetal');
      const samples = Array.from({ length: 193 }, (_, i) => smooth.getPointAt(i / 192).normalize());
      const heights = samples.map((n) => g.project(n, 0).length());
      if (
        samples.every((n, i) => valid(n) && (!width || !i || connectionSafe(samples[i - 1], n))) &&
        heights.every((h, i) => !i || Math.abs(h - heights[i - 1]) < 0.027)
      )
        curve = smooth;
      else {
        const path = new THREE.CurvePath<THREE.Vector3>();
        for (let i = 1; i < directions.length; i++)
          path.add(new THREE.LineCurve3(directions[i - 1], directions[i]));
        curve = path;
      }
    }
    const endpointHeights = [directions[0], directions.at(-1)!].map((n) =>
      g.project(n, 0).length(),
    );
    // Clear the actual settlement roof envelope before settling into cruise. The quiet
    // opening world stays lower; S3's taller civic structures need a higher approach.
    const cruiseHeight = landmarks.reduce((height, landmark) => {
      const roof = new THREE.Vector3(0, landmark.box.max.y, 0).applyMatrix4(landmark.matrix);
      return Math.max(
        height,
        roof.length() - Math.min(...endpointHeights) + scale * (job.size * 0.17 + 0.12),
      );
    }, scale * 0.22);
    const points = Array.from({ length: 193 }, (_, i) => {
      const u = i / 192,
        n = curve.getPointAt(u).normalize();
      if (airborne) {
        const takeoff = THREE.MathUtils.smoothstep(u, 0.06, 0.27);
        const landing = 1 - THREE.MathUtils.smoothstep(u, 0.73, 0.94);
        const ground = g.project(n, 0).length();
        const runway = THREE.MathUtils.lerp(endpointHeights[0], endpointHeights[1], u);
        return n.multiplyScalar(
          (job.route === 'flight' && (u < 0.08 || u > 0.92) ? ground : Math.max(ground, runway)) +
            (job.route === 'hover'
              ? scale * 0.4
              : scale * (0.013 + job.size * 0.065) + takeoff * landing * cruiseHeight),
        );
      }
      return g.project(n, water ? 0.008 : 0.016);
    });
    const rotations = points.map((p, i) => {
      const up = p.clone().normalize(),
        forward = points[Math.min(i + 1, 192)]
          .clone()
          .sub(points[Math.max(0, i - 1)])
          .negate()
          .normalize();
      const right = new THREE.Vector3().crossVectors(up, forward).normalize();
      if (job.route === 'flight') up.crossVectors(forward, right).normalize();
      else forward.crossVectors(right, up).normalize();
      return new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(right, up, forward),
      );
    });
    let road: THREE.BufferGeometry | null = null,
      stops: THREE.BufferGeometry | null = null;
    if (job.route === 'road') {
      const s = finishRoad(g, art, points, width);
      // The drive ends in a forecourt that reaches the modeled loading face or threshold.
      for (const [stop, index] of [
        [job.from, 0],
        [job.to, 192],
      ] as const) {
        const site = landmarks.find((l) => l.kind === stop.landmark);
        if (!site || !stop.access) continue;
        const access = new THREE.Vector3(stop.access[0] * 0.62, 0, stop.access[1] * 0.62)
          .applyMatrix4(site.matrix)
          .normalize();
        g.trail(
          s,
          [coordinates(points[index]), coordinates(access)],
          width * 1.2,
          art.form === 'ecumenopolis'
            ? '#394b54'
            : art.form === 'reclaimed'
              ? '#ac9870'
              : '#b09b7d',
          0.013,
        );
      }
      road = s.finish();
    }
    if (water || job.route === 'flight') {
      const s = new Sculpture();
      for (const index of [0, 192]) {
        const p = g.project(points[index].clone().normalize(), 0.015);
        if (water) {
          const simple = job.subject.kind === 'canoe';
          const stopDirection = p.clone().normalize();
          const halfWidth = simple ? 0.0175 : 0.029;
          const traffic = [
            ...waterReservations,
            { directions: points.map((point) => point.clone().normalize()), radius: turningRadius },
          ];
          // Choose the shore-facing side using the entire swept route. The previous
          // fixed +X quay could cut across a boat's approach or its 180-degree turn.
          const candidates = nodes
            .filter((node) => node.p.length() > scale * 1.002)
            .sort(
              (a, b) => a.n.distanceToSquared(stopDirection) - b.n.distanceToSquared(stopDirection),
            );
          let approach: THREE.Vector3[] | undefined;
          for (const shore of candidates) {
            const landing = shore.p.clone().addScaledVector(shore.n, 0.025);
            const distance = p.distanceTo(landing);
            if (distance > 0.55 || distance < turningRadius + halfWidth + 0.025) continue;
            const berth = p.clone().lerp(landing, (turningRadius + halfWidth + 0.035) / distance);
            const steps = Math.max(3, Math.ceil(berth.distanceTo(landing) / 0.018));
            const probes = Array.from({ length: steps + 1 }, (_, j) =>
              berth.clone().lerp(landing, j / steps),
            );
            if (
              probes.every((point) =>
                traffic.every((route) =>
                  route.directions.every(
                    (direction) =>
                      direction.distanceTo(point.clone().normalize()) >
                      route.radius + halfWidth + 0.014,
                  ),
                ),
              )
            ) {
              approach = probes;
              break;
            }
          }
          if (!approach)
            throw new Error(
              'No clear shore-connected landing: ' + art.id + ' ' + job.subject.kind + ' ' + index,
            );
          for (let j = 1; j < approach.length; j++) {
            const a = approach[j - 1],
              b = approach[j];
            const center = a.clone().lerp(b, 0.5),
              up = center.clone().normalize();
            const along = b.clone().sub(a).normalize(),
              right = up.clone().cross(along).normalize();
            up.crossVectors(along, right).normalize();
            const deck = new THREE.Matrix4().makeBasis(right, up, along).setPosition(center);
            s.box([halfWidth * 2, 0.012, a.distanceTo(b) + 0.002], '#b69a70', [0, 0, 0], deck);
            if (j === 1 || j % 4 === 0)
              for (const side of [-1, 1]) {
                s.bar(
                  [side * halfWidth * 0.8, -0.09, 0],
                  [side * halfWidth * 0.8, 0.024, 0],
                  0.0035,
                  '#715840',
                  deck,
                );
                if (!simple)
                  s.cylinder(
                    0.004,
                    0.006,
                    0.013,
                    '#65523e',
                    [side * halfWidth * 0.8, 0.03, 0],
                    deck,
                    5,
                  );
              }
          }
        } else {
          addAirfield(s, g, p, rotations[index], scale, art.form === 'origin');
        }
      }
      stops = s.finish();
    }
    // Airfield scenery keeps its authored, supported sites. Flight motion is independent
    // of those sites: one continuous inclined great circle, with no landing or reversal.
    if (airborne) {
      const tilt = THREE.MathUtils.degToRad(
        art.form === 'origin' ? 24 : art.form === 'arcadia' ? -32 : 42,
      );
      const plane = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0.35, 0));
      let orbitRadius = scale * (job.route === 'flight' ? 1.48 : 1.46);
      for (const landmark of landmarks) {
        const roof = new THREE.Vector3(0, landmark.box.max.y, 0).applyMatrix4(landmark.matrix);
        orbitRadius = Math.max(orbitRadius, roof.length() + scale * (job.size * 0.18 + 0.12));
      }
      for (let i = 0; i <= 192; i++) {
        const angle = ((i % 192) * Math.PI * 2) / 192;
        const up = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).applyQuaternion(plane);
        const forward = new THREE.Vector3(-Math.cos(angle), 0, Math.sin(angle)).applyQuaternion(
          plane,
        );
        const right = new THREE.Vector3().crossVectors(up, forward).normalize();
        points[i].copy(up).multiplyScalar(orbitRadius);
        rotations[i].setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward));
      }
    }
    return {
      points,
      rotations,
      map: points.map(coordinates),
      road,
      stops,
      length: points.slice(1).reduce((sum, p, i) => sum + p.distanceTo(points[i]), 0),
      width,
    };
  } finally {
    g.dispose();
  }
}
